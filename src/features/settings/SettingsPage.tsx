import { useRef, useState } from 'react'
import { Button, Card, Field, PageHeader, Select } from '@/components/ui'
import { OBF_ATTRIBUTION, OBF_URL } from '@/lib/openbeautyfacts'
import { deviceTimeZone } from '@/lib/util'
import { downloadBackup, importBackup, type BackupFile } from '@/db/backup'
import { useAuth } from '@/app/AuthProvider'
import { NotificationsCard } from './NotificationsCard'
import { useProfile } from './profile'

function timeZones(): string[] {
  const intl = Intl as { supportedValuesOf?: (key: string) => string[] }
  const supported =
    typeof intl.supportedValuesOf === 'function'
      ? intl.supportedValuesOf('timeZone')
      : []
  const common = [
    'Europe/Madrid',
    'Atlantic/Canary',
    'Europe/London',
    'Europe/Lisbon',
    'America/Mexico_City',
    'America/Bogota',
    'America/Argentina/Buenos_Aires',
    'America/Santiago',
    'America/New_York',
    'America/Los_Angeles',
  ]
  const set = new Set<string>([deviceTimeZone(), ...common, ...supported])
  return [...set]
}

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { profile, timezone, update } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  async function onImport(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile
      const n = user ? await importBackup(parsed, user.id) : 0
      setImportMsg(`Importadas ${n} filas.`)
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Archivo no válido')
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Ajustes" />

      <NotificationsCard />

      <Card>
        <Field
          label="Zona horaria"
          hint="Se usa para calcular a qué hora enviar los avisos"
        >
          <Select
            value={timezone}
            onChange={(e) => update({ timezone: e.target.value })}
          >
            {timeZones().map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card>
        <h3 className="font-semibold">Cuenta</h3>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          {user?.email}
        </p>
        {profile?.updated_at && (
          <p className="text-xs text-black/40 dark:text-white/40">
            Perfil actualizado: {new Date(profile.updated_at).toLocaleString('es-ES')}
          </p>
        )}
        <Button variant="ghost" className="mt-2" onClick={signOut}>
          Cerrar sesión
        </Button>
      </Card>

      <Card>
        <h3 className="font-semibold">Copia de seguridad</h3>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          Exporta o importa toda tu rutina y tus cremas en un archivo JSON.
        </p>
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" onClick={downloadBackup}>
            Exportar
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Importar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </div>
        {importMsg && (
          <p className="mt-2 text-sm text-brand-700 dark:text-brand-300">
            {importMsg}
          </p>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold">Acerca de</h3>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          {OBF_ATTRIBUTION}{' '}
          <a
            href={OBF_URL}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline"
          >
            openbeautyfacts.org
          </a>
        </p>
        <p className="mt-2 text-xs text-black/45 dark:text-white/45">
          Si pasas más de una semana sin abrir la app, el proyecto gratuito de
          Supabase puede pausarse (no se pierde nada; se reactiva desde su panel).
          Tus datos siguen guardados en este dispositivo.
        </p>
      </Card>
    </div>
  )
}
