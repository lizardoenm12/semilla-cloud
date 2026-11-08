"""Instala el secreto OAuth solo con autorización del propietario del cliente."""
import argparse, json, subprocess, tempfile, uuid
from pathlib import Path
import importlib.util

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('cliente',type=Path,help='JSON privado del cliente OAuth web')
 parser.add_argument('--autorizado',action='store_true',required=True,help='El propietario autorizó guardar el secreto en la nueva suscripción')
 parser.add_argument('--callback-guardado',action='store_true',required=True,help='El callback nuevo ya está registrado en Google')
 args=parser.parse_args()
 source=Path(__file__).with_name('configurar-operacion.py')
 spec=importlib.util.spec_from_file_location('ops',source);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 if m.SUB!='48f96e93-6c3a-4f8a-bfd6-afab746a48f5' or m.RG!='rg-asistente-negocios-m2':raise RuntimeError('Suscripción o grupo inesperado')
 m.check()
 try:
  web=json.loads(args.cliente.read_text(encoding='utf-8-sig'))['web']
  client=web['client_id'];secret=web['client_secret']
  if not isinstance(secret,str) or len(secret)<16:raise ValueError()
 except (OSError,ValueError,KeyError,TypeError):raise RuntimeError('Archivo OAuth web no válido; se omiten los detalles privados') from None
 app=m.rest('get',m.APP,'2025-01-01')
 env=app['properties']['template']['containers'][0]['env']
 settings={x['name']:x.get('value') for x in env}
 vault='kv-asistneg-10336';name='asistente-google-client-secret'
 if settings.get('AZURE_KEY_VAULT_NAME')!=vault or settings.get('GOOGLE_CLIENT_SECRET_KEY_VAULT_SECRET')!=name or settings.get('GOOGLE_CLIENT_ID')!=client:raise RuntimeError('El archivo no coincide con el cliente configurado en esta app')
 principal=m.az(['identity','show','-g',m.RG,'-n','identidad-negocios-m2'])['principalId']
 vault_id=m.az(['keyvault','show','-g',m.RG,'-n',vault])['id']
 with tempfile.TemporaryDirectory(dir=m.ROOT/'.data/private') as tmp:
  f=Path(tmp)/'secret';f.write_text(secret,encoding='utf-8')
  result=subprocess.run(m.CLI+['keyvault','secret','set','--vault-name',vault,'--name',name,'--file',str(f),'--encoding','utf-8','--output','none','--only-show-errors'],capture_output=True,timeout=90)
  if result.returncode:raise RuntimeError('No se pudo guardar el secreto OAuth; no se muestran valores')
 scope=vault_id+'/secrets/'+name
 role='4633458b-17de-408a-b874-0445c86b69e6'
 assignment=str(uuid.uuid5(uuid.NAMESPACE_URL,scope+principal+role))
 m.rest('put',scope+'/providers/Microsoft.Authorization/roleAssignments/'+assignment,'2022-04-01',{'properties':{'principalId':principal,'principalType':'ServicePrincipal','roleDefinitionId':f'/subscriptions/{m.SUB}/providers/Microsoft.Authorization/roleDefinitions/{role}'}})
 print('Secreto OAuth configurado con acceso limitado a la identidad de la app. Falta comprobar el inicio interactivo.')

if __name__=='__main__':main()
