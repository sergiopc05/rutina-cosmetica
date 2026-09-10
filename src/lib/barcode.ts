import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'

export interface ScanController {
  stop: () => void
}

export function isBarcodeScanSupported(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext
}

/**
 * Arranca el escáner sobre un <video>. Devuelve un controlador con stop().
 * El primer código detectado dispara `onResult`; el llamador decide si parar.
 */
export async function startScan(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError?: (e: unknown) => void,
): Promise<ScanController> {
  const reader = new BrowserMultiFormatReader()
  let controls: IScannerControls | undefined

  controls = await reader.decodeFromVideoDevice(
    undefined,
    video,
    (result, err) => {
      if (result) {
        onResult(result.getText())
        return
      }
      if (err && err.name !== 'NotFoundException') onError?.(err)
    },
  )

  return {
    stop: () => {
      try {
        controls?.stop()
      } catch {
        /* noop */
      }
    },
  }
}
