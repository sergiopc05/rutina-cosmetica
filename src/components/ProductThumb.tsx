import { photoUrl } from '@/lib/supabase'
import { classNames } from '@/lib/util'
import type { Product } from '@/lib/types'

export function ProductThumb({
  product,
  size = 44,
  className,
}: {
  product?: Product
  size?: number
  className?: string
}) {
  const url =
    (product?.photo_path && photoUrl(product.photo_path)) ||
    product?.off_image_url ||
    null

  return (
    <div
      className={classNames(
        'shrink-0 overflow-hidden rounded-xl bg-brand-50 dark:bg-white/10',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg">
          🧴
        </div>
      )}
    </div>
  )
}
