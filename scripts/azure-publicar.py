"""Despliegue pequeño e idempotente. No almacena contraseñas ni modifica el plan de pago."""
import subprocess,json,time,uuid,sys
from pathlib import Path
CLI=[r'C:\Program Files\Microsoft SDKs\Azure\CLI2\python.exe','-m','azure.cli'] if sys.platform=='win32' else ['az']
ROOT=Path(__file__).resolve().parents[1];RG='rg-asistente-negocios-m2';REGION='northcentralus';APP='app-asistente-negocios-dev';ENV='cae-cloud-dev';ACR='acrasistneg48f96e93'
def az(args,optional=False):
 r=subprocess.run(CLI+args+['--only-show-errors','-o','json'],capture_output=True,text=True,timeout=1800 if args[:3]==['deployment','group','create'] else 600)
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
if SUB!='48f96e93-6c3a-4f8a-bfd6-afab746a48f5' or account['state']!='Enabled' or policy.get('quotaId')!='AzureForStudents_2018-01-01' or policy.get('spendingLimit')!='On':raise RuntimeError('Revisar plan y límite antes de continuar; no se modificaron')
identity=az(['identity','show','-g',RG,'-n','identidad-negocios-m2'])
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
 rest('put',build['id']+'/federatedIdentityCredentials/github-main?api-version=2023-01-31',{'properties':{'issuer':'https://token.actions.githubusercontent.com','subject':'repo:lizardoenm12@158477878/semilla-cloud@1423989886:ref:refs/heads/main','audiences':['api://AzureADTokenExchange']}})
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
elif phase in ['app','network']:
 config=json.loads((ROOT/'infra'/'deployment.json').read_text(encoding='utf-8'))
 image=sys.argv[2]
 if not image.startswith(config['registryServer']+'/asistente-negocios:') or len(image.split(':')[-1])!=40:raise RuntimeError('Usar imagen del registro y SHA de commit completo')
 # Leer solo datos públicos de la configuración privada; no copiar secretos a Azure env.
 result=subprocess.run(['node','--input-type=module','-e',"process.loadEnvFile('.env.local');console.log(JSON.stringify({client:process.env.GOOGLE_CLIENT_ID}))"],cwd=ROOT,capture_output=True,text=True,check=True)
 client=json.loads(result.stdout)['client']
 variables={'APP_MODE':'cloud','AUTH_MODE':'google','AUTH_BASE_URL':config['baseUrl'],'GOOGLE_CLIENT_ID':client,'GOOGLE_CLIENT_SECRET_KEY_VAULT_SECRET':'asistente-google-client-secret','DATABASE_PROVIDER':'postgres','DATABASE_URL_KEY_VAULT_SECRET':'asistente-postgresql-url','AZURE_KEY_VAULT_NAME':'kv-asistneg-10336','AZURE_CLIENT_ID':identity['clientId'],'AZURE_STORAGE_ACCOUNT':'stasistneg294110766','AZURE_STORAGE_CONTAINER':'comprobantes','ATTACHMENT_STORAGE':'azure','NEXT_TELEMETRY_DISABLED':'1'}
 app_path=BASE+'Microsoft.App/containerApps/'+APP+'?api-version=2025-01-01'
 payload={'location':REGION,'identity':{'type':'UserAssigned','userAssignedIdentities':{identity['id']:{}}},'properties':{'managedEnvironmentId':config['environmentId'],'workloadProfileName':'Consumption','configuration':{'activeRevisionsMode':'Single','ingress':{'external':True,'targetPort':8080,'transport':'auto','allowInsecure':False,'traffic':[{'latestRevision':True,'weight':100}]},'registries':[{'server':config['registryServer'],'identity':identity['id']}]},'template':{'containers':[{'name':'app','image':image,'env':[{'name':k,'value':v} for k,v in variables.items()],'resources':{'cpu':0.5,'memory':'1Gi'},'probes':[{'type':'Startup','httpGet':{'path':'/api/health','port':8080},'periodSeconds':10,'timeoutSeconds':3,'failureThreshold':30},{'type':'Readiness','httpGet':{'path':'/api/health','port':8080},'periodSeconds':10,'timeoutSeconds':3,'failureThreshold':3},{'type':'Liveness','httpGet':{'path':'/api/health','port':8080},'periodSeconds':30,'timeoutSeconds':3,'failureThreshold':3}]}],'scale':{'minReplicas':0,'maxReplicas':1,'rules':[{'name':'http','http':{'metadata':{'concurrentRequests':'10'}}}]}}}}
 print('Preparando app y acceso de red, sin ampliar el límite de réplicas',flush=True)
 if phase=='app':rest('put',app_path,payload)
 app=ready(app_path)
 actual='https://'+app['properties']['configuration']['ingress']['fqdn']
 if actual!=config['baseUrl']:raise RuntimeError('El dominio no coincide; revisar AUTH_BASE_URL antes de habilitar Google')
 ips=app['properties'].get('outboundIpAddresses',[])
 if not ips:raise RuntimeError('No se pudieron determinar las IP de salida; no se abrirá PostgreSQL a todas las redes')
 # Un despliegue ARM incremental aplica las reglas pendientes sin borrar las demás.
 import ipaddress
 existing=az(['postgres','flexible-server','firewall-rule','list','-g',RG,'--server-name','pg-asistneg-10584'])
 rules=[]
 for index,ip in enumerate(ips):
  ipaddress.IPv4Address(ip);name=f'container-app-{index+1}'
  if any(r['name']==name and r['startIpAddress']==ip and r['endIpAddress']==ip for r in existing):continue
  rules.append({'type':'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules','apiVersion':'2025-08-01','name':'pg-asistneg-10584/'+name,'properties':{'startIpAddress':ip,'endIpAddress':ip}})
 if rules:
  network_template={'$schema':'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#','contentVersion':'1.0.0.0','resources':rules}
  template_file=ROOT/'tmp'/'postgres-egress.arm.json';template_file.write_text(json.dumps(network_template),encoding='utf-8')
  print(f'Configurando {len(rules)} reglas exactas pendientes',flush=True)
  try:
   az(['deployment','group','create','-g',RG,'-n','asistente-postgres-egress','--template-file',str(template_file),'--mode','Incremental'])
  except RuntimeError as error:
   if 'GatewayTimeout' not in str(error):raise
   applied=az(['postgres','flexible-server','firewall-rule','list','-g',RG,'--server-name','pg-asistneg-10584'])
   remaining=[r for r in rules if not any(e['name']==r['name'].split('/')[-1] and e['startIpAddress']==r['properties']['startIpAddress'] and e['endIpAddress']==r['properties']['endIpAddress'] for e in applied)]
   if len(remaining)>8:raise RuntimeError('Demasiadas reglas pendientes; revisar el estado de Azure antes de repetir') from None
   for rule in remaining:
    print('Recuperando regla con GatewayTimeout: '+rule['name'].split('/')[-1],flush=True)
    az(['postgres','flexible-server','firewall-rule','create','-g',RG,'--server-name','pg-asistneg-10584','--name',rule['name'].split('/')[-1],'--start-ip-address',rule['properties']['startIpAddress'],'--end-ip-address',rule['properties']['endIpAddress']])
 verified=az(['postgres','flexible-server','firewall-rule','list','-g',RG,'--server-name','pg-asistneg-10584'])
 for index,ip in enumerate(ips):
  if not any(r['name']==f'container-app-{index+1}' and r['startIpAddress']==ip and r['endIpAddress']==ip for r in verified):raise RuntimeError('Falta verificar una regla de salida')
 previous=ROOT/'evidencias'/'publicacion-real.json'
 confirmed=json.loads(previous.read_text(encoding='utf-8')) if previous.exists() else {}
 (ROOT/'evidencias'/'container-app-despliegue.json').write_text(json.dumps({'url':actual,'image':image,'region':REGION,'cpu':0.5,'memory':'1Gi','minReplicas':0,'maxReplicas':1,'identity':'identidad-negocios-m2','registryAdminEnabled':False,'postgresFirewallIps':len(ips),'spendingLimit':'On','logsDestination':'none','googleCallbackPendienteVerificar':not bool(confirmed.get('googleConfirmacionUTC') and confirmed.get('url')==actual)},indent=2),encoding='utf-8')
 print(json.dumps({'publicada':True,'url':actual,'reglasPostgresVerificadas':len(ips)}),flush=True)
else:raise RuntimeError('Fase no implementada')
