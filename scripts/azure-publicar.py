"""Despliegue pequeño e idempotente. No almacena contraseñas ni modifica el plan de pago."""
import subprocess,json,time,uuid,sys
from pathlib import Path
CLI=[r'C:\Program Files\Microsoft SDKs\Azure\CLI2\python.exe','-m','azure.cli'] if sys.platform=='win32' else ['az']
ROOT=Path(__file__).resolve().parents[1];RG='rg-cloud-dev';REGION='centralus';APP='app-asistente-negocios-dev';ENV='cae-cloud-dev';ACR='acrcloudlizardo01'
def az(args,optional=False):
 r=subprocess.run(CLI+args+['--only-show-errors','-o','json'],capture_output=True,text=True,timeout=600)
 if r.returncode:
  if optional:return None
  raise RuntimeError(r.stderr[-2500:])
 return json.loads(r.stdout) if r.stdout.strip() else {}
def rest(method,path,body=None,optional=False):
 args=['rest','--method',method,'--url','https://management.azure.com'+path]
 if body is not None:
  file=ROOT/'tmp'/'azure-request.json';file.parent.mkdir(exist_ok=True);file.write_text(json.dumps(body),encoding='utf-8');args+=['--body','@'+str(file)]
 return az(args,optional)
def ready(path):
 for attempt in range(120):
  result=rest('get',path);state=result.get('properties',{}).get('provisioningState')
  if state in ['Succeeded','Ready']:return result
  if state in ['Failed','Canceled']:raise RuntimeError('Aprovisionamiento no completado: '+json.dumps(result.get('properties',{}).get('deploymentErrors',state)))
  if attempt%6==0:print('Esperando recurso: '+str(state),flush=True)
  time.sleep(10)
 raise RuntimeError('Tiempo de aprovisionamiento agotado; revisar recurso antes de repetir')
account=az(['account','show']);SUB=account['id'];BASE=f'/subscriptions/{SUB}/resourceGroups/{RG}/providers/'
policy=rest('get',f'/subscriptions/{SUB}?api-version=2022-12-01')['subscriptionPolicies']
if policy.get('quotaId')!='FreeTrial_2014-09-01' or policy.get('spendingLimit')!='On':raise RuntimeError('Revisar plan y límite antes de continuar; no se modificaron')
identity=az(['identity','show','-g',RG,'-n','id-cloud-app-dev'])
def role(principal,scope,role_id):
 rid=str(uuid.uuid5(uuid.NAMESPACE_URL,scope+principal+role_id))
 return rest('put',scope+'/providers/Microsoft.Authorization/roleAssignments/'+rid+'?api-version=2022-04-01',{'properties':{'principalId':principal,'principalType':'ServicePrincipal','roleDefinitionId':f'/subscriptions/{SUB}/providers/Microsoft.Authorization/roleDefinitions/{role_id}'}})
phase=sys.argv[1] if len(sys.argv)>1 else 'prepare'
if phase=='prepare':
 for provider in ['Microsoft.App','Microsoft.ContainerRegistry']:
  print('Registrando proveedor '+provider,flush=True);az(['provider','register','--namespace',provider,'--wait'])
 acr_path=BASE+'Microsoft.ContainerRegistry/registries/'+ACR+'?api-version=2023-07-01'
 if not rest('get',acr_path,optional=True):
  print('Creando un registro Basic, administrador deshabilitado',flush=True)
  rest('put',acr_path,{'location':REGION,'sku':{'name':'Basic'},'properties':{'adminUserEnabled':False,'publicNetworkAccess':'Enabled'}})
 registry=ready(acr_path)
 build=az(['identity','show','-g',RG,'-n','id-cloud-build-dev'],optional=True)
 if not build:build=az(['identity','create','-g',RG,'-n','id-cloud-build-dev','-l',REGION])
 rest('put',build['id']+'/federatedIdentityCredentials/github-main?api-version=2023-01-31',{'properties':{'issuer':'https://token.actions.githubusercontent.com','subject':'repo:lizardoenm12/semilla-cloud:ref:refs/heads/main','audiences':['api://AzureADTokenExchange']}})
 role(build['principalId'],registry['id'],'8311e382-0749-4cb8-b61a-304f252e45ec')
 role(identity['principalId'],registry['id'],'7f951dda-4ed3-4680-a7ca-43fe172d538d')
 env_path=BASE+'Microsoft.App/managedEnvironments/'+ENV+'?api-version=2025-01-01'
 if not rest('get',env_path,optional=True):
  print('Creando entorno Consumption sin Log Analytics adicional',flush=True)
  rest('put',env_path,{'location':REGION,'properties':{'workloadProfiles':[{'name':'Consumption','workloadProfileType':'Consumption'}]}})
 environment=ready(env_path)
 config={'resourceGroup':RG,'region':REGION,'appName':APP,'environmentId':environment['id'],'registry':ACR,'registryServer':registry['properties']['loginServer'],'runtimeIdentityId':identity['id'],'runtimeClientId':identity['clientId'],'buildClientId':build['clientId'],'tenantId':account['tenantId'],'subscriptionId':SUB,'baseUrl':'https://'+APP+'.'+environment['properties']['defaultDomain']}
 (ROOT/'infra'/'deployment.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
 print(json.dumps({'preparado':True,'urlPrevista':config['baseUrl'],'registro':ACR,'plan':'Consumption','limiteGasto':policy['spendingLimit']}),flush=True)
elif phase=='app':
 config=json.loads((ROOT/'infra'/'deployment.json').read_text(encoding='utf-8'))
 image=sys.argv[2]
 if not image.startswith(config['registryServer']+'/asistente-negocios:') or len(image.split(':')[-1])!=40:raise RuntimeError('Usar imagen del registro y SHA de commit completo')
 # Leer solo datos públicos de la configuración privada; no copiar secretos a Azure env.
 result=subprocess.run(['node','--input-type=module','-e',"process.loadEnvFile('.env.local');console.log(JSON.stringify({client:process.env.GOOGLE_CLIENT_ID}))"],cwd=ROOT,capture_output=True,text=True,check=True)
 client=json.loads(result.stdout)['client']
 variables={'APP_MODE':'cloud','AUTH_MODE':'google','AUTH_BASE_URL':config['baseUrl'],'GOOGLE_CLIENT_ID':client,'GOOGLE_CLIENT_SECRET_KEY_VAULT_SECRET':'asistente-google-client-secret','DATABASE_PROVIDER':'postgres','DATABASE_URL_KEY_VAULT_SECRET':'asistente-postgresql-url','AZURE_KEY_VAULT_NAME':'kv-cloud-lizardo-dev','AZURE_CLIENT_ID':identity['clientId'],'AZURE_STORAGE_ACCOUNT':'stclouddevlizardo01','AZURE_STORAGE_CONTAINER':'comprobantes','ATTACHMENT_STORAGE':'azure','NEXT_TELEMETRY_DISABLED':'1'}
 app_path=BASE+'Microsoft.App/containerApps/'+APP+'?api-version=2025-01-01'
 payload={'location':REGION,'identity':{'type':'UserAssigned','userAssignedIdentities':{identity['id']:{}}},'properties':{'managedEnvironmentId':config['environmentId'],'workloadProfileName':'Consumption','configuration':{'activeRevisionsMode':'Single','ingress':{'external':True,'targetPort':8080,'transport':'auto','allowInsecure':False,'traffic':[{'latestRevision':True,'weight':100}]},'registries':[{'server':config['registryServer'],'identity':identity['id']}]},'template':{'containers':[{'name':'app','image':image,'env':[{'name':k,'value':v} for k,v in variables.items()],'resources':{'cpu':0.5,'memory':'1Gi'},'probes':[{'type':'Startup','httpGet':{'path':'/api/health','port':8080},'periodSeconds':10,'timeoutSeconds':3,'failureThreshold':30},{'type':'Readiness','httpGet':{'path':'/api/health','port':8080},'periodSeconds':10,'timeoutSeconds':3,'failureThreshold':3},{'type':'Liveness','httpGet':{'path':'/api/health','port':8080},'periodSeconds':30,'timeoutSeconds':3,'failureThreshold':3}]}],'scale':{'minReplicas':0,'maxReplicas':1,'rules':[{'name':'http','http':{'metadata':{'concurrentRequests':'10'}}}]}}}}
 print('Publicando una app de 0.5 vCPU y 1 GiB, mínimo cero, máximo una réplica',flush=True)
 rest('put',app_path,payload);app=ready(app_path)
 actual='https://'+app['properties']['configuration']['ingress']['fqdn']
 if actual!=config['baseUrl']:raise RuntimeError('El dominio no coincide; revisar AUTH_BASE_URL antes de habilitar Google')
 ips=app['properties'].get('outboundIpAddresses',[])
 if not ips:raise RuntimeError('No se pudieron determinar las IP de salida; no se abrirá PostgreSQL a todas las redes')
 for index,ip in enumerate(ips):
  import ipaddress
  ipaddress.IPv4Address(ip)
  az(['postgres','flexible-server','firewall-rule','create','-g',RG,'--name',f'container-app-{index+1}','--server-name','pg-cloud-lizardo-dev','--start-ip-address',ip,'--end-ip-address',ip])
 (ROOT/'evidencias'/'container-app-despliegue.json').write_text(json.dumps({'url':actual,'image':image,'region':REGION,'cpu':0.5,'memory':'1Gi','minReplicas':0,'maxReplicas':1,'identity':'id-cloud-app-dev','registryAdminEnabled':False,'postgresFirewallIps':len(ips),'spendingLimit':'On','logsDestination':'none','googleCallbackPendienteVerificar':True},indent=2),encoding='utf-8')
 print(json.dumps({'publicada':True,'url':actual,'reglasPostgresAgregadas':len(ips)}),flush=True)
else:raise RuntimeError('Fase no implementada')
