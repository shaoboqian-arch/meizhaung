// Derive database choice validation from the existing product UI authority.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url),esbuild=require('esbuild');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const built=esbuild.buildSync({stdin:{contents:'export {categories,skinConcernOptions} from "./mp-weixin/src/shared/constants"; export {products} from "./src/data/catalog";',resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false});
const module={exports:{}};vm.runInNewContext(built.outputFiles[0].text,{module,exports:module.exports});
const {categories,skinConcernOptions,products}=module.exports;
if(!Array.isArray(products)||products.length<1||new Set(products.map(p=>p.id)).size!==products.length)throw Error('Catalogue IDs invalid');
const rules={ruleVersion:'beauty-owned-write-v1',categories,skinConcerns:skinConcernOptions,catalogueIds:products.map(p=>p.id).sort(),maxRows:50,maxSelected:120,maxPayloadBytes:262144,maxRowBytes:32768,maxTextLength:8000};
const target=path.join(root,'cloudfunctions/meizhaung-sync/ownedProductRules.generated.json');
const text=JSON.stringify(rules,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==text)throw Error('Owned product rules drift: regenerate from current UI/catalogue');}
else fs.writeFileSync(target,text);
console.log(JSON.stringify({ruleVersion:rules.ruleVersion,catalogueIds:rules.catalogueIds.length,checked:process.argv.includes('--check')}));
