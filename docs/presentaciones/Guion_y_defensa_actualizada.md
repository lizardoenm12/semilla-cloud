# Guion y defensa de Asistente Negocios

Actualizado el 22 de octubre de 2026. Este documento acompaña `Asistente_Negocios_Arquitectura_y_Defensa.pptx` y reemplaza, para la exposición actual, los estados y costos antiguos de la presentación del 19 de octubre.

## Referencia del catedrático

Se tomó como referencia de estructura [Roastfolio, de Adrián Catalán](https://ykro1.substack.com/p/roastfolio-roasteando-un-cv-desde) y sus [diapositivas enlazadas](https://docs.google.com/presentation/d/1wy4R3QLAdtdZqMwoYzI_hP0kADam1vhFDPGGnkQZnGI/present). El orden explica primero el producto, conecta requisitos con decisiones y sigue una operación antes de defender servicios, seguridad y costos. Los datos, diagramas y capturas son de Asistente Negocios. No copiamos sus cifras, sus servicios GCP ni sus resultados de IA.

## Estructura del PowerPoint

| Diapositivas | Contenido |
|---|---|
| 1–4 | Producto, requisitos y tabla de servicios con los tres principales destacados |
| 5–6 | Arquitectura general y flujo de una operación, ambos editables |
| 7–11 | Acceso público y capturas actuales del resumen, revisión, comprobantes y perfil |
| 12–16 | Cómputo, despliegue, PostgreSQL, E/R conceptual y archivos privados |
| 17–22 | IAM, Google, secretos, Monitor, alertas y CI/CD verificada |
| 23–26 | Costos, usuarios, problemas encontrados y mejoras siguientes |
| 27 | Demostración y URL pública |
| 28–31 | Anexos: otros proveedores, Vercel, defensa y cierre del crédito |

Las notas de cada diapositiva contienen explicaciones y fuentes. Las tablas y los diagramas se pueden editar en PowerPoint. Las capturas conservan la interfaz real. El acceso es una captura pública; el interior se capturó con datos locales aislados para no crear operaciones adicionales en Azure.

## Guion breve de aproximadamente seis minutos

Usar las diapositivas **1, 2, 4, 5, 6, 7, 8, 9, 10, 17, 20, 22, 23, 26 y 27**. Conservar las demás como apoyo y anexos. Ensayar el tiempo antes de grabar el video de cinco a siete minutos.

1. **Producto (1–3, aproximadamente 55 segundos).** “Asistente Negocios ayuda a registrar lo que ocurre en un pequeño negocio. El usuario cuenta una venta o gasto, revisa una propuesta y confirma. Elegimos una base compartida para que los datos sobrevivan al reemplazo del contenedor y se vean desde distintos equipos”.
2. **Servicios y recorrido (4–6, aproximadamente 95 segundos).** “Container Apps ejecuta la web y la API. PostgreSQL conserva el negocio y sus sesiones. Blob conserva los comprobantes. Key Vault protege las credenciales y la identidad administrada autoriza al servidor. La confirmación es el punto donde una transacción actualiza los registros”.
3. **Interfaz (7–10, aproximadamente 80 segundos).** “Se entra con Google. En esta demo local una venta de Q50 y un gasto de Q20 dejan una diferencia registrada de Q30. Esa diferencia no es utilidad contable. La propuesta sigue siendo editable hasta confirmar y después se puede adjuntar el comprobante”.
4. **Seguridad y operación (17, 20 y 22, aproximadamente 55 segundos).** “Las personas, el servidor, el build y la publicación tienen permisos separados. Monitor ya conserva los eventos de la nueva versión. Actions construye y despliega automáticamente y comprueba salud y rechazo sin sesión”.
5. **Costos y estado (23 y 26, aproximadamente 50 segundos).** “El escenario pequeño se proyecta en USD 25–35 mensuales antes de impuestos. El crédito es temporal. La web y las siete integraciones están verificadas. La restauración de respaldos y la capacidad siguen como mejoras”.
6. **Cierre (27, aproximadamente 25 segundos).** Mostrar el acceso de la app o una captura. Para presentar no es necesario entrar en Azure Portal.

## Acceso para la demostración

[Aplicación pública](https://app-asistente-negocios-dev.happyocean-ee55db6c.centralus.azurecontainerapps.io/).

La primera carga puede tardar si Container Apps está a cero. Se necesita una cuenta Google autorizada y membresía en el negocio. Tener la URL no concede los negocios del propietario. La configuración de audiencia de Google puede exigir un usuario de prueba si el consentimiento sigue en ese modo.

Para ensayar operaciones utilizar un negocio destinado a demostraciones. El ejemplo de diez aguas parte de 24 unidades y deja 14: esas cantidades solo son correctas si se usa ese estado inicial. No crear registros repetidos en el negocio real para obtener la misma captura.

## Preguntas de defensa actualizadas

### 1. ¿Por qué Azure? ¿En qué supera a GCP y AWS?

Azure encaja con la suscripción disponible, la integración ya realizada y la estrategia de identidad del equipo. GCP y AWS pueden resolver el mismo dominio. Nuestra ventaja es de adecuación al proyecto. No hicimos un benchmark que demuestre que Azure sea universalmente más rápido, seguro o barato.

### 2. ¿Por qué Azure en lugar de Vercel?

Vercel es una alternativa válida para Next.js y también ofrece backend. Elegimos Azure para reunir contenedor, base, archivos, secretos y permisos dentro del entorno que debemos demostrar en el curso. El costo y la operación de una combinación Vercel más servicios externos necesitarían una comparación con la misma carga.

### 3. ¿Cuánto costaría mantenerlo un mes?

Proyectamos USD 25–35 antes de impuestos para un entorno pequeño y visitas bajas. PostgreSQL B1ms con 32 GiB aporta aproximadamente USD 18.18 por 730 horas según la cotización conservada. Container Apps tiene una reserva de USD 0–5 y los componentes restantes una reserva conjunta de USD 5–10. Son supuestos de planificación, no factura ni límite automático. El uso de Actions se rige aparte por su asignación de GitHub.

### 4. ¿El crédito de USD 200 lo vuelve gratuito?

El crédito cubre consumo elegible mientras conserva saldo y vigencia. No se renueva cada mes y dura hasta 30 días desde el alta o hasta agotarse. Falta confirmar el saldo restante y la fecha exacta. Se conserva el límite de gasto de la prueba y no se autoriza convertir la suscripción a pago por uso.

### 5. ¿Cuántos usuarios esperamos?

Las metas propuestas son 10, 50 y 200 usuarios activos mensuales en etapas sucesivas. Con 30 acciones diarias, 30 días y ocho peticiones por acción, se estiman 72 000, 360 000 y 1 440 000 peticiones. Es una hipótesis de uso, no capacidad medida ni concurrencia admitida. Antes de ampliar hay que medir latencia, pool, CPU y costos.

### 6. ¿Para qué IAM si ya entramos con Google?

Google identifica a la persona. Entra, RBAC y la identidad administrada autorizan al servidor frente a Azure. Además, nuestra app decide qué negocios pertenecen a cada usuario. Son capas distintas. La identidad de build solo puede publicar imágenes en el registro asignado.

### 7. ¿Cómo se conecta PostgreSQL?

La app usa un rol SQL limitado, `asistente_app`, con TLS y validación del certificado. Su credencial se obtiene de Key Vault usando la identidad administrada del servidor. En esta implementación la identidad administrada no sustituye directamente la contraseña SQL de PostgreSQL.

### 8. ¿Por qué PostgreSQL y no un almacén de documentos?

Nuestro dominio tiene relaciones entre usuarios, negocios, productos, propuestas y movimientos. SQL y las transacciones encajan con la confirmación consistente de dinero e inventario. Un almacén de documentos sería posible, pero requeriría rediseñar consultas y validaciones. SQLite sigue siendo útil para ensayos locales.

### 9. ¿Qué evita una venta parcialmente guardada?

La confirmación se ejecuta en una transacción. Si falla una validación o falta stock, se revierte el conjunto. Las propuestas pendientes no cambian el inventario. La app rechaza una segunda confirmación de la misma propuesta.

### 10. ¿Guardar un archivo y una venta es una sola transacción?

No. El comprobante se adjunta a un movimiento confirmado. PostgreSQL guarda su información y Blob se respalda con estado pendiente, guardado o fallido. Existe reintento manual. No afirmamos una transacción distribuida entre los dos servicios.

### 11. ¿Cualquiera con el enlace puede leer mis comprobantes?

La API requiere sesión y membresía en el negocio. Los blobs son privados y se descargan a través del backend autorizado. El listado técnico antiguo quedó bloqueado en la app pública. Se verificó rechazo sin sesión. Eso no sustituye una auditoría de seguridad completa.

### 12. ¿Por qué usamos Key Vault si ya existen variables de entorno?

El contenedor conserva referencias y la identidad autorizada recupera los secretos del almacén. Así los valores sensibles quedan fuera del código y de la imagen. Key Vault suministra credenciales funcionales, no solo un secreto de prueba. La rotación exige reiniciar la app en esta versión.

### 13. ¿Por qué Container Apps y no una VM o AKS?

Queremos ejecutar una imagen de Next.js sin operar un sistema completo ni un clúster propio. El entorno permite escalado a cero y un máximo pequeño. Una VM o AKS tendría sentido con otras necesidades operativas. App Service también sería una alternativa administrada válida.

### 14. ¿El sistema ya usa inteligencia artificial?

No. La interpretación actual usa reglas y el usuario revisa el resultado. No hay un modelo generativo conectado ni costo de inferencia en el escenario actual. Añadir IA requiere un caso definido, evaluación de errores y presupuesto.

### 15. ¿Tenemos CI/CD completa?

Sí. El run 39864595655 ejecutó dos jobs correctos: construcción y despliegue. El primero usa OIDC con AcrPush; el segundo usa otra identidad con permiso limitado a la app existente. Publicó la revisión 0000004 y comprobó salud con SHA exacto, login 200 y API sin sesión 401. Conserva escala y recursos y no recrea la base ni su firewall. La recuperación automática solicita la plantilla anterior si falla, pero no se forzó un rollback real en Azure.

### 16. ¿Ya están los siete servicios?

Sí, hay siete integraciones verificadas: Container Apps, PostgreSQL, Blob, Entra/RBAC/identidad administrada, Key Vault, Azure Monitor y GitHub Actions desplegando a Azure. ACR es auxiliar. El Word admite CI/CD hacia cloud y exige justificar la identidad mediante permisos explícitos. No contamos grupo, suscripción, cada contenedor o cada rol por separado. La aceptación académica final corresponde al docente.

### 17. ¿Qué aprendimos de los problemas reales?

La cuenta universitaria no permitió registrar el login Entra y adaptamos el acceso a Google. PostgreSQL no estuvo disponible para la suscripción en East US y elegimos Central US. La federación GitHub exigió un subject específico y la base necesitó autorizar las IP de salida del contenedor. Son decisiones observadas, no fallos de la app de ejemplo del docente.

### 18. ¿Qué ocurre si llegan muchas personas a la vez?

El máximo de una réplica limita escalado, no garantiza capacidad o costo máximo. Hay que observar CPU, memoria, conexiones PostgreSQL, latencia y errores antes de aumentar réplicas o servidor. No hicimos pruebas de carga masivas ni prometemos 200 usuarios simultáneos.

### 19. ¿Las alertas de gasto apagan Azure?

No. Las alertas de presupuesto avisan y tienen retraso. La propuesta de USD 30 y avisos de USD 15, 24 y 30 todavía no está activada. Cerrar el navegador o apagar la PC tampoco detiene PostgreSQL, ACR ni el almacenamiento.

### 20. ¿Cómo pausamos al terminar el curso?

Primero exportar PostgreSQL actual y Blob y comprobar una restauración. Conservar código y configuración privada sin subir secretos a Git. Después revisar y retirar los recursos facturables autorizados. Detener PostgreSQL solo pausa cómputo y se reinicia tras siete días. La antigua SQLite no contiene los datos nuevos y no sirve como respaldo actual.

## Fuentes principales

- [Estructura de referencia del docente](https://ykro1.substack.com/p/roastfolio-roasteando-un-cv-desde).
- [Publicación real y arquitectura del proyecto](../publicacion.md).
- [Plan frente al Word del curso](../requisitos/plan-segun-curso.md).
- [Costos y cierre](../costos-y-cierre.md), [precios PostgreSQL conservados](../../evidencias/precios-postgresql-centralus.json).
- [Identidades administradas](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview).
- [Escalado de Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/scale-app).
- [Presupuestos: avisos y límites](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets).
- [Crédito de Azure](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/avoid-charges-free-account).
- [Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run), [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html), [Vercel](https://vercel.com/docs/deployments).


### 21. ¿Cómo sabemos que Monitor funciona?

Las consultas reales devolvieron el arranque de 5bca0110 y una petición bootstrap sin sesión rechazada con 401 y duración 2 ms. La consulta de errores estaba vacía. Eso verifica emisión e ingesta persistente, no demuestra capacidad ni ausencia de fallos futuros. Los eventos propios normalizan rutas y excluyen cuerpos, cookies, códigos OAuth, nombres y secretos.

### 22. ¿Ya recibimos una alerta de error por correo?

El destinatario está habilitado y el usuario confirmó el aviso de incorporación al grupo. La regla evalúa errores cada 15 minutos y conserva alertas en Azure. No se ha ejercitado la recepción de un correo por incidente real. Free Trial rechazó el endpoint específico de notificaciones de prueba. No cambiamos el plan ni fabricamos un error en una venta para forzarlo.

### 23. ¿Cuánto añade Monitor?

El ejemplo de 0.025 GB diarios durante 30 días, a USD 2.76/GB, más una regla de 15 minutos a USD 0.50/mes, suma aproximadamente USD 2.57 antes de beneficios, impuestos, notificaciones o sobrepasos. Se incluye en la reserva conjunta de USD 5–10. El límite diario de ingesta es una salvaguarda que puede sobrepasarse y al alcanzarse deja sin visibilidad parte del día.

## Evidencias nuevas

- [CI/CD real](../../evidencias/cicd-despliegue.json), [operación del pipeline](../cicd.md).
- [Telemetría persistente](../../evidencias/monitor-real.json), [observabilidad y límites](../observabilidad.md).
- [Precios de Monitor conservados](../../evidencias/precios-monitor-centralus.json).
