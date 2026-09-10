import { useState, type FormEvent } from 'react'
import type { Product } from '@/lib/types'
import type { ObfProduct } from '@/lib/openbeautyfacts'
import { newRow, putRow } from '@/db/mutations'
import { photoUrl } from '@/lib/supabase'
import { Button, Field, Spinner, TextArea, TextInput } from '@/components/ui'
import { useAuth } from '@/app/AuthProvider'
import { uploadPhoto } from './photo'

export interface ProductDraft {
  id?: string
  name: string
  brand: string
  barcode: string
  ingredients_text: string
  notes: string
  off_image_url: string | null
  off_data: unknown | null
  photo_path: string | null
}

export function draftFromProduct(p: Product): ProductDraft {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? '',
    barcode: p.barcode ?? '',
    ingredients_text: p.ingredients_text ?? '',
    notes: p.notes ?? '',
    off_image_url: p.off_image_url,
    off_data: p.off_data,
    photo_path: p.photo_path,
  }
}

export function draftFromObf(o: ObfProduct): ProductDraft {
  return {
    name: o.name,
    brand: o.brand ?? '',
    barcode: o.barcode,
    ingredients_text: o.ingredientsText ?? '',
    notes: '',
    off_image_url: o.imageUrl,
    off_data: o.raw,
    photo_path: null,
  }
}

export const EMPTY_DRAFT: ProductDraft = {
  name: '',
  brand: '',
  barcode: '',
  ingredients_text: '',
  notes: '',
  off_image_url: null,
  off_data: null,
  photo_path: null,
}

export function ProductForm({
  draft: initialDraft,
  existing,
  onSaved,
  onCancel,
}: {
  draft: ProductDraft
  existing?: Product
  onSaved: (p: Product) => void
  onCancel: () => void
}) {
  const { user } = useAuth()
  const [draft, setDraft] = useState(initialDraft)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function onFile(f: File | null) {
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      let photoPath = draft.photo_path
      if (file) {
        photoPath = await uploadPhoto(user.id, file)
      }

      const fields = {
        name: draft.name.trim(),
        brand: draft.brand.trim() || null,
        barcode: draft.barcode.trim() || null,
        ingredients_text: draft.ingredients_text.trim() || null,
        notes: draft.notes.trim() || null,
        off_image_url: draft.off_image_url,
        off_data: draft.off_data ?? null,
        photo_path: photoPath,
      }

      const row: Product =
        existing != null
          ? { ...existing, ...fields }
          : newRow<Product>(user.id, fields)

      const saved = await putRow('products', row)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const shownImage =
    preview ??
    (draft.photo_path ? photoUrl(draft.photo_path) : null) ??
    draft.off_image_url

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-50 dark:bg-white/10">
          {shownImage ? (
            <img src={shownImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl">
              🧴
            </span>
          )}
        </div>
        <label className="cursor-pointer text-sm font-semibold text-brand-600 underline">
          {shownImage ? 'Cambiar foto' : 'Hacer / subir foto'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <Field label="Nombre">
        <TextInput
          required
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>
      <Field label="Marca">
        <TextInput
          value={draft.brand}
          onChange={(e) => set('brand', e.target.value)}
        />
      </Field>
      <Field label="Código de barras" hint="Opcional">
        <TextInput
          inputMode="numeric"
          value={draft.barcode}
          onChange={(e) => set('barcode', e.target.value)}
        />
      </Field>
      <Field label="Ingredientes" hint="Se rellena solo si viene de Open Beauty Facts">
        <TextArea
          value={draft.ingredients_text}
          onChange={(e) => set('ingredients_text', e.target.value)}
        />
      </Field>
      <Field label="Notas">
        <TextArea
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={saving || !draft.name.trim()}>
          {saving ? <Spinner /> : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
