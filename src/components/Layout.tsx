import { NavLink, Outlet } from 'react-router'
import { classNames } from '@/lib/util'
import { env } from '@/lib/env'
import { SyncBadge } from './SyncBadge'

const tabs = [
  { to: '/', label: 'Hoy', icon: '☀️', end: true },
  { to: '/rutina', label: 'Rutina', icon: '🗓️' },
  { to: '/mes', label: 'Mes', icon: '📅' },
  { to: '/cremas', label: 'Cremas', icon: '🧴' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="safe-t sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/80">
        <span className="font-bold tracking-tight">{env.appName}</span>
        <SyncBadge />
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="safe-b fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-neutral-950/90">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              classNames(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-black/45 dark:text-white/45',
              )
            }
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
