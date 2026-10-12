import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const target=Object.freeze({applicationId:'wbapp_t1U4NdF6I0IZdm8LzoMLq6',database:'postgres-lgjvhh7s',operator:'cloudbase_postgres_postgres_lgjvhh7s'});
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
// WorkBuddy accepts one SQL statement per migration call. The DO statement and
// its target checks share the same transaction as the unchanged migration body.
export function wrapMigration(sql,phase,identity=target){
  if(!['prepare','cutover'].includes(phase))throw Error('Unknown phase');
  const body=sql.replace(/^([\s\S]*?)\bBEGIN;/,(_all,comments)=>comments).replace(/COMMIT;\s*$/,'');
  if(body===sql||/\bCOMMIT;\s*$/.test(body))throw Error('Expected transaction wrapper');
  const sha=crypto.createHash('sha256').update(sql).digest('hex');
  const tag='$beauty_plan_'+sha.slice(0,16)+'$';
  if(body.includes(tag))throw Error('Dollar quote collision');
  const guard=`IF current_database() IS DISTINCT FROM ${literal(identity.database)} OR current_user IS DISTINCT FROM ${literal(identity.operator)} THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='BEAUTY_DEPLOY_TARGET_MISMATCH';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.member WHERE r.rolname IN ('anon','authenticated')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='BEAUTY_INHERITED_ROLE_REQUIRES_REVIEW';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('user_products','user_profiles') AND c.relrowsecurity AND c.relowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user))<>2
     OR (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('user_products','user_profiles'))<>8 THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='BEAUTY_SCHEMA_REQUIRES_REVIEW';
  END IF;`;
  const phaseGuard=phase==='prepare'?`IF to_regnamespace('beauty_review_private') IS NOT NULL OR EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname='pgcrypto') THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='BEAUTY_PREPARE_ALREADY_PRESENT_OR_EXTENSION_DRIFT';
  END IF;`:`IF NOT EXISTS(SELECT 1 FROM beauty_review_private.config WHERE singleton AND octet_length(receipt_secret)>=32)
     OR NOT EXISTS(SELECT 1 FROM beauty_review_private.rules WHERE singleton AND data->>'ruleVersion'='beauty-owned-write-v1') THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='BEAUTY_ISSUER_NOT_CONFIGURED';
  END IF;`;
  return `-- Candidate only. Application: ${identity.applicationId}; phase: ${phase}; body sha256: ${sha}\nDO ${tag}\nBEGIN\n  ${guard}\n  ${phaseGuard}\n${body}\nEND\n${tag};\n`;
}

export function buildPlan(root,out){
  if(fs.existsSync(out))throw Error('Output must be a new directory; preserve previous plans');
  fs.mkdirSync(out,{recursive:true});
  const phases={};
  for(const phase of ['prepare','cutover']){
    const raw=fs.readFileSync(path.join(root,'migrations/beauty-owned-v1',phase+'.sql'),'utf8');
    const wrapped=wrapMigration(raw,phase);
    fs.writeFileSync(path.join(out,phase+'.sql'),wrapped);
    phases[phase]={bodySha256:crypto.createHash('sha256').update(raw).digest('hex'),statementSha256:crypto.createHash('sha256').update(wrapped).digest('hex')};
  }
  fs.writeFileSync(path.join(out,'计划.json'),JSON.stringify({target,phases,executed:false,secretIncluded:false,sqlCalls:2,configurationCallPending:true},null,2)+'\n');
  console.log('Single-statement migration plan sealed; no database connection.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const index=process.argv.indexOf('--out');
  if(index<0||!process.argv[index+1])throw Error('--out required');
  buildPlan(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),path.resolve(process.argv[index+1]));
}
