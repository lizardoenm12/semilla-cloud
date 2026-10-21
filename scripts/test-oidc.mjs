import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import * as oidc from 'openid-client';
const issuer='https://issuer.example.test',clientId='11111111-1111-1111-1111-111111111111';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...publicKey.export({format:'jwk'}),kid:'test',alg:'RS256',use:'sig'};
const results=[];
function jwt(payload,badSignature=false){const header=Buffer.from(JSON.stringify({alg:'RS256',kid:'test',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify(payload)).toString('base64url'),input=header+'.'+body;const signature=sign('RSA-SHA256',Buffer.from(input),privateKey);if(badSignature)signature[0]^=1;return input+'.'+signature.toString('base64url');}
async function exchange(overrides={},options={}){
 const now=Math.floor(Date.now()/1000),claims={iss:issuer,aud:clientId,sub:'user-test',nonce:'nonce-test',iat:now,exp:now+300,...overrides};
 const config=new oidc.Configuration({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/keys',id_token_signing_alg_values_supported:['RS256']},clientId,'test-secret');
 oidc.enableNonRepudiationChecks(config);
 config[oidc.customFetch]=async(input,init)=>{
  const url=String(input);if(url===issuer+'/keys')return Response.json({keys:[jwk]});
  assert.equal(url,issuer+'/token','No llamadas a Microsoft ni a otras URL');const params=new URLSearchParams(init.body);assert.equal(params.get('code_verifier'),'verificador-pkce-test');assert.equal(params.get('code'),'codigo-prueba');
  return Response.json({access_token:'test-access',token_type:'Bearer',expires_in:300,id_token:jwt(claims,options.badSignature)});
 };
 return oidc.authorizationCodeGrant(config,new URL('http://localhost:3010/api/auth/callback?code=codigo-prueba&state='+ (options.state??'estado-test')),{pkceCodeVerifier:'verificador-pkce-test',expectedNonce:'nonce-test',expectedState:'estado-test',idTokenExpected:true});
}
const accepted=await exchange();assert.equal(accepted.claims().sub,'user-test');results.push({prueba:'JWT firmado, state, nonce y PKCE válidos',ok:true});
for(const [name,claims,options] of [['firma alterada',{}, {badSignature:true}],['emisor ajeno',{iss:'https://ajeno.invalid'},{}],['audiencia ajena',{aud:'otra-app'},{}],['nonce ajeno',{nonce:'otro'},{}],['ID token caducado',{exp:Math.floor(Date.now()/1000)-3600},{}],['state ajeno',{}, {state:'otro'}]]){await assert.rejects(()=>exchange(claims,options),name);results.push({prueba:'Rechazo de '+name,ok:true});}
await mkdir('evidencias',{recursive:true});await writeFile('evidencias/pruebas-oidc-locales.json',JSON.stringify({fechaUTC:new Date().toISOString(),alcance:'Proveedor OIDC simulado, JWT RSA firmado localmente, fetch sustituido solo en esta prueba. Sin Microsoft ni Azure.',resultados:results},null,2));console.log(results.length+' comprobaciones OIDC aprobadas con proveedor simulado, sin Azure.');
