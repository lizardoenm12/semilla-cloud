"""Actualiza solo la imagen de la app existente; conserva configuración y datos."""
import subprocess,json,sys,re,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
config=json.loads((ROOT/'infra/deployment.json').read_text(encoding='utf-8'))
image=sys.argv[1]
if not re.fullmatch(re.escape(config['registryServer'])+r'/asistente-negocios:[0-9a-f]{40}',image):raise RuntimeError('Imagen no válida')
cli=[r'C:\Program Files\Microsoft SDKs\Azure\CLI2\python.exe','-m','azure.cli'] if sys.platform=='win32' else ['az']
def az(args):
 result=subprocess.run(cli+args+['--only-show-errors','-o','json'],capture_output=True,text=True,timeout=180)
 if result.returncode:raise RuntimeError('No se pudo actualizar o consultar la app; revisar Azure sin imprimir credenciales')
 return json.loads(result.stdout) if result.stdout.strip() else {}
account=az(['account','show'])
if account['id']!=config['subscriptionId']:raise RuntimeError('Suscripción distinta a la del proyecto')
url=f"https://management.azure.com/subscriptions/{account['id']}/resourceGroups/{config['resourceGroup']}/providers/Microsoft.App/containerApps/{config['appName']}?api-version=2025-01-01"
policy=az(['rest','--method','get','--url',f"https://management.azure.com/subscriptions/{account['id']}?api-version=2022-12-01"])
if policy['subscriptionPolicies'].get('spendingLimit')!='On':raise RuntimeError('Revisar límite de gasto antes de continuar')
app=az(['rest','--method','get','--url',url]);previous=app['properties']['template']['containers'][0]['image']
template=app['properties']['template'];template.pop('revisionSuffix',None);template['containers'][0]['image']=image
payload=ROOT/'tmp'/'actualizar-imagen.json';payload.write_text(json.dumps({'properties':{'template':template}}),encoding='utf-8')
az(['rest','--method','patch','--url',url,'--body','@'+str(payload)])
for attempt in range(60):
 app=az(['rest','--method','get','--url',url]);properties=app['properties'];state=properties.get('provisioningState')
 if state in ['Failed','Canceled']:raise RuntimeError('Nueva revisión no disponible; revisar la imagen antes de reemplazar la revisión anterior')
 if state=='Succeeded' and properties.get('latestReadyRevisionName')==properties.get('latestRevisionName'):
  assert properties['template']['containers'][0]['image']==image
  evidence={'previousImage':previous,'image':image,'url':config['baseUrl'],'revision':properties['latestReadyRevisionName'],'minReplicas':properties['template']['scale']['minReplicas'],'maxReplicas':properties['template']['scale']['maxReplicas'],'databaseOrFirewallModified':False,'spendingLimit':'On'}
  (ROOT/'evidencias'/'actualizacion-imagen.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8');print(json.dumps(evidence),flush=True);break
 if attempt%3==0:print('Esperando nueva revisión: '+str(state),flush=True)
 time.sleep(10)
else:raise RuntimeError('Revisar nueva revisión; no se modificaron datos ni firewall')
