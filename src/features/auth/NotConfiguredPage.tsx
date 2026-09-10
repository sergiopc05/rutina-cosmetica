export function NotConfiguredPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold">Falta configurar Supabase</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        La app funciona en local, pero para iniciar sesión, sincronizar entre
        dispositivos y enviar notificaciones necesita un proyecto Supabase.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
        <li>
          Crea un proyecto gratuito en{' '}
          <a
            className="text-brand-600 underline"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            supabase.com
          </a>
          .
        </li>
        <li>
          Copia <code>.env.example</code> a <code>.env.local</code> y rellena{' '}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        </li>
        <li>
          Aplica las migraciones de <code>supabase/migrations</code> (
          <code>supabase db push</code>).
        </li>
        <li>Reinicia el servidor de desarrollo.</li>
      </ol>
      <p className="mt-4 text-xs text-black/45 dark:text-white/45">
        Los pasos completos están en el <code>README.md</code>.
      </p>
    </div>
  )
}
