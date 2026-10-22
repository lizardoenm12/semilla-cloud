"""Configura Monitor pequeño e identidad CI/CD sin leer datos del negocio."""
import json, subprocess, sys, uuid, tempfile, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CONFIG=json.loads((ROOT/'infra/deployment.json').read_text(encoding='utf-8'))
MON=json.loads((ROOT/'infra/observabilidad.json').read_text(encoding='utf-8'))
CLI=[r'C:\Program Files\Microsoft SDKs\Azure\CLI2\python.exe','-m','azure.cli'] if sys.platform=='win32' else ['az']
SUB=CONFIG['subscriptionId']; RG=CONFIG['resourceGroup']
BASE=f'/subscriptions/{SUB}/resourceGroups/{RG}'
ARM='https://management.azure.com'
APP=BASE+'/providers/Microsoft.App/containerApps/'+CONFIG['appName']
WORKSPACE=BASE+'/providers/Microsoft.OperationalInsights/workspaces/'+MON['workspaceName']

def az(args,optional=False):
 r=subprocess.run(CLI+args+['--only-show-errors','-o','json'],capture_output=True,text=True,timeout=600)
 if r.returncode:
  if optional and any(x in r.stderr for x in ['ResourceNotFound','NotFound','ResourceGroupNotFound']):return None
  # Ningún payload, token, clave ni respuesta de negocio se imprime.
  raise RuntimeError('Azure rechazó '+args[0]+' '+args[1]+'; '+r.stderr[:350])
 return json.loads(r.stdout) if r.stdout.strip() else {}

def rest(method,resource,version,body=None,optional=False):
 args=['rest','--method',method,'--url',ARM+resource+'?api-version='+version]
 if body is None:return az(args,optional)
 (ROOT/'tmp').mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='operacion-',dir=ROOT/'tmp') as temp:
  file=Path(temp)/'body.json';file.write_text(json.dumps(body),encoding='utf-8')
  return az(args+['--body','@'+str(file)],optional)

def check():
 a=az(['account','show'])
 if a['id']!=SUB or a['state']!='Enabled':raise RuntimeError('Suscripción incorrecta o inactiva')
 policy=rest('get','/subscriptions/'+SUB,'2022-12-01')
 if policy['subscriptionPolicies'].get('spendingLimit')!='On':raise RuntimeError('Revisar límite de gasto antes de continuar')

def monitoring():
 for namespace in ['Microsoft.OperationalInsights','Microsoft.Insights']:
  if az(['provider','show','--namespace',namespace]).get('registrationState')!='Registered':
   print('Registrando '+namespace,flush=True);az(['provider','register','--namespace',namespace,'--wait'])
 print('Configurando un workspace sin compromiso de capacidad',flush=True)
 workspace=rest('put',WORKSPACE,'2025-02-01',{'location':MON['region'],'tags':{'project':'asistente-negocios','environment':'dev'},'properties':{'sku':{'name':'PerGB2018'},'retentionInDays':MON['retentionDays'],'workspaceCapping':{'dailyQuotaGb':MON['dailyQuotaGb']},'features':{'disableLocalAuth':True},'publicNetworkAccessForIngestion':'Enabled','publicNetworkAccessForQuery':'Enabled'}})
 env=rest('get',CONFIG['environmentId'],'2025-01-01')
 if env['properties'].get('appLogsConfiguration',{}).get('destination')!='azure-monitor':
  rest('patch',CONFIG['environmentId'],'2025-01-01',{'properties':{'appLogsConfiguration':{'destination':'azure-monitor'}}})
 rest('put',CONFIG['environmentId']+'/providers/Microsoft.Insights/diagnosticSettings/asistente-logs','2021-05-01-preview',{'properties':{'workspaceId':WORKSPACE,'logAnalyticsDestinationType':'Dedicated','logs':[{'category':x,'enabled':True} for x in MON['categories']]}})
 # Solo logs de consola y plataforma. No guardar rutas OAuth ni cuerpos HTTP de ingreso.
 evidence={'workspaceId':WORKSPACE,'workspaceCustomerId':workspace['properties']['customerId'],'region':MON['region'],'retentionDays':MON['retentionDays'],'dailyQuotaGb':MON['dailyQuotaGb'],'sku':'PerGB2018','logsDestination':'azure-monitor','categories':MON['categories'],'httpIngressLogging':False,'localAuthDisabled':True,'spendingLimit':'On','status':'logs configured; waiting for application telemetry'}
 (ROOT/'evidencias/monitor-configuracion.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
 print(json.dumps({k:evidence[k] for k in ['region','retentionDays','dailyQuotaGb','categories','status']}),flush=True)

def deployment():
 name='id-cloud-deploy-dev'
 identity=az(['identity','create','--resource-group',RG,'--name',name,'--location',CONFIG['region']])
 role_id=str(uuid.uuid5(uuid.NAMESPACE_URL,APP+'/image-deployer-role'))
 role_resource=f'/subscriptions/{SUB}/providers/Microsoft.Authorization/roleDefinitions/{role_id}'
 actions=['Microsoft.App/containerApps/read','Microsoft.App/containerApps/write','Microsoft.App/containerApps/revisions/read']
 rest('put',role_resource,'2022-04-01',{'properties':{'roleName':'Asistente Negocios - Publicar revision dev','description':'Actualizar la imagen de la app existente. Sin secretos, base, roles ni facturacion.','type':'CustomRole','permissions':[{'actions':actions,'notActions':[],'dataActions':[],'notDataActions':[]}],'assignableScopes':[BASE]}})
 assignment=str(uuid.uuid5(uuid.NAMESPACE_URL,APP+'|'+identity['principalId']+'|'+role_id))
 rest('put',APP+'/providers/Microsoft.Authorization/roleAssignments/'+assignment,'2022-04-01',{'properties':{'roleDefinitionId':role_resource,'principalId':identity['principalId'],'principalType':'ServicePrincipal'}})
 subject='repo:lizardoenm12@158477878/semilla-cloud@1423989886:ref:refs/heads/main'
 rest('put',identity['id']+'/federatedIdentityCredentials/github-main','2023-01-31',{'properties':{'issuer':'https://token.actions.githubusercontent.com','subject':subject,'audiences':['api://AzureADTokenExchange']}})
 CONFIG['deployClientId']=identity['clientId'];CONFIG['deployIdentityId']=identity['id']
 (ROOT/'infra/deployment.json').write_text(json.dumps(CONFIG,indent=2)+'\n',encoding='utf-8')
 evidence={'identityName':name,'clientId':identity['clientId'],'principalId':identity['principalId'],'assignmentScope':APP,'roleId':role_resource,'actions':actions,'oidcSubject':subject,'directKeyVaultAccess':False,'directDatabaseAccess':False,'spendingLimit':'On'}
 (ROOT/'evidencias/cicd-identidad.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8');print(json.dumps(evidence),flush=True)

if __name__=='__main__':
 check()
 if sys.argv[1]=='monitor':monitoring()
 elif sys.argv[1]=='deployment':deployment()
 else:raise RuntimeError('Fase desconocida')
