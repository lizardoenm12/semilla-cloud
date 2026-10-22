"""Publicación CI limitada a la imagen de una aplicación existente."""
import copy, json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def validate_image(config,image):
 if not re.fullmatch(re.escape(config['registryServer'])+r'/asistente-negocios:[0-9a-f]{40}',image):raise ValueError('Imagen no válida')
 return image.rsplit(':',1)[1]

def build_template(app,image,release):
 template=copy.deepcopy(app['properties']['template'])
 if template['scale']['minReplicas']!=0 or template['scale']['maxReplicas']!=1:raise ValueError('Escala inesperada: revisar antes de publicar')
 if app['properties']['configuration']['activeRevisionsMode']!='Single':raise ValueError('Se requiere modo Single')
 containers=template['containers']
 if len(containers)!=1 or containers[0]['resources']['cpu']!=0.5 or containers[0]['resources']['memory']!='1Gi':raise ValueError('Recursos inesperados')
 template.pop('revisionSuffix',None);containers[0]['image']=image
 env=containers[0].setdefault('env',[])
 for name,value in [('APP_RELEASE',release),('OBSERVABILITY_ENABLED','1')]:
  env[:]=[entry for entry in env if entry['name']!=name];env.append({'name':name,'value':value})
 return template

def smoke(base,release):
 for attempt in range(5):
  try:
   with urllib.request.urlopen(base+'/api/health',timeout=30) as response:
    payload=json.load(response)
    if payload.get('status')!='ok' or payload.get('release')!=release:raise RuntimeError('La revisión pública no coincide')
   with urllib.request.urlopen(base+'/',timeout=30) as response:
    if response.status!=200 or 'Iniciar sesión con' not in response.read().decode('utf-8'):raise RuntimeError('Acceso público incorrecto')
   try:
    urllib.request.urlopen(base+'/api/local/bootstrap',timeout=30)
    raise RuntimeError('La API privada permitió acceso sin sesión')
   except urllib.error.HTTPError as error:
    if error.code!=401:raise RuntimeError('Rechazo de sesión inesperado')
   return {'health':200,'releaseMatches':True,'login':200,'privateApiWithoutSession':401}
  except Exception:
   if attempt==4:raise
   time.sleep(10)

def main():
 config=json.loads((ROOT/'infra/deployment.json').read_text(encoding='utf-8'));image=sys.argv[1];release=validate_image(config,image)
 if os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('GITHUB_REF')!='refs/heads/main' or os.environ.get('GITHUB_SHA')!=release:raise RuntimeError('Solo ejecutar desde CI de la rama main con la imagen de este commit')
 def az(args):
  r=subprocess.run(['az']+args+['--only-show-errors','-o','json'],capture_output=True,text=True,timeout=180)
  if r.returncode:raise RuntimeError('Azure no pudo consultar o actualizar la app, sin imprimir configuración privada')
  return json.loads(r.stdout) if r.stdout.strip() else {}
 account=az(['account','show'])
 if account['id']!=config['subscriptionId'] or account['state']!='Enabled':raise RuntimeError('Suscripción incorrecta o inactiva')
 url=f"https://management.azure.com/subscriptions/{config['subscriptionId']}/resourceGroups/{config['resourceGroup']}/providers/Microsoft.App/containerApps/{config['appName']}?api-version=2025-01-01"
 app=az(['rest','--method','get','--url',url]);previous=copy.deepcopy(app['properties']['template']);template=build_template(app,image,release)
 def patch(value):
  with tempfile.TemporaryDirectory(prefix='deploy-') as temp:
   file=Path(temp)/'patch.json';file.write_text(json.dumps({'properties':{'template':value}}),encoding='utf-8');az(['rest','--method','patch','--url',url,'--body','@'+str(file)])
 try:
  patch(template)
  for attempt in range(60):
   app=az(['rest','--method','get','--url',url]);properties=app['properties']
   if properties.get('provisioningState') in ['Failed','Canceled']:raise RuntimeError('La nueva revisión falló')
   if properties.get('provisioningState')=='Succeeded' and properties.get('latestReadyRevisionName')==properties.get('latestRevisionName'):
    if properties['template']['containers'][0]['image']!=image:raise RuntimeError('Otra imagen reemplazó este despliegue')
    verification=smoke(config['baseUrl'],release);break
   if attempt%3==0:print('Esperando revisión de desarrollo',flush=True)
   time.sleep(10)
  else:raise RuntimeError('La revisión no quedó lista a tiempo')
 except Exception:
  # No crear, borrar, cambiar roles, escalar ni tocar base o firewall.
  current=az(['rest','--method','get','--url',url])
  if current['properties']['template']['containers'][0]['image']==image:
   previous.pop('revisionSuffix',None);patch(previous);print('Restauración de la imagen anterior solicitada',flush=True)
  raise
 evidence={'commit':release,'image':image,'revision':properties['latestReadyRevisionName'],'url':config['baseUrl'],'previousImage':previous['containers'][0]['image'],'automaticDeployment':True,'verification':verification,'databaseOrFirewallModified':False,'minReplicas':0,'maxReplicas':1}
 (ROOT/'evidencias').mkdir(exist_ok=True);(ROOT/'evidencias/cicd-despliegue.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
 print('DEPLOYMENT_EVIDENCE='+json.dumps(evidence),flush=True)
 summary=os.environ.get('GITHUB_STEP_SUMMARY')
 if summary:
  with open(summary,'a',encoding='utf-8') as file:file.write('## Despliegue automático verificado\n\n'+config['baseUrl']+'\n\nCommit: '+release+'\n\nHTTPS 200, versión correcta y API privada 401. Base y firewall conservados.\n')

if __name__=='__main__':main()
