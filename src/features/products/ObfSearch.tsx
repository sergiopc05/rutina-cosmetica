import { useEffect, useRef, useState } from 'react'
import {
  OBF_ATTRIBUTION,
  searchProducts,
  type ObfProduct,
} from '@/lib/openbeautyfacts'
import { Spinner, TextInput } from '@/components/ui'

export function ObfSearch({
  initialTerm = '',
  onPick,
}: {
  initialTerm?: string
  onPick: (p: ObfProduct) => void
}) {
  const [term, setTerm] = useState(initialTerm)
  const [results, setResults] = useState<ObfProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = term.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setTouched(true)
    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      try {
        setResults(await searchProducts(q, 20, ac.signal))
      } catch {
        /* abortado o error de red */
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [term])

  return (
    <div className="space-y-3">
      <TextInput
        autoFocus
        placeholder="Marca o nombre (p. ej. CeraVe)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {loading && (
        <div className="flex justify-center py-4 text-brand-600">
          <Spinner />
        </div>
      )}

      {!loading && touched && term.trim().length >= 2 && results.length === 0 && (
        <p className="py-3 text-center text-sm text-black/55 dark:text-white/55">
          Sin resultados. Puedes darlo de alta manualmente.
        </p>
      )}

      <ul className="max-h-80 space-y-1.5 overflow-y-auto">
        {results.map((p) => (
          <li key={p.barcode}>
            <button
              onClick={() => onPick(p)}
              className="flex w-full items-center gap-3 rounded-xl border border-black/5 p-2 text-left hover:bg-brand-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-brand-50 dark:bg-white/10">
                {p.imageSmallUrl ? (
                  <img
                    src={p.imageSmallUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    🧴
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                {p.brand && (
                  <p className="truncate text-xs text-black/50 dark:text-white/50">
                    {p.brand}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-black/40 dark:text-white/40">
        {OBF_ATTRIBUTION}
      </p>
    </div>
  )
}
