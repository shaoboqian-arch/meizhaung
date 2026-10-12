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
INSERT INTO beauty_review_private.rules VALUES (true, '{"ruleVersion":"beauty-owned-write-v1","categories":["卸妆水","洁面","爽肤水","精华","面霜","面膜","防晒","眼霜","乳液","喷雾","唇部护理","身体乳","祛痘护理","颈部护理"],"skinConcerns":["痘多","干燥","敏感","泛红","出油多","毛孔粗","黑头","暗沉","色斑","屏障弱","颈纹","松弛","纹路"],"catalogueIds":["ab-rich-cream","ab-the-serum","acnes-cleanser","acnes-toner","aesop-amazing-cleanser","aesop-parsley-serum","ahc-eye","ahc-gold-sun","ahc-hyal-toner","albion-health-toner","allie-sun-gel","anessa-clear-gel","anessa-gold","anua-heartleaf-cleanser","anua-heartleaf-toner","aoeo-camellia-cleanser","aquaphor-healing-ointment","aquaphor-lip","armani-crema-nera-cream","armani-crema-nera-serum","aveeno-body","aveeno-oat-gel-serum","aveeno-skin-relief-body","avene-antirougeurs-cream","avene-cicalfate","avene-cleanance-cleanser","avene-mineral-sun","avene-spray","avene-tolerance-cream","avene-xeracalm-balm","banmu-cleanser","banmu-niacinamide-body","banmu-shea-body","banzai-bp-cream","benzac-ac","biaoqing-ve-body","bifesta-cleansing-lotion","bifesta-eye-lip","bioderma-atoderm-body","bioderma-h2o","bioderma-photoderm-sun","bioderma-sebium","bioderma-sebium-h2o","bioderma-sensibio-eye","bioeffect-egf-serum","biore-athlizm-milk","biore-sunscreen","biotherm-homme-aquapower","biotherm-homme-cleanser","biotherm-homme-eye","biotherm-homme-force-cream","blistex-lip","bodyshop-teatree","bodyshop-vit-e-cream","boj-ginseng-serum","boj-redbean-mask","boj-relief-sun","bosideng-men-cleanser","bosideng-men-cream","bulk-homme-cleanser","bulk-homme-cream","bulk-homme-lotion","bywishtrend-mandelic","carmex-lip","caudalie-grape-water","caudalie-vinoperfect","caudalie-vinosource-cream","cca-bubble-mask","cerave-body-repair","cerave-cleanser","cerave-cream","cerave-eye-repair","cerave-face-sun","cerave-pm","cerave-retinol","cerave-sa-cleanser","cerave-sa-toner","cetaphil-gentle-cleanser","cetaphil-moisturizing-cream","cetaphil-redness-serum","chando-cream","chando-mask","chando-neck","chando-niacinamide-mask","chando-purple-serum","chando-snow-toner","chando-sun-lotion","chanel-hydra-cream","chanel-hydra-mist","chanel-hydra-serum","chanel-le-lift","chanel-sublimage","chanel-sublimage-eye","chunjuan-huangqi-cream","clarins-double-serum","clarins-extra-firming-cream","clarins-hydra-serum","clarins-lip-oil","clarins-men-anti-age","clarins-men-cleanser","clarins-men-cream","clarins-neck","clarins-vface-serum","clarins-white-plus-serum","cleanclear-oil-free-wash","clinique-302-serum","clinique-all-about-eyes","clinique-clarifying-2","clinique-gel","clinique-liquid-soap","clinique-lotion","clinique-men-cleanser","clinique-men-cream","clinique-men-lotion","clinique-moisture-cream","clinique-take-off-balm","comfy-collagen-mask","coppertone-water-babies","cosrx-advanced-snail-92-cream","cosrx-aha-liquid","cosrx-bha","cosrx-propolis-serum","cosrx-snail","cpb-cleanser","cpb-emulsion","cpb-eye-cream","cpb-lotion","cpb-sunscreen","curel-cleanser","curel-cream","curel-emulsion","curel-eye-cream","curel-lotion","curel-sunscreen","dabao-eye-cream","dabao-sod-lotion","dafuwen-adapalene-gel","de-la-cruz-sulfur","dearboyfriend-cleanser","dearboyfriend-lotion","dearboyfriend-serum","decorte-avocado-emulsion","decorte-mugwort-lotion","dermalogica-cleansing-gel","dhc-cleansing","dior-one-essential-serum","dior-prestige-cream","dior-prestige-eye","dior-prestige-lotion","diorsnow-serum","dove-cleanser","dove-nourishing-body","dralva-anti-gravity-serum","dralva-cleanser","dralva-micro-lotion","dralva-micro-water","dralva-probiotics-mask","drcilabo-377-serum","drcilabo-pore-toner","drjart-ceramide","drjart-mask","drunk-apassioni","drunk-babyfacial","drunk-ceramighty-eye","drunk-cfirma-serum","drunk-protini","drwu-mandelic","drwu-mandelic-essence","dryu-barrier-cream","elixir-emulsion","elixir-enriched-eye","elixir-gold-sun","elixir-sleep-pack","elixir-toner","elizabeth-arden-ceramide-serum","elizabeth-arden-eight-hour-cream","elizabeth-arden-greentea-body","elta-md","esteelauder-anr","esteelauder-anr-eye","esteelauder-line-lift-serum","esteelauder-micro","esteelauder-neck","esteelauder-perfectly-clean-cleanser","esteelauder-pomegranate-toner","esteelauder-renutriv-cream","esteelauder-renutriv-eye","esteelauder-sakura-toner","eucerin-atocontrol-balm","eucerin-cream","eucerin-dermopure-serum","eucerin-hyaluron-filler-cream","eucerin-ph5-body","eucerin-spot","eucerin-sun-fluid","eucerin-urea","eucerin-urea10-body","evelom-cleanser","evian-spray","evm-silver-cream","fancl-cleansing","firstaid-cream","firstaid-pads","florasis-oil","freeplus-cleanser","freeplus-lotion","freeplus-toner","fresh-black-tea-cream","fresh-black-tea-mask","fresh-neck","fresh-rose-cream","fresh-rose-toner","fresh-soy-cleanser","fresh-vitamin-nectar","fuerjia-collagen-mask","fuerjia-ha-mask","fuerjia-repair-spray","fuqing-acne-serum","gf-anti-wrinkle-cream","gf-bamboo-cleanser","gf-bamboo-lotion","gf-energy-cream","gf-oil-control-mask","glossier-balm","glossier-superpure","guerlain-abeille-cream","guerlain-abeille-eye","guerlain-abeille-serum","guerlain-orchidee-cream","guyu-aa-cleanser","guyu-bright-mask","guyu-cactus-lotion","guyu-licorice-serum","guyu-licorice-toner","haba-g-lotion","haba-squalane","hadalabo-lotion","hadalabo-milk","hadalabo-premium-lotion","hadalabo-serum","hadalabo-shirojyun","hanayaka-cleanser","hanayaka-micellar","hanshu-gold-mask","hanshu-red-capsule-serum","hbn-arbutin-toner","hbn-bha-serum","hbn-cleanser","hbn-eye","hbn-freeze-dried-mask","hbn-mineral-sun","hbn-night-cream","hbn-retinal-serum","hbn-retinol-lotion","hefengyu-cleanser","hefengyu-lotion","herbivore-bakuchiol","herborist-bright-mask","herborist-cream","herborist-toner","hfp-niacinamide-serum","hr-cellglow-concentrate","hr-cellglow-cream","hr-cellglow-essence","hr-cellglow-eye","hr-cellglow-mask","hr-cellglow-oilixir","hr-powercell-cream","hr-powercell-emulsion","hr-powercell-essence","hr-powercell-eye","hr-powercell-rehab-serum","hr-powercell-serum","hr-pure-ritual-foam","hr-pure-ritual-milk","hr-replasty-day","hr-replasty-eye","hr-replasty-laserist","hr-replasty-night","hr-replasty-power-a-ha","hr-replasty-profiller","inbeauty-retinol","inkey-retinol","innisfree-clay","innisfree-daily-sun","innisfree-green-tea","innisfree-green-tea-cream","innisfree-green-tea-toner","inoherb-men-cleanser","inoherb-men-cream","inoherb-rhodiola","inoherb-rhodiola-cream","ipsa-clay-mask","ipsa-median-lotion","ipsa-toner","isdin-flavoc-ampoule","isdin-kox","isdin-sunscreen","isntree-ha-toner","jieweier-cleanser","jieweier-lotion","jihuo-rice-toner","jiniun-cleanser","jiniun-cream","jiniun-mask","jm-water-mask","jnj-milk-body","johnjeff-azelaic","johnjeff-retinol-serum","johnjeff-txa","johnjeff-vc-serum","jurlique-herbal-toner","kans-red-capsule","kefumei-collagen-serum","kefumei-spray","kejin-collagen-cream","kejin-collagen-spray","kiehls-avocado-eye","kiehls-body","kiehls-calendula","kiehls-calendula-mask","kiehls-corrective-serum","kiehls-lip-balm","kiehls-mask","kiehls-men-cleanser","kiehls-men-cream","kiehls-men-lotion","kiehls-midnight-serum","kiehls-rare-earth","kiehls-ultra-cream","kiehls-vitc-eye","kikumasamune-sake-toner","kracie-collagen-mask","kracie-ha-mask","la-mer-cream","lab-anti-age-cream","lab-eye-treatment","lab-multi-cleanser","lab-oil-control-lotion","lab-power-wash","lamer-cleansing-foam","lamer-concentrate","lamer-cool-gel-cream","lamer-eye-balm-intense","lamer-eye-concentrate","lamer-fresh-cream","lamer-lifting-contour-serum","lamer-lifting-eye-serum","lamer-lip-balm","lamer-lotion","lamer-micellar-water","lamer-regenerating-serum","lamer-renewal-oil","lamer-revitalizing-mask","lamer-soft-cream","lamer-treatment-lotion","lancome-absolue-cream","lancome-absolue-eye","lancome-clarifique","lancome-genifique","lancome-genifique-eye","lancome-hydrix-cream","lancome-hydrix-serum","lancome-neck","lancome-rose-pink-toner","laneige-cica-mask","laneige-cream","laneige-mask","laneige-water-serum","laprairie-caviar-essence","laprairie-caviar-eye-cream","laprairie-caviar-eye-lift","laprairie-caviar-harmony","laprairie-caviar-hydro-emulsion","laprairie-caviar-liquid-lift","laprairie-caviar-luxe-cream","laprairie-caviar-sleep-mask","laprairie-foam-cleanser","laprairie-gold-concentrate","laprairie-gold-cream","laprairie-gold-essence","laprairie-gold-eye","laprairie-micellar-water","laprairie-platinum-cream","laprairie-platinum-elixir","laprairie-platinum-eye","laprairie-platinum-lotion","laprairie-platinum-mask","laprairie-platinum-night-elixir","laprairie-refining-lotion","laprairie-white-concentrate","laprairie-white-creme","laprairie-white-essence","laprairie-white-eye","laprairie-white-pearl","laroche-anthelios","laroche-anthelios-toned","laroche-anthelios-uvmune","laroche-b5","laroche-effaclar","laroche-effaclar-duo-plus","laroche-effaclar-mat","laroche-effaclar-serum","laroche-hydraphase-serum","laroche-lipikar-balm","laroche-spray","laroche-toleriane-cleanser","laroche-toleriane-eye","laroche-toleriane-fluid","lauramercier-mask","linxuan-camellia-oil","lip-bioderma","lip-dhc","lip-laneige","lip-laroche","liran-cleanser","liran-cream","liran-sun","liran-toner","loccitane-almond-body","loccitane-shea-body","loreal-age-cream","loreal-cream","loreal-filler-eye","loreal-filler-serum","loreal-gold-serum","loreal-men-energy-cleanser","loreal-men-energy-cream","loreal-men-hydra-cleanser","loreal-men-hydra-cream","loreal-men-hydra-lotion","loreal-men-mask","loreal-men-neck","loreal-men-oil-control-cleanser","loreal-men-oil-control-lotion","loreal-men-sun","loreal-neck","loreal-retinol","loreal-sci-white-serum","loreal-uv-expert","loreal-vitc","loreal-zero-cream","lucas-papaw","martin-cleanser","martin-lotion","marubi-collagen-cream","marubi-collagen-toner","marubi-eye","marubi-japan-essence","marymay-azelaic-serum","marymay-tranexamic-serum","maskfamily-clay","matsuyama-yuzu-body","maxam-pearl-emulsion","medicube-zero","medik8-ctetra","medik8-liquid-peptides","medik8-retinal","medrepair-ha-serum","meiqi-beauty-emulsion","melano-cc-mask","melano-cc-serum","mentholatum-lip","mentholatum-men-cleanser","mentholatum-men-lotion","mentholatum-men-sun","mibelle-blue-serum","mibelle-pink-toner","minon-lotion","mistine-aqua-sun","mistine-sun-spray","morita-collagen-mask","morita-ha-mask","morita-niacinamide-mask","muji-balancing-toner","murad-acne-serum","murad-retinol","mystery-doctor-retinol","nameraka-soy-toner","naris-sun-spray","nars-cleanser","naturabisse-diamond-cream","naturerepublic-aloe-gel","neostrata-pha","neutrogena-acne-wash","neutrogena-body","neutrogena-hydro-cleanser","neutrogena-hydro-serum","neutrogena-lip-balm","neutrogena-rapid-eye","neutrogena-ultra-sheer","nihon-men-aftershave","nivea-body","nivea-creme-tin","nivea-lip","nivea-men-after-shave","nivea-men-deep-cleanser","nivea-men-eye","nivea-men-hydra-cream","nivea-men-oil-control-cleanser","nivea-men-oil-lotion","nivea-men-sun-lotion","nivea-neck","nivea-nourishing-body","nivea-q10-body","nivea-soft-cream","olay-cream","olay-fade-eye","olay-light","olay-neck","olay-prox-fade-serum","olay-radiant-body","olay-regenerist-cream","olay-retinol","olay-retinol-eye","olay-total-effects-cream","omi-bear-sun","oneleaf-olive","operan-coix-toner","ordinary-aha-bha","ordinary-ala","ordinary-arbutin","ordinary-azelaic","ordinary-caffeine","ordinary-glycolic","ordinary-ha-b5","ordinary-lactic-10","ordinary-multi-peptide","ordinary-niacinamide","ordinary-nmf-cream","ordinary-resveratrol","ordinary-retinol","ordinary-squalane-100","ordinary-vc23","origins-charcoal-mask","origins-ginzing-toner","origins-mask","origins-plantscription-serum","osmun-pearl-serum","pair-acne-cream","palmers-cocoa-body","paula-1retinol","paula-aha8","paula-azelaic","paula-bakuchiol","paula-bha","paula-calm-serum","paula-clear-sunscreen","paula-niacinamide-booster","paula-resist-antioxidant","paula-resist-eye","paula-retinol","pechoin-cream","pechoin-frame-cream","pechoin-glycerin-body","pechoin-mask","pechoin-men-cleanser","pechoin-men-cream","pechoin-men-lotion","pechoin-neck","perfectdiary-aa-cleanser","perfectdiary-cleanser","petersons-b5-cream","petersons-bha-mask","petersons-five-acid-serum","philosophy-purity-cleanser","pienshen-pearl-cream","pmpm-bha-mask","pmpm-sea-mud-cleanser","pmpm-tranexamic-serum","pola-ba-cream","pola-whiteshot-serum","ponds-mici-cleanser","proya-derma-cleanser","proya-dual-anti","proya-dual-eye-cream","proya-energy","proya-light-sun","proya-mask","proya-neck","proya-neck-mask","proya-quickwhite-serum","proya-ruby","proya-ruby-cream","proya-ruby-eye","proya-source-cream","proya-source-serum","ptr-cucumber-mask","purid-no1","purid-no2","purid-no3","purito-centella-cream","purito-mineral-sun","quadha-eye-cream","quadha-freeze-mask","quadri-5d-ha","ren-aha","rnw-ha-serum","roc-retinol","roc-retinol-eye","rookie-curcumin-mask","rookie-turmeric","roundlab-lotion","roundlab-sunscreen","roundlab-toner","runbaiyan-barrier-serum","runbaiyan-ha-serum","runbaiyan-white-serum","sanshi-cica-serum","sebamed-cleanser","sebamed-lotion","sekkisei-toner","senka-cleanser","shangshui-barrier","shangshui-bha","shiseido-benefiance-cream","shiseido-benefiance-eye","shiseido-eudermine","shiseido-men-cleanser","shiseido-men-cream","shiseido-men-lotion","shiseido-men-sun","shiseido-ultimune","shiseido-vital-perfection-cream","shiseido-vital-perfection-emulsion","shiseido-vital-perfection-eye","shiseido-vital-perfection-lotion","shiseido-vital-perfection-neck","shiseido-white-fusion-serum","shu-cleansing","shuangmei-yurong-cream","sisley-blackrose-cream","sisley-emulsion","sisley-neck","sisley-saffron-cream","sisleya-serum","sk2-essence","sk2-genoptics-serum","sk2-men-cream","sk2-men-lotion","sk2-rna-cream","sk2-youthful-mask","skin1004-ampoule","skin1004-centella-toner","skinceuticals-age-cream","skinceuticals-age-eye","skinceuticals-b5","skinceuticals-ce","skinceuticals-discoloration","skinceuticals-ha","skinceuticals-ha-intensifier","skinceuticals-mineral-sun","skinceuticals-neck","skinceuticals-phloretin-cf","skinceuticals-phyto-corrective","skinfuture-377","skinmedica-retinol","sofina-oil-cut-sun","softymo-cleansing-oil","spring-letter-vc","strivectin-neck","sturm-face-cream","sturm-hyaluronic-serum","sulwhasoo-emulsion","sulwhasoo-firstcare-serum","sulwhasoo-overnight-mask","sulwhasoo-toner","sum37-moist-toner","supergoop-unseen","tatcha-cream","tatcha-indigo-cream","tatcha-watercream","topicals-faded","torriden-ha-serum","torriden-toner","uniskin-black-serum","uniskin-eye-cream","uniskin-hexapeptide-serum","unny-asahi-sunscreen","unny-astaxanthin-cleansing-oil","unny-blackhead-strip","unny-clear-bright-sunscreen","unny-cloud-amino-cleanser","unny-cloud-clear-cleanser","unny-eteecy-essence-pad","unny-greenbean-primer","unny-mineral-sunscreen","unny-moisture-mist","unny-sensory-primer-cream","unny-shake-sunscreen","unny-silky-bright-sunscreen","uno-all-in-one-cream","uno-charcoal-cleanser","uno-oil-control-toner","uriage-micellar-water","uriage-spray","uriage-xemose-cream","valmont-clarifying-infusion","valmont-detox-cream","valmont-eye-cream","valmont-fluid-falls","valmont-hydra3-cream","valmont-hydra3-serum","valmont-icy-falls","valmont-lumisence","valmont-moisturizing-booster","valmont-moisturizing-mask","valmont-primary-veil","valmont-prime-regenera-i","valmont-prime-regenera-ii","valmont-prime-renewing-pack","valmont-vfirm-cream","valmont-vital-falls","valmont-vline-concentrate","vaseline-body","vaseline-cocoa-body","vaseline-intensive-lotion","vaseline-lip-classic","vichy-89","vichy-aqualia-cream","vichy-ideal-soleil","vichy-liftactiv-serum","vichy-neovadiol-cream","vichy-thermal-spray","vt-cica-mask","whoo-bichup-serum","whoo-cheongidan-cream","whoo-gongjinhyang-emulsion","whoo-gongjinhyang-toner","winona-acne-serum","winona-acne-toner","winona-body-lotion","winona-cleanser","winona-eye-cream","winona-lotion","winona-mask","winona-repair","winona-special-cream","winona-sun-spray","winona-sunscreen","winona-toner","winonababy-cream","ximuyuan-camellia","ximuyuan-camellia-cream","ximuyuan-fomes-cleanser","ximuyuan-fomes-serum","xiwuji-matsutake","yifuquan-txa","yilian-ha-serum","yilian-ha-spray","youth-superfood","ysl-night-reboot-serum","ysl-or-rouge-cream","yumen-volcano-cleanser","yumeyj-cream","yunifang-mud-mask","zhanmeiya-multi-ha","zhiben-barrier-cream","zhiben-gentle-cleanser","zhiben-sunscreen","zhiben-toner","zhuben-qinghuan-cleansing-oil","zunlan-cleanser","zunlan-cream","zuoyanyouse-cleanser","zuoyanyouse-cream"],"maxRows":50,"maxSelected":120,"maxPayloadBytes":262144,"maxRowBytes":32768,"maxTextLength":8000}'::jsonb);
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
