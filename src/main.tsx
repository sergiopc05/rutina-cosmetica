import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { router } from './app/router'

registerSW({ immediate: true })

// Pide almacenamiento persistente para que el navegador no desaloje la base de
// datos local (IndexedDB) si la app pasa mucho tiempo sin abrirse.
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((already) => {
    if (!already) void navigator.storage.persist()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
