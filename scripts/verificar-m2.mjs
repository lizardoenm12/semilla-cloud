// Node 22+. Prueba REAL contra la URL indicada; crea un comprobante sintético.
// URL=https://... DEMO_TOKEN=<en entorno, no en historial> node scripts/verificar-m2.mjs
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = new URL(process.env.URL ?? '');
assert.equal(base.protocol, 'https:', 'Usa la URL HTTPS desplegada');
assert(!base.username && !base.password && !base.search, 'URL sin credenciales ni query');
const token = process.env.DEMO_TOKEN;
assert(token?.length >= 32, 'Falta DEMO_TOKEN de 32+ caracteres en el entorno');
const evidence = { fechaUTC: new Date().toISOString(), url: base.origin, resultados: [] };
const result = (prueba, detalle) => { evidence.resultados.push({ prueba, ok: true, detalle }); console.log(`OK: ${prueba}`); };
async function call(path, method = 'GET', auth = true) {
  return fetch(new URL(path, base), { method, redirect: 'error',
    headers: auth ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(60000) });
}
try {
  assert.equal((await call('/api/health', 'GET', false)).status, 200); result('health 200');
  assert.equal((await call('/api/comprobantes', 'POST', false)).status, 401); result('creación sin token 401');
  assert.equal((await call('/api/comprobantes', 'GET', false)).status, 401); result('listado sin token 401');
  const made = await call('/api/comprobantes', 'POST'); assert.equal(made.status, 201);
  const first = await made.json(); assert.equal(first.comprobante.total_gtq, 50);
  const { id } = first.comprobante;
  assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
  result('creación 201 y total Q50', { id, objeto: first.objeto });
  const recovered = await call(`/api/comprobantes?id=${encodeURIComponent(id)}`); assert.equal(recovered.status, 200);
  assert.deepEqual(await recovered.json(), first); result('lectura posterior del mismo contenido');
  assert.equal((await call(`/api/comprobantes?id=${id}`, 'GET', false)).status, 401); result('lectura sin token 401');
  assert.equal((await call('/api/comprobantes?id=invalido')).status, 400); result('identificador inválido 400');
  const status = await call('/api/estado'); assert.equal(status.status, 200);
  const state = await status.json(); assert.equal(state.storage.ok, true);
  assert.equal(state.compute.entornoDetectado, true); result('entorno Azure detectado y listado autorizado', state);
  assert.match(state.storage.account, /^[a-z0-9]{3,24}$/);
  assert.match(state.storage.container, /^[a-z0-9-]{3,63}$/);
  assert.equal(first.objeto, `comprobantes-demo/${id}.json`);
  const anonymous = await fetch(`https://${state.storage.account}.blob.core.windows.net/${state.storage.container}/${first.objeto}`, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  const code = anonymous.headers.get('x-ms-error-code');
  assert([401,403,404,409].includes(anonymous.status) && ['PublicAccessNotPermitted','ResourceNotFound','NoAuthenticationInformation','AuthorizationFailure','AuthenticationFailed'].includes(code), `Respuesta anónima inesperada: ${anonymous.status}, ${code}`);
  result('acceso anónimo al objeto rechazado por Azure', { status: anonymous.status, codigoAzure: code });
  evidence.comprobante = first;
  evidence.pendiente = ['Verificar allowBlobPublicAccess=false y publicAccess=None mediante Azure Portal/CLI', 'Verificar objeto en el portal y log con el mismo ID', 'Verificar suscripción, región y revisión mediante CLI'];
  evidence.pruebasHTTP = 'aprobadas; completar las evidencias administrativas indicadas';
} catch (err) {
  evidence.pruebasHTTP = 'fallidas';
  evidence.error = err instanceof assert.AssertionError ? err.message : 'Solicitud fallida; revisar conexión, URL y configuración sin exponer el token';
  console.error(evidence.error); process.exitCode = 1;
} finally {
  await writeFile('evidencia-http-m2.json', JSON.stringify(evidence, null, 2));
  console.log('Salida guardada en evidencia-http-m2.json. No contiene el token.');
}
