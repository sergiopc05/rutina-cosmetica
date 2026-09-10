import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useProduct, useProductUsage } from '@/db/queries'
import { softDeleteRow } from '@/db/mutations'
import { Button, Card, Modal, PageHeader } from '@/components/ui'
import { ProductThumb } from '@/components/ProductThumb'
import { OBF_ATTRIBUTION } from '@/lib/openbeautyfacts'
import { WEEKDAY_LABELS_LONG } from '@/lib/util'
import { deletePhoto } from './photo'
import { draftFromProduct, ProductForm } from './ProductForm'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = useProduct(id)
  const usage = useProductUsage(id)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!product) {
    return (
      <div>
        <PageHeader title="Crema" />
        <p className="text-sm text-black/55 dark:text-white/55">
          No encontrada.{' '}
          <Link to="/cremas" className="text-brand-600 underline">
            Volver
          </Link>
        </p>
      </div>
    )
  }

  const usedCount = usage.slots.length + usage.exceptions.length

  async function doDelete() {
    if (!product) return
    await softDeleteRow('products', product)
    if (product.photo_path) void deletePhoto(product.photo_path)
    navigate('/cremas')
  }

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={product.brand ?? undefined}
        action={
          <button
            onClick={() => navigate('/cremas')}
            className="text-sm text-brand-600"
          >
            ‹ Cremas
          </button>
        }
      />

      <Card className="mb-3 flex gap-4">
        <ProductThumb product={product} size={96} />
        <div className="flex-1 text-sm">
          {product.barcode && (
            <p className="text-black/55 dark:text-white/55">
              Código: {product.barcode}
            </p>
          )}
          <p className="mt-1 text-black/55 dark:text-white/55">
            {usedCount === 0
              ? 'No se usa en ninguna rutina'
              : `Se usa en ${usedCount} paso${usedCount === 1 ? '' : 's'}`}
          </p>
        </div>
      </Card>

      {usage.slots.length > 0 && (
        <Card className="mb-3">
          <h3 className="mb-2 text-sm font-semibold">En tu rutina semanal</h3>
          <ul className="space-y-1 text-sm">
            {usage.slots.map((s) => (
              <li key={s.id} className="text-black/70 dark:text-white/70">
                {s.time_local} ·{' '}
                {s.weekdays
                  .map((d) => WEEKDAY_LABELS_LONG[d].slice(0, 3))
                  .join(', ')}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {product.ingredients_text && (
        <Card className="mb-3">
          <h3 className="mb-1 text-sm font-semibold">Ingredientes</h3>
          <p className="text-xs leading-relaxed text-black/65 dark:text-white/65">
            {product.ingredients_text}
          </p>
          <p className="mt-2 text-[10px] text-black/40 dark:text-white/40">
            {OBF_ATTRIBUTION}
          </p>
        </Card>
      )}

      {product.notes && (
        <Card className="mb-3">
          <h3 className="mb-1 text-sm font-semibold">Notas</h3>
          <p className="text-sm text-black/70 dark:text-white/70">{product.notes}</p>
        </Card>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={() => setConfirmDelete(true)}
        >
          Eliminar
        </Button>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar crema">
        <ProductForm
          draft={draftFromProduct(product)}
          existing={product}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar crema"
      >
        <p className="text-sm text-black/70 dark:text-white/70">
          {usedCount > 0
            ? `Esta crema se usa en ${usedCount} paso(s) de tu rutina. Esos pasos quedarán sin producto.`
            : '¿Seguro que quieres eliminarla?'}
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setConfirmDelete(false)}
          >
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={doDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
