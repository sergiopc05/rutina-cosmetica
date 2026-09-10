import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { classNames } from '@/lib/util'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const styles: Record<string, string> = {
    primary:
      'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
    secondary:
      'bg-brand-100 text-brand-800 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-100',
    ghost:
      'bg-transparent text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-white/5',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={classNames(
        'rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-black/70 dark:text-white/70">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-black/45 dark:text-white/45">{hint}</span>}
    </label>
  )
}

const controlClass =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-white/15 dark:bg-white/5 dark:focus:ring-brand-900'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames(controlClass, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={classNames(controlClass, props.className)}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={classNames(controlClass, props.className)} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={classNames(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      role="status"
      aria-label="Cargando"
    />
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-black/55 dark:border-white/15 dark:text-white/55">
      <p className="font-medium text-black/70 dark:text-white/70">{title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  action,
  subtitle,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-black/55 dark:text-white/55">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl safe-b dark:bg-neutral-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
