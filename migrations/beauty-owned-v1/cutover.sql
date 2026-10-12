-- Candidate only. Apply after prepare, issuer readiness, client candidate and live acceptance.
BEGIN;
REVOKE ALL ON public.user_products,public.user_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.user_products,public.user_profiles TO anon,authenticated;
REVOKE INSERT(id,owner_id,product_id,brand,model,category,ingredient_ids,notes,image,product_json,created_at,updated_at),
  UPDATE(id,owner_id,product_id,brand,model,category,ingredient_ids,notes,image,product_json,created_at,updated_at),
  REFERENCES(id,owner_id,product_id,brand,model,category,ingredient_ids,notes,image,product_json,created_at,updated_at)
  ON public.user_products FROM PUBLIC,anon,authenticated;
REVOKE INSERT(id,owner_id,skin_concerns,selected_ids,updated_at),UPDATE(id,owner_id,skin_concerns,selected_ids,updated_at),REFERENCES(id,owner_id,skin_concerns,selected_ids,updated_at)
  ON public.user_profiles FROM PUBLIC,anon,authenticated;
COMMIT;
