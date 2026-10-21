# Solicitud de registro de aplicación — proyecto Cloud

Texto preparado para compartir manualmente con el administrador de Microsoft Entra de Universidad Galileo. No se ha enviado a nadie desde Codex.

---

Estamos implementando inicio de sesión Microsoft para una aplicación académica de gestión de pequeños negocios. La cuenta del estudiante puede utilizar los recursos de su suscripción Azure, pero recibe `Insufficient privileges to complete the operation` al registrar la aplicación.

Solicitamos que creen el registro o habiliten un permiso acotado para que el estudiante pueda hacerlo:

| Campo | Valor solicitado |
|---|---|
| Nombre | `cloud-negocios-dev` |
| Cuentas admitidas | Solo cuentas de este directorio (single tenant / AzureADMyOrg) |
| Plataforma | Web, con backend confidencial |
| URI de redirección | `http://localhost:3010/api/auth/callback` |
| Flujo | Authorization Code + PKCE S256, OpenID Connect |
| Scopes utilizados | `openid profile` |
| Implicit grant | Desactivado; no habilitar emisión implícita de ID/access tokens |
| Public client flows | Desactivados |
| Permisos Microsoft Graph / Azure RBAC nuevos | No se solicitan |

Necesitamos el Application (client) ID, el Directory (tenant) ID y una credencial de cliente para el backend. El valor del secreto debe entregarse por un canal seguro, junto con su fecha de expiración; no se incorpora al repositorio ni a la presentación. Si la política requiere consentimiento o asignación de usuarios, confirmar el acceso para las cuentas del equipo y las acciones que deba realizar el administrador.

El inicio de sesión solo identifica al usuario. La app controla qué negocios le pertenecen y no solicita leer correo, archivos ni directorio. No requiere nuevas máquinas, bases de datos ni cuentas de almacenamiento para esta etapa.

Gracias.
