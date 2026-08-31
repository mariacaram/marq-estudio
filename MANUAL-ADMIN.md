# Manual del panel de administración — Marq. Estudio

La página se administra desde **`/admin/`** (por ejemplo `https://tusitio.com/admin/`).
No hace falta saber programar: subís fotos, escribís textos y tocás **Publicar cambios**.

## Entrar

1. Abrí **`https://marq-estudio.vercel.app/admin/`**
2. Escribí la **contraseña del panel** y tocá **Entrar**.

Con "Recordarme" activado, no la vuelve a pedir en esa computadora.

---

## Configuración inicial (una sola vez, la hace quien administra Vercel)

El panel usa una contraseña simple; la clave técnica de GitHub queda guardada
en Vercel y nunca sale del servidor. Para dejarlo andando:

1. **Crear el token de GitHub** (cuenta `mariacaram`): entrá directo a
   <https://github.com/settings/personal-access-tokens/new>
   - Token name: `Panel Marq` · Expiración: 1 año
   - **Repository access**: *Only select repositories* → `marq-estudio`
   - **Permissions → Contents**: *Read and write*
   - **Generate token** y copiá el `github_pat_…`
2. **Cargar las variables en Vercel**: <https://vercel.com> → proyecto
   `marq-estudio` → **Settings → Environment Variables**:
   - `GITHUB_TOKEN` = el `github_pat_…` recién creado
   - `ADMIN_PASSWORD` = la contraseña que van a usar las chicas
3. **Redeploy**: pestaña Deployments → menú `⋯` del último deploy → *Redeploy*.

Para cambiar la contraseña más adelante: editá `ADMIN_PASSWORD` y redeploy.
Cuando el token venza (al año), se genera otro igual y se actualiza `GITHUB_TOKEN`.

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
