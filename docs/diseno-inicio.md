# Inicio de sesión

Pantalla para visitantes sin sesión, con una dirección visual inspirada en el lenguaje editorial de Porsche: composición oscura, tipografía grande, amplios espacios y rojo como acento. Identidad, textos y arte vectorial propios de Asistente Negocios; no se reutilizan el logotipo ni fotografías de Porsche.

Archivos editables: `src/app/sign-in.tsx` y `src/app/sign-in.css`. El componente se usa desde la página de inicio después de verificar que no existe una sesión. El espacio de negocio autenticado mantiene sus estilos y funcionamiento.

- Diseño de dos columnas en escritorio y una columna en móvil, sin enlaces técnicos ni controles de demostración.
- Botón real al mismo `/api/auth/login`; Google sigue gestionando la autenticación. No se agregan formularios de contraseña ni pasos nuevos.
- Ilustración SVG integrada en el componente, sin descargar imágenes de terceros ni video automático.
- Fuente variable Manrope autoalojada, licencia SIL Open Font License en `src/app/fonts/OFL-Manrope.txt`. Fuente: https://github.com/google/fonts/tree/main/ofl/manrope
- Acceso por teclado con foco visible, SVG decorativos fuera del árbol accesible y estilos acotados a esta pantalla.
- Revisión visual en navegador aislado a 1440, 1024, 390 y 360 píxeles; sin desbordamiento horizontal, botón visible en los tamaños móviles revisados y fuente local cargada.
- Compilación, pruebas de acceso Google y protecciones cloud aprobadas. No se contactó Azure ni Google durante las pruebas locales.

Para verla con una sesión activa hay que cerrar sesión o abrir una ventana privada. El rediseño no borra datos, cambia permisos ni crea recursos Azure. Se publica mediante una nueva imagen en la misma app.
