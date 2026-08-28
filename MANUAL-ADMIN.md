# Manual del panel de administración — Marq. Estudio

La página se administra desde **`/admin/`** (por ejemplo `https://tusitio.com/admin/`).
No hace falta saber programar: subís fotos, escribís textos y tocás **Publicar cambios**.

## Entrar por primera vez

1. Entrá a [github.com](https://github.com) con la cuenta del estudio.
2. Andá a **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
3. Nombre: `Panel Marq`. Expiración: 1 año (cuando venza, se genera otra igual).
4. En **Repository access**: *Only select repositories* → elegí `marq-estudio`.
5. En **Permissions → Repository permissions → Contents**: *Read and write*.
6. **Generate token** → copiá la clave (`github_pat_…`) y pegala en el panel.

Con "Recordarme" activado, no la vuelve a pedir en esa computadora.

## Qué se puede editar

| Pestaña | Qué controla |
|---|---|
| **Proyectos** | Crear proyectos, subir fotos (se achican solas), reordenarlas arrastrando, elegir tamaño de cada foto (Automática / Grande / Ancho completo), marcar la portada ★, editar el comentario de portada. |
| **Inicio** | El eslogan, la frase chica y la foto de fondo de la portada. |
| **Estudio** | El texto de "quiénes somos", la cita, y los integrantes con su bio y foto. |
| **Servicios** | Los programas (Refresh, Extreme Makeover…), su precio "desde", para quién es y qué incluye. |
| **Contacto** | El título, la intro y las opciones de "Mi proyecto necesita…". |
| **Ajustes** | WhatsApps, Instagram, email, link de la tienda, ubicación, **precio mínimo de proyectos** y los rangos del filtro de presupuesto. |

## Cómo funciona publicar

- Cuando cambiás algo aparece la barra **"Tenés cambios sin publicar"** abajo.
- **Publicar cambios** guarda todo en GitHub y la página se actualiza sola en ~1 minuto.
- Las fotos se suben al instante al elegirlas, pero aparecen en la página recién cuando tocás **Publicar cambios**.

## Consejos

- Fotos: subí las originales tranquilas — el panel las achica automáticamente antes de subirlas.
- La **tienda**: cuando el ecommerce esté listo, pegá el link en Ajustes y el ícono de la bolsita aparece solo en el menú. Si el campo está vacío, no se muestra.
- Si dos personas editan al mismo tiempo, la segunda va a ver un aviso para recargar. Coordinen para no pisarse.
