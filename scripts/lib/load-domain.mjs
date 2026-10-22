import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
export async function loadDomain(){
 const directory=resolve('tmp/runtime',randomUUID());await mkdir(directory,{recursive:true});
 for(const name of ['secrets','azure-credential','keyvault']){
  const file=resolve(directory,'parent-'+name+'.mjs');
  const source=(await readFile(`src/lib/${name}.ts`,'utf8')).replace(/from "\.\/([^".]+)"/g,'from "./parent-$1.mjs"');
  await writeFile(file,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 }
 for(const name of ['identity','sqlite','postgres-sql','db','contracts','parser','service','auth-store','attachments']){
  const source=(await readFile(`src/lib/local/${name}.ts`,'utf8')).replace('import("../secrets")','import("./parent-secrets.mjs")').replace(/from "\.\/([^".]+)"/g,'from "./$1.mjs"');
  await writeFile(resolve(directory,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 }
 const load=name=>import(pathToFileURL(resolve(directory,name+'.mjs')));
 return {db:await load('db'),service:await load('service'),auth:await load('auth-store'),identity:await load('identity')};
}
