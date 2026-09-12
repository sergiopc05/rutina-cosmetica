# Rutina Cosmética

App **local-first** para crear rutinas de tratamientos cosméticos (patrón semanal +
excepciones por fecha), registrar tus cremas con foto y recibir una **notificación
en el móvil a la hora** de cada paso.

- **Frontend**: React + Vite + TypeScript, PWA instalable (iPhone y Android).
- **Datos**: se guardan en el dispositivo (IndexedDB) y funcionan sin conexión.
- **Backend**: Supabase — login por enlace mágico, sincronización navegador ↔ móvil,
  almacenamiento de fotos y envío de las notificaciones (cron + Web Push).
- **Productos**: datos y fotos autocompletados desde
  [Open Beauty Facts](https://openbeautyfacts.org) (licencia ODbL).
- **Android**: se puede empaquetar como APK con Capacitor (avisos locales offline).

> **iPhone**: las notificaciones a hora fija necesitan que la PWA esté instalada en
> la pantalla de inicio (iOS 16.4+) y que el móvil tenga internet; pueden llegar con
> unos minutos de margen. Es una limitación de Apple, no de la app.

---

## 1. Requisitos

- Node 20+ y npm.
- Una cuenta gratuita de [Supabase](https://supabase.com).
- Supabase CLI: ya está como dependencia del proyecto → usa `npx supabase ...`.

> **No necesitas Docker.** `npx supabase link`, `db push`, `functions deploy` y
> `secrets set` funcionan contra el proyecto en la nube sin contenedores. Solo
> `supabase start` / `db reset` / `functions serve` (desarrollo 100 % local)
> requieren Docker Desktop o Podman.

## 2. Puesta en marcha (desarrollo)

```bash
npm install
cp .env.example .env.local        # y rellena los valores (pasos siguientes)
npm run gen:icons                 # genera los iconos PWA (ya vienen incluidos)
npm run dev                       # http://localhost:5173
```

Sin `.env.local` la app arranca igual pero muestra "Falta configurar Supabase".

## 3. Configurar Supabase

### 3.1. Crear el proyecto y enlazarlo

1. Crea un proyecto en <https://supabase.com/dashboard>.
2. En **Project Settings → API** copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` (secreto) → lo necesitarás en el paso 3.4.
3. Enlaza la CLI:

```bash
supabase login
supabase link --project-ref TU-REF     # la ref está en la URL del dashboard
```

### 3.2. Aplicar el esquema

```bash
supabase db push          # aplica supabase/migrations/0001_schema.sql
```

`0002_notifications_cron.sql` **no** se aplica todavía: necesita los secretos de
Vault (paso 3.5).

### 3.3. Configurar Auth

En **Authentication → URL Configuration** añade a *Redirect URLs*:

```
http://localhost:5173
https://TU-DOMINIO-DE-PRODUCCION
```

El enlace mágico usa la plantilla **Magic Link** (activada por defecto).

> **Imprescindible para el iPhone instalado**: una PWA añadida a la pantalla de
> inicio de iOS tiene su propio almacenamiento, **separado de Safari**. Si tocas el
> enlace del email, se abre en Safari y la sesión queda ahí — la app instalada
> sigue sin sesión. La solución es entrar con el **código de 6 dígitos** en vez del
> enlace (la app ya lo pide). Para que el correo incluya ese código, edita la
> plantilla en Supabase:
>
> **Authentication → Emails → Templates → Magic Link** → reemplaza el HTML por:
> ```html
> <h2>Tu código de acceso</h2>
> <p style="font-size:32px;letter-spacing:6px;font-weight:bold">{{ .Token }}</p>
> <p>Escríbelo en la app. Válido unos minutos.</p>
> <p>¿Estás en el navegador (no en la app instalada)? Puedes usar este enlace en su lugar:
>    <a href="{{ .ConfirmationURL }}">Entrar</a></p>
> ```
> Guarda. Desde ese momento el correo trae el código que pide el login.

> **Problemas de correo** (`email rate limit exceeded`, `Error sending confirmation
> email`): el servicio integrado de Supabase solo permite ~2 emails/hora y a veces
> falla. Configura **SMTP propio** en *Authentication → Emails → SMTP Settings* y
> sube el límite en *Authentication → Rate Limits* (p. ej. 30/hora).
>
> **Opción sencilla para uso personal — Gmail:**
> 1. Cuenta de Google → Seguridad → activa la verificación en 2 pasos.
> 2. Crea una **Contraseña de aplicación** (Google Account → App passwords).
> 3. En Supabase: host `smtp.gmail.com`, puerto `465`, user = tu Gmail completo,
>    password = la contraseña de aplicación, *Sender email* = tu Gmail. (~500/día.)
>
> **Con Resend:**
> 1. En Resend → *API Keys* → crea una key (`re_...`).
> 2. **Sin dominio verificado** solo puedes enviar desde `onboarding@resend.dev` y
>    **solo a la dirección con la que te registraste en Resend**. Para un uso
>    personal basta: regístrate en Resend con tu mismo correo de login.
>    Para enviar a cualquier dirección: Resend → *Domains* → añade y verifica un
>    dominio (registros DNS), y usa `noreply@tudominio.com` como *Sender email*.
> 3. En Supabase → *Authentication → Emails → SMTP Settings*:
>    - Enable Custom SMTP: **ON**
>    - Sender email: `onboarding@resend.dev` (o el de tu dominio verificado)
>    - Sender name: `Rutina Cosmética`
>    - Host: `smtp.resend.com` · Port: `465` · Username: `resend`
>    - Password: la API key `re_...` (no tu contraseña de Resend)
> 4. *Authentication → Rate Limits* → sube "emails per hour".
>
> Brevo y SendGrid van igual (permiten enviar a cualquier dirección tras una
> verificación rápida, sin DNS).
>
> Si algo falla, el motivo exacto está en *Dashboard → Logs → Auth* (p. ej.
> "can only send to your own email address").
>
> (`npx supabase start` da un Supabase local sin límites de correo, pero necesita
> Docker Desktop / Podman; para este proyecto no hace falta.)

### 3.4. Claves VAPID para Web Push

```bash
npm run gen:vapid
```

- Copia `VITE_VAPID_PUBLIC_KEY` a `.env.local`.
- Configura los secretos de las Edge Functions:

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="B..." \
  VAPID_PRIVATE_KEY="..." \
  VAPID_SUBJECT="mailto:tu-email@example.com"
```

### 3.5. Desplegar las Edge Functions y el cron

```bash
npx supabase functions deploy materialize-notifications
npx supabase functions deploy dispatch-notifications
```

**Primero** crea los secretos de Vault (Dashboard → **SQL Editor**), sin barra final
en la URL:

```sql
select vault.create_secret('https://rskrpczhvefufhewlpyr.supabase.co', 'project_url');
select vault.create_secret('PEGA_AQUI_EL_SERVICE_ROLE_KEY',            'service_role_key');
```

Si te salió el error `null value in column "url" ... http_request_queue`, es que
aplicaste el cron sin estos secretos. Créalos ahora y re-aplica:

```bash
npx supabase db push      # aplica 0002_notifications_cron.sql (cron.schedule reemplaza los jobs)
```

Comprueba:

```sql
select name from vault.secrets;                                   -- deben salir los 2
select jobname, schedule, active from cron.job;                   -- 3 jobs
select jobname, status, return_message
  from cron.job_run_details order by start_time desc limit 5;     -- ver ejecuciones
```

### 3.6. Sesión duradera (no volver a pedir el enlace mágico)

El cliente ya guarda la sesión y refresca el token solo
(`persistSession` + `autoRefreshToken` en `src/lib/supabase.ts`). El *refresh
token* de Supabase **no caduca por defecto**, así que una vez dentro no tienes que
volver a entrar aunque pasen semanas — salvo que lo desactives sin querer.

En **Authentication → Sessions** deja:

| Ajuste | Valor |
|---|---|
| Time-box user sessions | **desactivado** |
| Inactivity timeout | **desactivado** (si lo activas, te echa tras X sin usar) |
| Enforce single session per user | **desactivado** (usas móvil + navegador) |

En **Authentication → Settings**:

- *Access token (JWT) expiry*: `3600` está bien (el cliente lo renueva). Puedes
  subirlo hasta `604800` (1 semana) si quieres menos renovaciones.
- *Refresh token rotation* y *reuse interval*: deja los valores por defecto.

Si algún día la app te lleva al login sin querer, es que el refresh token se
invalidó (cierre de sesión manual, o cambiaste esos ajustes): pide un enlace nuevo.

## 4. Probar las notificaciones

1. `npm run dev`, inicia sesión con tu correo.
2. **Ajustes → Notificaciones → Activar avisos** y luego **Enviar prueba**
   (en escritorio o Android; en iPhone hay que instalar la PWA primero).
3. Crea un paso en **Rutina** con hora 2–3 minutos en el futuro.
4. Espera: el cron `dispatch-notifications` lo enviará al minuto siguiente de
   vencer. También puedes forzar el ciclo:

```bash
curl -X POST "https://TU-REF.supabase.co/functions/v1/materialize-notifications" \
  -H "Authorization: Bearer TU_SERVICE_ROLE_KEY"
curl -X POST "https://TU-REF.supabase.co/functions/v1/dispatch-notifications" \
  -H "Authorization: Bearer TU_SERVICE_ROLE_KEY"
```

## 5. Desplegar la PWA

### Opción A — GitHub Pages (workflow ya incluido)

`.github/workflows/deploy-pages.yml` publica en cada push a `master`. Una sola vez:

1. **Settings → Pages → Source: "GitHub Actions"**.
2. **Settings → Secrets and variables → Actions** → añade:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
3. En Supabase → *Authentication → URL Configuration* → *Redirect URLs*:
   `https://TU-USUARIO.github.io/rutina-cosmetica/`
4. Haz push (o *Actions → deploy-pages → Run workflow*).

Queda en `https://TU-USUARIO.github.io/rutina-cosmetica/`. El workflow compila con
`VITE_BASE=/rutina-cosmetica/`; en local no cambia nada (raíz).

> GitHub Pages con repo **privado** requiere plan de pago. Si el repo es privado y
> estás en el plan gratis: hazlo público (la `anon key` ya va en el bundle igualmente,
> los datos los protege el RLS) o usa la opción B.

### Opción B — Cloudflare Pages / Vercel / Netlify

Conecta el repo. Build command `npm run build`, output `dist`, sin `VITE_BASE`
(se sirve en la raíz). Añade las `VITE_*` como variables y la URL a *Redirect URLs*
de Supabase.

**Instalar en el iPhone**: abre la web en Safari → Compartir → *Añadir a pantalla de
inicio* → abre la app desde el icono → Ajustes → activar avisos.

## 6. APK de Android (opcional)

```bash
npm i -D @capacitor/cli @capacitor/core
npm i @capacitor/android @capacitor/local-notifications @capacitor/camera
npx cap init "Rutina Cosmética" com.tudominio.rutina --web-dir dist
npm run build && npx cap add android
npx cap open android        # compila el APK desde Android Studio
```

La programación de avisos locales offline para Android vive en
`src/features/notifications/localNotifications.ts` (pendiente de la fase 5; la PWA
ya funciona con Web Push mientras tanto).

## 7. Estructura

```
src/
  app/          router, AuthProvider, gate de sesión
  db/           dexie (IndexedDB), motor de sync LWW, mutaciones, queries
  lib/          supabase, openbeautyfacts, push, barcode, schedule (lógica pura)
  features/     auth/ today/ routine/ calendar/ products/ settings/
  sw.ts         service worker (precache + Web Push)
supabase/
  migrations/   0001_schema.sql, 0002_notifications_cron.sql
  functions/    materialize-notifications, dispatch-notifications, _shared
scripts/        gen-vapid.mjs, gen-icons.mjs
```

## 8. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción + service worker |
| `npm run test` | Tests de la lógica de programación |
| `npm run typecheck` | Comprobación de tipos |
| `npm run lint` | oxlint |
| `npm run gen:vapid` | Genera claves VAPID |
| `npm run gen:icons` | Regenera los iconos PWA |

## 9. Cómo funciona la sincronización

Toda la UI lee y escribe en IndexedDB (Dexie). Cada cambio se encola en un `outbox`
y un motor de sync lo sube a Supabase y baja los cambios remotos, resolviendo
conflictos por *última escritura gana* (`updated_at`). Con Supabase Realtime, editar
en el navegador se refleja en el móvil en segundos. Sin conexión todo sigue
funcionando y se sincroniza al volver.

## 10. Si no usas la app durante más de una semana

**El plan gratuito de Supabase pausa el proyecto tras ~7 días sin actividad.**
Mientras está pausado no hay login, ni sincronización, ni notificaciones.
**No se pierden datos**: reanudarlo es un clic en el dashboard (*Restore project*)
y luego abrir la app.

Qué hacer para que no pase:

- **Ya lo cubre el cron de notificaciones**: si tienes las Edge Functions y el cron
  del paso 3.5 en marcha, el proyecto recibe actividad cada minuto y normalmente no
  se pausa (son ~47 000 invocaciones/mes, dentro de las 500 000 gratis).
- **Seguro extra (recomendado)**: el workflow `.github/workflows/keep-supabase-awake.yml`
  hace un ping cada 3 días. Sube el repo a GitHub y añade dos secretos en
  *Settings → Secrets and variables → Actions*:
  - `SUPABASE_URL` = `https://TU-REF.supabase.co`
  - `SUPABASE_ANON_KEY` = tu clave anon public
- **Definitivo**: plan Pro de Supabase (25 $/mes), nunca se pausa.

Lo que **no** es problema tras una semana:

| | Por qué |
|---|---|
| Sesión / login | El *refresh token* de Supabase no caduca por defecto; la app renueva sola al abrir. No actives "inactivity timeout" en Authentication. |
| Fotos de las cremas | El bucket es público, las URLs no caducan y se cachean para uso offline. |
| Avisos de esos días | Los push tienen `TTL` de 1 h: los no entregados expiran, **no** llegan todos de golpe al volver. Retomas desde el siguiente paso programado. |
| Datos locales | IndexedDB persiste; además la app pide `navigator.storage.persist()` para que el navegador no los desaloje. |
