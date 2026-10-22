# Diseño de acceso e interior · 22 de octubre de 2026

La referencia proporcionada por Lizardo está conservada en `docs/referencia-visual.md`. Se interpreta como referencia visual, no como instrucciones operativas del proyecto.

## Sistema visual actual

- Fondo blanco, tipografía redondeada Nunito variable alojada en la propia app y licencia SIL OFL incluida.
- Verde #58cc02 para acciones; verde más oscuro #438f13 para texto legible. Azul para acciones secundarias y foco visible.
- Botones con borde inferior grueso, tarjetas con bordes de 2 px, esquinas redondeadas, superficies planas sin degradados ni sombras.
- Ilustración SVG propia de un brote con una libreta y una bolsa. No reproduce la mascota ni los logotipos de Duolingo.
- Acceso y ocho secciones internas comparten el sistema. Menú con iconos SVG de trazo redondeado.
- El flujo de Google, la autorización por negocio, PostgreSQL y los archivos privados conservan su funcionamiento.

## Archivos editables

- `src/app/sign-in.tsx` y `sign-in.css`: acceso.
- `src/app/growth-art.tsx`: ilustración e isotipo propios.
- `src/app/friendly-theme.css`: tema completo del interior, conservando la estructura adaptable de `workspace.css`.
- `src/app/workspace.tsx`: marca, iconos y componentes funcionales.
- `src/app/layout.tsx`: fuente compartida.
- `src/app/fonts/nunito.ttf` y `OFL-Nunito.txt`: fuente variable y licencia.

La fuente procede del repositorio oficial google/fonts (`ofl/nunito/Nunito[wght].ttf`). El navegador no consulta Google Fonts; Next la incluye como archivo estático de la app.

## Validación

Se revisan acceso y secciones internas en un entorno local con SQLite temporal. No se crean operaciones en PostgreSQL ni archivos en Azure para revisar estilos. La evidencia de tamaños y verificaciones está en `evidencias/rediseno-amigable.json` tras completar la publicación.

El diseño oscuro anterior se documenta únicamente como historial en `docs/diseno-inicio-anterior.md`.
