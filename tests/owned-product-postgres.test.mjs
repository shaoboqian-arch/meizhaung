// Executes the unchanged candidate against PostgreSQL/WASM, not a SQL mock.
// Set BEAUTY_PGLITE_ROOT to an isolated @electric-sql/pglite@0.5.8 package installation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {wrapMigration,target} from '../scripts/build-owned-product-plan.mjs';
const require=createRequire(import.meta.url);
const moduleRoot=process.env.BEAUTY_PGLITE_ROOT;
if(!moduleRoot)throw Error('BEAUTY_PGLITE_ROOT required; never substitute a mock for PostgreSQL');
const {PGlite}=await import(pathToFileURL(path.join(moduleRoot,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(path.join(moduleRoot,'dist/contrib/pgcrypto.js')));
const secret='synthetic-independent-receipt-secret-00001';
const own='wx:o'+'x'.repeat(27),other='wx:o'+'y'.repeat(27);
const repo=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),'..');
const prepare=fs.readFileSync(new URL('../migrations/beauty-owned-v1/prepare.sql',import.meta.url),'utf8');
const cutover=fs.readFileSync(new URL('../migrations/beauty-owned-v1/cutover.sql',import.meta.url),'utf8');
const {reviewAndIssueProductReceipt}=require('../cloudfunctions/meizhaung-sync/productReceipt.js');
const {issueProcessingIdentity}=require('../cloudfunctions/meizhaung-sync/processingIdentity.js');
const {resetTokenCache}=require('../cloudfunctions/meizhaung-sync/wxsec.js');
const {USER_URL}=require('../cloudfunctions/meizhaung-sync/productReview.js');
const row=(id='synthetic-one')=>({product_id:id,brand:'合成品牌',model:'合成型号',category:'精华',ingredient_ids:['niacinamide'],notes:'本机测试'});
const response=data=>({ok:true,status:200,json:async()=>data});
async function issued(rows,versions){resetTokenCache();const now=Date.now();return reviewAndIssueProductReceipt({rows,expectedVersions:versions,platformToken:'synthetic-platform',processingToken:issueProcessingIdentity(own.slice(3),'synthetic-wx-key',now).processingToken,publishableKey:'wbpk_t1U4NdF6I0IZdm8LzoMLq6_synthetic',secret:'synthetic-wx-key',receiptSecret:secret,now,fetchImpl:async url=>response(url===USER_URL?{sub:own}:String(url).includes('stable_token')?{access_token:'synthetic-token',expires_in:7200}:{errcode:0,result:{suggest:'pass'}})});}
function packet(rows=[row()],versions=[0],extra={}){const now=Date.now();return {v:1,ruleVersion:'beauty-product-receipt-v1',reviewRule:'beauty-product-review-v1',applicationId:'wbapp_t1U4NdF6I0IZdm8LzoMLq6',database:'postgres-lgjvhh7s',action:'owned.products.upsert',owner:own,nonce:crypto.randomBytes(16).toString('hex'),issuedAt:now-50,expiresAt:now+119000,rows,expectedVersions:versions,...extra};}
function sign(p){const payload=JSON.stringify(p);return {payload,signature:crypto.createHmac('sha256',secret).update('beauty-product-receipt-v1|'+payload).digest('hex')};}
let db,activeOwner=own;
test.before(async()=>{
 db=new PGlite({extensions:{pgcrypto}});await db.waitReady;
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS text LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')';
 CREATE TABLE public.user_products(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,owner_id text NOT NULL DEFAULT auth.uid(),product_id text NOT NULL,brand text NOT NULL,model text NOT NULL,category text NOT NULL,ingredient_ids text[] NOT NULL DEFAULT '{}',notes text,image text,product_json text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id,product_id));
 CREATE TABLE public.user_profiles(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,owner_id text NOT NULL DEFAULT auth.uid(),skin_concerns text[] NOT NULL DEFAULT '{}',selected_ids text[] NOT NULL DEFAULT '{}',updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id));
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.user_products,public.user_profiles TO anon,authenticated;
 GRANT INSERT(brand),UPDATE(notes) ON public.user_products TO anon,authenticated;
 GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated;
 ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY; ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;`);
 for(const table of ['user_products','user_profiles'])for(const cmd of ['SELECT','INSERT','UPDATE','DELETE'])await db.exec(`CREATE POLICY ${table}_${cmd.toLowerCase()}_own ON public.${table} FOR ${cmd} TO anon,authenticated ${cmd==='INSERT'?'WITH CHECK(owner_id=auth.uid())':cmd==='UPDATE'?'USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid())':'USING(owner_id=auth.uid())'};`);
 await assert.rejects(()=>db.exec(wrapMigration(prepare,'prepare')),e=>e.code==='42501'&&e.message==='BEAUTY_DEPLOY_TARGET_MISMATCH');
 assert.equal((await db.query("SELECT to_regnamespace('beauty_review_private') value")).rows[0].value,null);
 const local=await db.query('SELECT current_database() database,current_user operator');
 const localTarget={...target,...local.rows[0]};
 await db.exec(wrapMigration(prepare,'prepare',localTarget));
 await assert.rejects(()=>db.exec(wrapMigration(cutover,'cutover',localTarget)),e=>e.code==='55000'&&e.message==='BEAUTY_ISSUER_NOT_CONFIGURED');
 await db.query('INSERT INTO beauty_review_private.config VALUES(true,$1)',[secret]);
 await db.exec(wrapMigration(cutover,'cutover',localTarget));
});
test.after(async()=>{await db.close();});
async function asOwner(owner=own,role='authenticated'){activeOwner=owner;await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('SET ROLE '+role);}
const commit=r=>db.query('SELECT public.beauty_commit_products_v1($1,$2) result',[r.payload,r.signature]).then(r=>r.rows[0].result);
const read=(ids=[])=>db.query('SELECT public.beauty_read_owned_snapshot_v1($1,$2::text[]) result',[activeOwner,ids]).then(r=>r.rows[0].result);
const rejected=(fn,code)=>assert.rejects(fn,e=>e.code===code);

test('real SQL preparation and table/column cutover deny unsigned application writes',async()=>{
 for(const role of ['anon','authenticated']){
  await asOwner(own,role);
  await rejected(()=>db.exec(`INSERT INTO public.user_products(product_id,brand,model,category) VALUES('unsigned','a','b','精华')`),'42501');
  await rejected(()=>db.exec('SELECT * FROM beauty_review_private.config'),'42501');
  await rejected(()=>db.exec('SELECT beauty_review_private.owner_id()'),'42501');
  await rejected(()=>db.exec('TRUNCATE public.user_products'),'42501');
  assert.equal((await db.query("SELECT has_column_privilege(current_user,'public.user_products','notes','UPDATE') ok")).rows[0].ok,false);
 }
});
test('actual issuer JSON and UTF8 HMAC authorize one atomic write; duplicates return the same receipt',async()=>{
 await asOwner();const r=await issued([row()],[0]);const first=await commit(r);assert.equal(first.versions[0].version,1);
 assert.deepEqual(await commit(r),first);const s=await read();assert.equal(s.products[0].notes,'本机测试');assert.equal(s.versions.products[0].version,1);
});
test('tampering, foreign owner, anonymous sessions and stale receipts cannot write',async()=>{
 await asOwner();const r=sign(packet([row('rejected')],[0]));await rejected(()=>commit({...r,payload:r.payload.replace('本机测试','篡改')}),'42501');
 await asOwner(other);await rejected(()=>commit(r),'22023');assert.equal((await read()).products.length,0);
 await asOwner('anonymous:test','anon');await rejected(()=>commit(r),'42501');
 await asOwner();await rejected(()=>commit(sign(packet([row('expired')],[0],{expiresAt:Date.now()-1,issuedAt:Date.now()-1000}))),'22023');
});
test('two intents against one observed version: the stale intent fails without any partial batch',async()=>{
 await asOwner();const valid=sign(packet([{...row(),notes:'新版本'}],[1]));const late=sign(packet([{...row(),notes:'迟到旧版本'},row('must-not-appear')],[1,0]));
 await commit(valid);await rejected(()=>commit(late),'40001');const s=await read();assert.equal(s.products[0].notes,'新版本');assert.equal(s.products.some(p=>p.product_id==='must-not-appear'),false);
});
test('unknown fields, malformed versions and unchecked profile text are rejected by the database',async()=>{
 await asOwner();for(const p of [packet([{...row('extra'),image:'file://private'}],[0]),packet([row('negative')],[-1]),packet([row('unknown')],[0],{extra:'forged'})])await assert.rejects(()=>commit(sign(p)));
 await rejected(()=>db.query('SELECT public.beauty_put_profile_v1($1,$2::text[],$3::text[],$4)',[own,['injected-text'],['敏感'],0]),'22023');
 await rejected(()=>db.query('SELECT public.beauty_put_profile_v1($1,$2::text[],$3::text[],$4)',[own,['skinceuticals-ce'],['arbitrary-text'],0]),'22023');
});
test('profile choices and owner-scoped deletion use versions; tombstones reject stale resurrection',async()=>{
 await asOwner();const p=(await db.query('SELECT public.beauty_put_profile_v1($1,$2::text[],$3::text[],$4) result',[own,['synthetic-one','skinceuticals-ce'],['敏感'],0])).rows[0].result;assert.equal(p.version,1);
 await rejected(()=>db.query('SELECT public.beauty_put_profile_v1($1,$2::text[],$3::text[],$4)',[own,[],[],0]),'40001');
 await db.query('SELECT public.beauty_remove_product_v1($1,$2,$3)',[own,'synthetic-one',2]);
 const s=await read(['synthetic-one']);assert.equal(s.products.length,0);assert.equal(s.versions.products[0].version,3);
 await rejected(()=>commit(sign(packet([row()],[0]))),'40001');await commit(sign(packet([row()],[3])));assert.equal((await read()).versions.products[0].version,4);
});
test('privileged legacy updates also advance the single version authority',async()=>{
 await db.exec('RESET ROLE');await db.query('UPDATE public.user_products SET notes=$1 WHERE owner_id=$2',['管理员合成改动',own]);
 await asOwner();assert.equal((await read()).versions.products[0].version,5);
 await rejected(()=>commit(sign(packet([{...row(),notes:'旧本机'}],[4]))),'40001');
});
test('an injected failure after a row mutation rolls back both data and version/nonce receipts',async()=>{
 await db.exec('RESET ROLE');await db.exec("CREATE FUNCTION public.synthetic_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.product_id='synthetic-failure' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_failure AFTER INSERT ON public.user_products FOR EACH ROW EXECUTE FUNCTION public.synthetic_failure();");
 await asOwner();const r=sign(packet([row('batch-first'),row('synthetic-failure')],[0,0]));await assert.rejects(()=>commit(r));const s=await read(['batch-first']);assert.equal(s.products.some(p=>p.product_id==='batch-first'),false);assert.equal(s.versions.products.find(p=>p.product_id==='batch-first').version,0);
 await db.exec('RESET ROLE');const nonce=JSON.parse(r.payload).nonce;assert.equal((await db.query('SELECT count(*)::int n FROM beauty_review_private.receipts WHERE nonce=$1',[nonce])).rows[0].n,0);
});
test('nullable envelope constants and same nonce with a different signed payload never authorize a second write',async()=>{
 await asOwner();for(const field of ['ruleVersion','reviewRule','applicationId','database','action'])await rejected(()=>commit(sign(packet([row('null-constant')],[0],{[field]:null}))),'22023');
 const p=packet([row('replay-key')],[0]),first=await commit(sign(p));
 await rejected(()=>commit(sign({...p,rows:[{...row('replay-key'),notes:'不同内容'}]})),'23505');
 assert.deepEqual(await commit(sign(p)),first);
});
test('administrator truncation is refused instead of silently discarding version/tombstone semantics',async()=>{
 await db.exec('RESET ROLE');await rejected(()=>db.exec('TRUNCATE public.user_products'),'25006');
 await asOwner();assert.ok((await read()).products.some(p=>p.product_id==='synthetic-one'));
});

test('a session switch cannot apply the previous owner intent to a newly active account',async()=>{
 await asOwner(other);
 await rejected(()=>db.query('SELECT public.beauty_read_owned_snapshot_v1($1,$2::text[])',[own,[]]),'42501');
 await rejected(()=>db.query('SELECT public.beauty_put_profile_v1($1,$2::text[],$3::text[],$4)',[own,['skinceuticals-ce'],['敏感'],0]),'42501');
 await rejected(()=>db.query('SELECT public.beauty_remove_product_v1($1,$2,$3)',[own,'synthetic-one',1]),'42501');
 const snapshot=await read();assert.equal(snapshot.products.length,0);assert.equal(snapshot.profile,null);
});
