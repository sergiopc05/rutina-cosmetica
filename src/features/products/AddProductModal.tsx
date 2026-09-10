import { useState } from 'react'
import { fetchByBarcode } from '@/lib/openbeautyfacts'
import type { Product } from '@/lib/types'
import { Modal, Spinner } from '@/components/ui'
import { BarcodeScanner } from './BarcodeScanner'
import { ObfSearch } from './ObfSearch'
import {
  draftFromObf,
  EMPTY_DRAFT,
  ProductForm,
  type ProductDraft,
} from './ProductForm'

type Mode = 'choose' | 'scan' | 'search' | 'form'

export function AddProductModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (p: Product) => void
}) {
  const [mode, setMode] = useState<Mode>('choose')
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT)
  const [lookup, setLookup] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  function reset() {
    setMode('choose')
    setDraft(EMPTY_DRAFT)
    setLookup(null)
    setNotFound(false)
  }

  function close() {
    reset()
    onClose()
  }

  async function handleBarcode(code: string) {
    setLookup(code)
    const obf = await fetchByBarcode(code).catch(() => null)
    setLookup(null)
    if (obf) {
      setDraft(draftFromObf(obf))
      setNotFound(false)
    } else {
      setDraft({ ...EMPTY_DRAFT, barcode: code })
      setNotFound(true)
    }
    setMode('form')
  }

  const titles: Record<Mode, string> = {
    choose: 'Añadir crema',
    scan: 'Escanear código',
    search: 'Buscar en Open Beauty Facts',
    form: 'Datos de la crema',
  }

  return (
    <Modal open={open} onClose={close} title={titles[mode]}>
      {lookup && (
        <div className="flex items-center justify-center gap-2 py-8 text-brand-600">
          <Spinner /> Buscando {lookup}…
        </div>
      )}

      {!lookup && mode === 'choose' && (
        <div className="grid gap-2">
          <BigChoice
            icon="📷"
            title="Escanear código de barras"
            desc="Rellena los datos y la foto automáticamente"
            onClick={() => setMode('scan')}
          />
          <BigChoice
            icon="🔎"
            title="Buscar por nombre"
            desc="En la base de datos abierta Open Beauty Facts"
            onClick={() => setMode('search')}
          />
          <BigChoice
            icon="✏️"
            title="Añadir manualmente"
            desc="Escribe los datos y haz una foto tú"
            onClick={() => {
              setDraft(EMPTY_DRAFT)
              setMode('form')
            }}
          />
        </div>
      )}

      {!lookup && mode === 'scan' && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onCancel={() => setMode('choose')}
        />
      )}

      {!lookup && mode === 'search' && (
        <ObfSearch
          onPick={(p) => {
            setDraft(draftFromObf(p))
            setNotFound(false)
            setMode('form')
          }}
        />
      )}

      {!lookup && mode === 'form' && (
        <>
          {notFound && (
            <p className="mb-3 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Ese código no está en Open Beauty Facts. Completa los datos a mano.
            </p>
          )}
          <ProductForm
            draft={draft}
            onSaved={(p) => {
              onCreated(p)
              close()
            }}
            onCancel={() => setMode('choose')}
          />
        </>
      )}
    </Modal>
  )
}

function BigChoice({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: string
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-black/10 p-3 text-left hover:bg-brand-50 dark:border-white/15 dark:hover:bg-white/5"
    >
      <span className="text-2xl">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-black/55 dark:text-white/55">
          {desc}
        </span>
      </span>
    </button>
  )
}
