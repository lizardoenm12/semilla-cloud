import importlib.util, copy, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('deploy',Path(__file__).with_name('desplegar-ci.py'));deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
class DeploymentTests(unittest.TestCase):
 def setUp(self):
  self.image='registry.azurecr.io/asistente-negocios:'+('a'*40)
  self.app={'properties':{'configuration':{'activeRevisionsMode':'Single'},'template':{'revisionSuffix':'old','scale':{'minReplicas':0,'maxReplicas':1,'rules':[{'name':'http'}]},'containers':[{'name':'app','image':'old-image','resources':{'cpu':0.5,'memory':'1Gi'},'probes':[{'type':'Readiness'}],'env':[{'name':'DATABASE_URL_KEY_VAULT_SECRET','value':'test-ref'},{'name':'APP_RELEASE','value':'old'}]}]}}}
 def test_only_expected_image(self):
  cfg={'registryServer':'registry.azurecr.io'};self.assertEqual(deploy.validate_image(cfg,self.image),'a'*40)
  for bad in ['other.azurecr.io/asistente-negocios:'+('a'*40),'registry.azurecr.io/asistente-negocios:latest']:
   with self.assertRaises(ValueError):deploy.validate_image(cfg,bad)
 def test_preserves_config_and_original(self):
  original=copy.deepcopy(self.app);result=deploy.build_template(self.app,self.image,'a'*40)
  self.assertEqual(self.app,original);self.assertEqual(result['scale'],original['properties']['template']['scale']);self.assertEqual(result['containers'][0]['probes'],[{'type':'Readiness'}]);self.assertNotIn('revisionSuffix',result)
  env={v['name']:v.get('value') for v in result['containers'][0]['env']};self.assertEqual(env['DATABASE_URL_KEY_VAULT_SECRET'],'test-ref');self.assertEqual(env['APP_RELEASE'],'a'*40);self.assertEqual(env['OBSERVABILITY_ENABLED'],'1');self.assertEqual(len([v for v in result['containers'][0]['env'] if v['name']=='APP_RELEASE']),1)
 def test_rejects_scale_or_resources_changes(self):
  for location,key,value in [(self.app['properties']['template']['scale'],'maxReplicas',2),(self.app['properties']['template']['containers'][0]['resources'],'cpu',1),(self.app['properties']['configuration'],'activeRevisionsMode','Multiple')]:
   previous=location[key];location[key]=value
   with self.assertRaises(ValueError):deploy.build_template(self.app,self.image,'a'*40)
   location[key]=previous
if __name__=='__main__':unittest.main()
