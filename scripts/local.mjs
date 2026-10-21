import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
// Una terminal abierta antes de instalar Azure CLI puede conservar un PATH antiguo.
const cli=join(process.env.ProgramFiles??'C:/Program Files','Microsoft SDKs/Azure/CLI2/wbin');
if(process.platform==='win32'&&existsSync(join(cli,'az.cmd'))){const path=cli+';'+(process.env.PATH??process.env.Path??'');process.env.Path=path;process.env.PATH=path;}
const production=process.argv.includes('--production');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',production?'start':'dev','--hostname','127.0.0.1','--port',process.env.PORT??'3000'],{stdio:'inherit',env:{...process.env,APP_MODE:'local',NEXT_TELEMETRY_DISABLED:'1'}});
child.on('exit',code=>{process.exitCode=code??0;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
