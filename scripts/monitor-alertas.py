import importlib.util, json, re, sys, uuid, tempfile, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('setup',ROOT/'scripts/configurar-operacion.py');setup=importlib.util.module_from_spec(spec);spec.loader.exec_module(setup)
MON=setup.MON;BASE=setup.BASE;WORKSPACE=setup.WORKSPACE

def query(kql):
 evidence=json.loads((ROOT/'evidencias/monitor-configuracion.json').read_text(encoding='utf-8'));customer=evidence['workspaceCustomerId']
 with tempfile.TemporaryDirectory(prefix='query-',dir=ROOT/'tmp') as temp:
  file=Path(temp)/'query.json';file.write_text(json.dumps({'query':kql,'timespan':'PT1H'}),encoding='utf-8')
  return setup.az(['rest','--method','post','--url','https://api.loganalytics.azure.com/v1/workspaces/'+customer+'/query','--resource','https://api.loganalytics.io','--body','@'+str(file)])

def configure():
 contact=json.loads((ROOT/'.data/private/monitor-contacto.json').read_text(encoding='utf-8'));email=contact['email']
 if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+',email):raise RuntimeError('Correo no válido')
 for stem,title in [('errores','Errores de aplicación'),('rendimiento','Peticiones, errores y p95'),('versiones','Versiones y arranques')]:
  kql=(ROOT/'infra/queries'/f'{stem}.kql').read_text(encoding='utf-8')
  # Validar realmente las consultas antes de crear la regla.
  query(kql)
  setup.rest('put',WORKSPACE+'/savedSearches/asistente-'+stem,'2020-08-01',{'properties':{'category':'Asistente Negocios','displayName':title,'query':kql,'version':2}})
 ag=BASE+'/providers/Microsoft.Insights/actionGroups/'+MON['actionGroupName']
 setup.rest('put',ag,'2023-01-01',{'location':'global','properties':{'groupShortName':'AsistNeg','enabled':True,'emailReceivers':[{'name':'propietario','emailAddress':email,'useCommonAlertSchema':True}]}})
 rule=BASE+'/providers/Microsoft.Insights/scheduledQueryRules/'+MON['alertName']
 kql=(ROOT/'infra/queries/errores.kql').read_text(encoding='utf-8')
 alert=setup.rest('put',rule,'2023-12-01',{'location':MON['region'],'identity':{'type':'SystemAssigned'},'kind':'LogAlert','properties':{'displayName':'Asistente Negocios: errores del servidor','description':'Detecta eventos estructurados de error sin copiar cuerpos, nombres ni secretos.','enabled':True,'severity':MON['severity'],'evaluationFrequency':MON['evaluationFrequency'],'windowSize':MON['windowSize'],'scopes':[WORKSPACE],'targetResourceTypes':['Microsoft.OperationalInsights/workspaces'],'criteria':{'allOf':[{'query':kql,'timeAggregation':'Count','operator':'GreaterThan','threshold':0,'failingPeriods':{'numberOfEvaluationPeriods':1,'minFailingPeriodsToAlert':1}}]},'actions':{'actionGroups':[ag]},'autoMitigate':True,'skipQueryValidation':False}})
 role=setup.az(['role','definition','list','--name','Log Analytics Reader'])[0]['id']
 assignment=str(uuid.uuid5(uuid.NAMESPACE_URL,WORKSPACE+'|'+alert['identity']['principalId']+'|query'))
 setup.rest('put',WORKSPACE+'/providers/Microsoft.Authorization/roleAssignments/'+assignment,'2022-04-01',{'properties':{'roleDefinitionId':role,'principalId':alert['identity']['principalId'],'principalType':'ServicePrincipal'}})
 readback=setup.rest('get',rule,'2023-12-01');workspace=setup.rest('get',WORKSPACE,'2025-02-01')
 result={'workspaceId':WORKSPACE,'alertId':rule,'actionGroupId':ag,'enabled':readback['properties']['enabled'],'evaluationFrequency':readback['properties']['evaluationFrequency'],'windowSize':readback['properties']['windowSize'],'severity':readback['properties']['severity'],'emailConfigured':True,'emailAddressStoredInGit':False,'portalAlertsEnabled':True,'queriesValidated':True,'savedQueries':['errores','rendimiento','versiones'],'dailyQuotaGb':workspace['properties']['workspaceCapping']['dailyQuotaGb'],'retentionDays':workspace['properties']['retentionInDays'],'notificationTest':'pending','syntheticProductionErrors':0}
 (ROOT/'evidencias/monitor-alertas.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result),flush=True)

if __name__=='__main__':
 setup.check()
 if sys.argv[1]=='query':
  kql=(ROOT/'infra/queries/versiones.kql').read_text(encoding='utf-8');print(json.dumps(query(kql)),flush=True)
 elif sys.argv[1]=='configure':configure()
 else:raise RuntimeError('Fase desconocida')
