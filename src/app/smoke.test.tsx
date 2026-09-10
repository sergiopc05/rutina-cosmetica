// @vitest-environment jsdom
import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }),
)

afterEach(cleanup)

it('monta la app sin explotar y muestra una pantalla inicial', async () => {
  const { RouterProvider } = await import('react-router/dom')
  const { router } = await import('./router')
  const { container } = render(<RouterProvider router={router} />)
  await new Promise((r) => setTimeout(r, 50))
  const text = container.textContent ?? ''
  // Según haya credenciales de Supabase o no: login o "falta configurar".
  expect(
    /Falta configurar Supabase|Enviar enlace de acceso/.test(text),
  ).toBe(true)
}, 15000)
