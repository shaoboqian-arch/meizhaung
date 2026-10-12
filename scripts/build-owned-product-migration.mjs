import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rules=JSON.parse(fs.readFileSync(path.join(root,'cloudfunctions/meizhaung-sync/ownedProductRules.generated.json'),'utf8'));
if(rules.ruleVersion!=='beauty-owned-write-v1')throw Error('Rule version mismatch');
const dir=path.join(root,'migrations/beauty-owned-v1'),template=fs.readFileSync(path.join(dir,'prepare.template.sql'),'utf8');
const sql=template.replace('__RULES__',"'"+JSON.stringify(rules).replaceAll("'","''")+"'");
if(process.argv.includes('--check')){if(fs.readFileSync(path.join(dir,'prepare.sql'),'utf8')!==sql)throw Error('Migration differs from authoritative generated rules');}
else fs.writeFileSync(path.join(dir,'prepare.sql'),sql);
console.log('Owned product migration prepared; no database connection or production writes.');
