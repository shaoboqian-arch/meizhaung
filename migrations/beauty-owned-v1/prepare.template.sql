-- Candidate only. Target identity is checked by the deployment plan before SQL.
-- Run as the current application database owner; never as an application user.
BEGIN;
CREATE SCHEMA beauty_review_private;
REVOKE ALL ON SCHEMA beauty_review_private FROM PUBLIC, anon, authenticated;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA beauty_review_private;
CREATE TABLE beauty_review_private.config (
  singleton boolean PRIMARY KEY CHECK(singleton),
  receipt_secret text NOT NULL CHECK(octet_length(receipt_secret)>=32)
);
CREATE TABLE beauty_review_private.rules (
  singleton boolean PRIMARY KEY CHECK(singleton), data jsonb NOT NULL
);
INSERT INTO beauty_review_private.rules VALUES (true, __RULES__::jsonb);
CREATE TABLE beauty_review_private.versions (
  owner_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('product','profile')),
  entity_id text NOT NULL, version bigint NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991),
  deleted boolean NOT NULL, PRIMARY KEY(owner_id,kind,entity_id)
);
CREATE TABLE beauty_review_private.receipts (
  owner_id text NOT NULL, nonce text NOT NULL, payload_hash bytea NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,nonce)
);
REVOKE ALL ON ALL TABLES IN SCHEMA beauty_review_private FROM PUBLIC, anon, authenticated;

CREATE FUNCTION beauty_review_private.owner_id() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE value text := auth.uid();
BEGIN
  IF value IS NULL OR value !~ '^wx:[A-Za-z0-9_-]{24,32}$' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='OWNED_IDENTITY_REQUIRED';
  END IF;
  RETURN value;
END $body$;

-- One version authority for RPC, administrator, and legacy writes during prepare.
-- Existing records start at version 1 without rewriting their content.
CREATE FUNCTION beauty_review_private.track_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE own text; key text; entity_kind text;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.owner_id IS DISTINCT FROM OLD.owner_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='OWNED_KEY_IMMUTABLE';
  END IF;
  entity_kind := CASE TG_TABLE_NAME WHEN 'user_products' THEN 'product' ELSE 'profile' END;
  IF entity_kind='product' THEN
    IF TG_OP='UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='OWNED_KEY_IMMUTABLE';
    END IF;
  END IF;
  own := CASE WHEN TG_OP='DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
  IF entity_kind='product' THEN
    key := CASE WHEN TG_OP='DELETE' THEN OLD.product_id ELSE NEW.product_id END;
  ELSE key := 'profile'; END IF;
  INSERT INTO beauty_review_private.versions(owner_id,kind,entity_id,version,deleted)
    VALUES(own,entity_kind,key,CASE WHEN TG_OP='INSERT' THEN 1 ELSE 2 END,TG_OP='DELETE')
  ON CONFLICT(owner_id,kind,entity_id) DO UPDATE
    SET version=beauty_review_private.versions.version+1, deleted=EXCLUDED.deleted;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $body$;
CREATE TRIGGER beauty_owned_product_version AFTER INSERT OR UPDATE OR DELETE ON public.user_products
  FOR EACH ROW EXECUTE FUNCTION beauty_review_private.track_version();
CREATE TRIGGER beauty_owned_profile_version AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION beauty_review_private.track_version();
CREATE FUNCTION beauty_review_private.reject_truncate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
BEGIN RAISE EXCEPTION USING ERRCODE='25006', MESSAGE='OWNED_TRUNCATE_UNTRACKED'; END $body$;
CREATE TRIGGER beauty_owned_product_truncate BEFORE TRUNCATE ON public.user_products
  FOR EACH STATEMENT EXECUTE FUNCTION beauty_review_private.reject_truncate();
CREATE TRIGGER beauty_owned_profile_truncate BEFORE TRUNCATE ON public.user_profiles
  FOR EACH STATEMENT EXECUTE FUNCTION beauty_review_private.reject_truncate();

CREATE FUNCTION beauty_review_private.entity_version(own text, entity_kind text, key text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
  SELECT COALESCE((SELECT v.version FROM beauty_review_private.versions v
    WHERE v.owner_id=own AND v.kind=entity_kind AND v.entity_id=key),
    CASE WHEN entity_kind='product' AND EXISTS(SELECT 1 FROM public.user_products p WHERE p.owner_id=own AND p.product_id=key)
      OR entity_kind='profile' AND EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.owner_id=own)
    THEN 1 ELSE 0 END)::bigint
$body$;

CREATE FUNCTION public.beauty_read_owned_snapshot_v1(p_owner text,p_extra_ids text[] DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE own text := beauty_review_private.owner_id(); output jsonb;
BEGIN
  IF p_owner IS DISTINCT FROM own THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='OWNED_TARGET_CHANGED'; END IF;
  IF p_extra_ids IS NULL OR cardinality(p_extra_ids)>512 OR EXISTS(SELECT 1 FROM unnest(p_extra_ids) id WHERE id IS NULL OR id='' OR octet_length(id)>32768) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='OWNED_IDS_INVALID';
  END IF;
  SELECT jsonb_build_object('ruleVersion','beauty-owned-write-v1',
    'products',COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id',p.product_id,'brand',p.brand,'model',p.model,'category',p.category,'ingredient_ids',p.ingredient_ids,'notes',p.notes) ORDER BY p.created_at,p.product_id)
       FROM public.user_products p WHERE p.owner_id=own),'[]'::jsonb),
    'profile',(SELECT jsonb_build_object('selected_ids',p.selected_ids,'skin_concerns',p.skin_concerns) FROM public.user_profiles p WHERE p.owner_id=own),
    'versions',jsonb_build_object('profile',beauty_review_private.entity_version(own,'profile','profile'),
      'products',COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id',ids.id,'version',beauty_review_private.entity_version(own,'product',ids.id)) ORDER BY ids.id)
        FROM (SELECT p.product_id id FROM public.user_products p WHERE p.owner_id=own UNION SELECT unnest(p_extra_ids)) ids),'[]'::jsonb))) INTO output;
  RETURN output;
END $body$;

CREATE FUNCTION public.beauty_commit_products_v1(p_payload text,p_signature text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE own text := beauty_review_private.owner_id(); cfg text; expected bytea; supplied bytea;
  diff integer := 0; n integer; packet jsonb; row_data jsonb; version_data jsonb;
  rules jsonb; current_ms bigint; expiry bigint; issued bigint; expected_version bigint;
  previous beauty_review_private.receipts%ROWTYPE; hash bytea; result jsonb; key text; was_present boolean[] := '{}';
BEGIN
  IF p_payload IS NULL OR octet_length(p_payload)>262144 OR p_signature IS NULL OR p_signature !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_RECEIPT_INVALID';
  END IF;
  SELECT receipt_secret INTO cfg FROM beauty_review_private.config WHERE singleton;
  IF cfg IS NULL THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='PRODUCT_REVIEW_NOT_READY'; END IF;
  expected := beauty_review_private.hmac('beauty-product-receipt-v1|'||p_payload,cfg,'sha256');
  supplied := decode(p_signature,'hex');
  FOR n IN 0..31 LOOP diff := diff | (get_byte(expected,n) # get_byte(supplied,n)); END LOOP;
  IF diff<>0 THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='PRODUCT_RECEIPT_REJECTED'; END IF;
  packet := p_payload::jsonb;
  IF jsonb_typeof(packet)<>'object' OR jsonb_typeof(packet->'v')<>'number' OR packet->>'v'<>'1' OR packet->>'ruleVersion' IS DISTINCT FROM 'beauty-product-receipt-v1'
    OR packet->>'reviewRule' IS DISTINCT FROM 'beauty-product-review-v1' OR packet->>'applicationId' IS DISTINCT FROM 'wbapp_t1U4NdF6I0IZdm8LzoMLq6'
    OR packet->>'database' IS DISTINCT FROM 'postgres-lgjvhh7s' OR packet->>'action' IS DISTINCT FROM 'owned.products.upsert'
    OR packet->>'owner' IS DISTINCT FROM own OR packet->>'nonce' IS NULL OR packet->>'nonce' !~ '^[0-9a-f]{32}$'
    OR (SELECT count(*) FROM jsonb_object_keys(packet))<>12
    OR NOT packet ?& ARRAY['v','ruleVersion','reviewRule','applicationId','database','action','owner','nonce','issuedAt','expiresAt','rows','expectedVersions']
  THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_RECEIPT_INVALID'; END IF;
  hash := beauty_review_private.digest(p_payload,'sha256');
  PERFORM pg_advisory_xact_lock(hashtextextended('beauty-owned-write-v1|'||own,0));
  SELECT * INTO previous FROM beauty_review_private.receipts WHERE owner_id=own AND nonce=packet->>'nonce';
  IF FOUND THEN
    IF previous.payload_hash IS DISTINCT FROM hash THEN RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='PRODUCT_RECEIPT_REPLAY_MISMATCH'; END IF;
    RETURN previous.result;
  END IF;
  IF jsonb_typeof(packet->'issuedAt')<>'number' OR jsonb_typeof(packet->'expiresAt')<>'number'
    OR packet->>'issuedAt' !~ '^(0|[1-9][0-9]*)$' OR packet->>'expiresAt' !~ '^(0|[1-9][0-9]*)$' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_RECEIPT_CLOCK_INVALID';
  END IF;
  issued := (packet->>'issuedAt')::bigint; expiry := (packet->>'expiresAt')::bigint;
  current_ms := floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
  IF issued<0 OR expiry>9007199254740991 OR issued>current_ms OR expiry<=current_ms OR expiry<=issued OR expiry-issued>120000 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_RECEIPT_EXPIRED'; END IF;
  SELECT data INTO rules FROM beauty_review_private.rules WHERE singleton;
  IF jsonb_typeof(packet->'rows')<>'array' OR jsonb_typeof(packet->'expectedVersions')<>'array'
    OR jsonb_array_length(packet->'rows') NOT BETWEEN 1 AND 50
    OR jsonb_array_length(packet->'expectedVersions')<>jsonb_array_length(packet->'rows') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_PAYLOAD_INVALID'; END IF;
  IF (SELECT count(DISTINCT r->>'product_id') FROM jsonb_array_elements(packet->'rows') r)<>jsonb_array_length(packet->'rows') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_PAYLOAD_INVALID'; END IF;
  FOR n IN 0..jsonb_array_length(packet->'rows')-1 LOOP
    row_data := packet->'rows'->n; version_data := packet->'expectedVersions'->n;
    IF jsonb_typeof(row_data)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(row_data))<>6
      OR NOT row_data ?& ARRAY['product_id','brand','model','category','ingredient_ids','notes']
      OR jsonb_typeof(row_data->'product_id')<>'string' OR row_data->>'product_id'=''
      OR jsonb_typeof(row_data->'brand')<>'string' OR jsonb_typeof(row_data->'model')<>'string'
      OR jsonb_typeof(row_data->'category')<>'string' OR NOT (rules->'categories') ? (row_data->>'category')
      OR jsonb_typeof(row_data->'ingredient_ids')<>'array' OR jsonb_typeof(row_data->'notes') NOT IN ('string','null')
      OR jsonb_typeof(version_data)<>'number' OR version_data::text !~ '^(0|[1-9][0-9]*)$'
      OR octet_length(row_data::text)>32768 THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_PAYLOAD_INVALID'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(row_data->'ingredient_ids') item WHERE jsonb_typeof(item)<>'string') THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_PAYLOAD_INVALID'; END IF;
    expected_version := version_data::text::bigint;
    PERFORM 1 FROM public.user_products p WHERE p.owner_id=own AND p.product_id=row_data->>'product_id' FOR UPDATE;
    was_present := array_append(was_present,FOUND);
    PERFORM 1 FROM beauty_review_private.versions v WHERE v.owner_id=own AND v.kind='product' AND v.entity_id=row_data->>'product_id' FOR UPDATE;
    IF expected_version>9007199254740991 OR beauty_review_private.entity_version(own,'product',row_data->>'product_id')<>expected_version THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='OWNED_VERSION_CONFLICT'; END IF;
  END LOOP;
  -- Only after validating the entire batch; PostgreSQL rolls back all rows and nonce on any failure.
  FOR n IN 0..jsonb_array_length(packet->'rows')-1 LOOP
    row_data := packet->'rows'->n;
    IF was_present[n+1] THEN
      UPDATE public.user_products SET brand=row_data->>'brand',model=row_data->>'model',category=row_data->>'category',
        ingredient_ids=ARRAY(SELECT jsonb_array_elements_text(row_data->'ingredient_ids')),notes=row_data->>'notes',updated_at=clock_timestamp()
        WHERE owner_id=own AND product_id=row_data->>'product_id';
    ELSE BEGIN
      INSERT INTO public.user_products(owner_id,product_id,brand,model,category,ingredient_ids,notes)
      VALUES(own,row_data->>'product_id',row_data->>'brand',row_data->>'model',row_data->>'category',
        ARRAY(SELECT jsonb_array_elements_text(row_data->'ingredient_ids')),row_data->>'notes');
      EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='OWNED_VERSION_CONFLICT';
    END; END IF;
  END LOOP;
  result := jsonb_build_object('ruleVersion','beauty-owned-write-v1','nonce',packet->>'nonce',
    'versions',(SELECT jsonb_agg(jsonb_build_object('product_id',r->>'product_id','version',beauty_review_private.entity_version(own,'product',r->>'product_id'))) FROM jsonb_array_elements(packet->'rows') r));
  INSERT INTO beauty_review_private.receipts(owner_id,nonce,payload_hash,result) VALUES(own,packet->>'nonce',hash,result);
  RETURN result;
END $body$;

CREATE FUNCTION public.beauty_remove_product_v1(p_owner text,p_product_id text,p_expected_version bigint) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE own text := beauty_review_private.owner_id(); output bigint;
BEGIN
  IF p_owner IS DISTINCT FROM own THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='OWNED_TARGET_CHANGED'; END IF;
  IF p_product_id IS NULL OR p_product_id='' OR octet_length(p_product_id)>32768 OR p_expected_version IS NULL OR p_expected_version<1 OR p_expected_version>9007199254740991 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PRODUCT_DELETE_INVALID'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('beauty-owned-write-v1|'||own,0));
  PERFORM 1 FROM public.user_products WHERE owner_id=own AND product_id=p_product_id FOR UPDATE;
  IF beauty_review_private.entity_version(own,'product',p_product_id)<>p_expected_version
    OR NOT EXISTS(SELECT 1 FROM public.user_products WHERE owner_id=own AND product_id=p_product_id) THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='OWNED_VERSION_CONFLICT'; END IF;
  DELETE FROM public.user_products WHERE owner_id=own AND product_id=p_product_id;
  output := beauty_review_private.entity_version(own,'product',p_product_id);
  RETURN jsonb_build_object('ruleVersion','beauty-owned-write-v1','product_id',p_product_id,'version',output);
END $body$;

CREATE FUNCTION public.beauty_put_profile_v1(p_owner text,p_selected_ids text[],p_skin_concerns text[],p_expected_version bigint) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE own text := beauty_review_private.owner_id(); rules jsonb; was_present boolean;
BEGIN
  IF p_owner IS DISTINCT FROM own THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='OWNED_TARGET_CHANGED'; END IF;
  SELECT data INTO rules FROM beauty_review_private.rules WHERE singleton;
  PERFORM pg_advisory_xact_lock(hashtextextended('beauty-owned-write-v1|'||own,0));
  PERFORM 1 FROM public.user_profiles WHERE owner_id=own FOR UPDATE;
  was_present := FOUND;
  IF p_selected_ids IS NULL OR p_skin_concerns IS NULL OR cardinality(p_selected_ids)>120 OR cardinality(p_skin_concerns)>13
    OR p_expected_version IS NULL OR p_expected_version<0 OR p_expected_version>9007199254740991
    OR EXISTS(SELECT 1 FROM unnest(p_skin_concerns) AS choice(value) WHERE choice.value IS NULL OR NOT (rules->'skinConcerns') ? choice.value)
    OR EXISTS(SELECT 1 FROM unnest(p_selected_ids) AS choice(value) WHERE choice.value IS NULL OR NOT (rules->'catalogueIds') ? choice.value
      AND NOT EXISTS(SELECT 1 FROM public.user_products p WHERE p.owner_id=own AND p.product_id=choice.value)) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='OWNED_PROFILE_INVALID'; END IF;
  IF beauty_review_private.entity_version(own,'profile','profile')<>p_expected_version THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='OWNED_VERSION_CONFLICT'; END IF;
  IF was_present THEN
    UPDATE public.user_profiles SET selected_ids=p_selected_ids,skin_concerns=p_skin_concerns,updated_at=clock_timestamp() WHERE owner_id=own;
  ELSE BEGIN
    INSERT INTO public.user_profiles(owner_id,selected_ids,skin_concerns) VALUES(own,p_selected_ids,p_skin_concerns);
    EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='OWNED_VERSION_CONFLICT';
  END; END IF;
  RETURN jsonb_build_object('ruleVersion','beauty-owned-write-v1','version',beauty_review_private.entity_version(own,'profile','profile'));
END $body$;
REVOKE ALL ON FUNCTION beauty_review_private.owner_id(),beauty_review_private.track_version(),beauty_review_private.reject_truncate(),beauty_review_private.entity_version(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.beauty_read_owned_snapshot_v1(text,text[]),public.beauty_commit_products_v1(text,text),public.beauty_remove_product_v1(text,text,bigint),public.beauty_put_profile_v1(text,text[],text[],bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beauty_read_owned_snapshot_v1(text,text[]),public.beauty_commit_products_v1(text,text),public.beauty_remove_product_v1(text,text,bigint),public.beauty_put_profile_v1(text,text[],text[],bigint) TO anon,authenticated;
COMMIT;
