import { useState } from 'react'
import { Link } from 'react-router'
import { useProducts } from '@/db/queries'
import { Button, EmptyState, PageHeader } from '@/components/ui'
import { ProductThumb } from '@/components/ProductThumb'
import { AddProductModal } from './AddProductModal'

export function ProductsPage() {
  const products = useProducts()
  const [adding, setAdding] = useState(false)

  return (
    <div>
      <PageHeader
        title="Cremas"
        subtitle={`${products.length} producto${products.length === 1 ? '' : 's'}`}
        action={<Button onClick={() => setAdding(true)}>+ Añadir</Button>}
      />

      {products.length === 0 ? (
        <EmptyState title="Aún no has registrado ninguna crema">
          Escanea el código de barras o búscala por nombre.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                to={`/cremas/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-white/5"
              >
                <ProductThumb product={p} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  {p.brand && (
                    <p className="truncate text-xs text-black/50 dark:text-white/50">
                      {p.brand}
                    </p>
                  )}
                </div>
                <span className="text-black/30 dark:text-white/30">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AddProductModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => setAdding(false)}
      />
    </div>
  )
}
