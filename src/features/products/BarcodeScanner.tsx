import { useEffect, useRef, useState } from 'react'
import { isBarcodeScanSupported, startScan, type ScanController } from '@/lib/barcode'

export function BarcodeScanner({
  onDetected,
  onCancel,
}: {
  onDetected: (barcode: string) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isBarcodeScanSupported()) {
      setError('Este dispositivo/navegador no permite usar la cámara aquí.')
      return
    }
    let controller: ScanController | undefined
    let done = false
    const video = videoRef.current
    if (!video) return

    startScan(
      video,
      (text) => {
        if (done) return
        done = true
        controller?.stop()
        onDetected(text)
      },
      () => setError('No se pudo acceder a la cámara. Revisa los permisos.'),
    )
      .then((c) => {
        controller = c
      })
      .catch(() => setError('No se pudo acceder a la cámara. Revisa los permisos.'))

    return () => {
      done = true
      controller?.stop()
    }
  }, [onDetected])

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            playsInline
            muted
          />
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
        </div>
      )}
      <p className="text-center text-xs text-black/55 dark:text-white/55">
        Apunta al código de barras del producto.
      </p>
      <button onClick={onCancel} className="w-full text-sm text-brand-600 underline">
        Cancelar
      </button>
    </div>
  )
}
