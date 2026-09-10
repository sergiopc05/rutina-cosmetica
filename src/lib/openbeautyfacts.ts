// Cliente de Open Beauty Facts (https://world.openbeautyfacts.org).
// Base de datos abierta de cosméticos, licencia ODbL. Lectura sin autenticación y
// con CORS abierto, así que se llama directamente desde el navegador.
// El navegador no deja fijar 'User-Agent'; OBF acepta 'X-User-Agent' como alternativa.

const BASE = 'https://world.openbeautyfacts.org'
const HEADERS = { 'X-User-Agent': 'RutinaCosmetica - PWA - https://github.com/' }

export interface ObfProduct {
  barcode: string
  name: string
  brand: string | null
  imageUrl: string | null
  imageSmallUrl: string | null
  ingredientsText: string | null
  raw: unknown
}

interface ObfRaw {
  code?: string | number
  product_name?: string
  product_name_es?: string
  generic_name?: string
  brands?: string
  image_front_url?: string
  image_front_small_url?: string
  image_url?: string
  image_small_url?: string
  ingredients_text?: string
  ingredients_text_es?: string
}

function mapProduct(code: string, p: ObfRaw): ObfProduct {
  return {
    barcode: code,
    name: p.product_name_es || p.product_name || p.generic_name || '',
    brand: p.brands || null,
    imageUrl: p.image_front_url || p.image_url || null,
    imageSmallUrl: p.image_front_small_url || p.image_small_url || null,
    ingredientsText: p.ingredients_text_es || p.ingredients_text || null,
    raw: p,
  }
}

const FIELDS =
  'code,product_name,product_name_es,generic_name,brands,image_front_url,image_front_small_url,image_url,image_small_url,ingredients_text,ingredients_text_es'

export async function fetchByBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<ObfProduct | null> {
  const url = `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`
  const res = await fetch(url, { headers: HEADERS, signal })
  if (!res.ok) return null
  const data = (await res.json()) as { status?: number; product?: ObfRaw }
  if (data.status !== 1 || !data.product) return null
  return mapProduct(barcode, data.product)
}

export async function searchProducts(
  term: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<ObfProduct[]> {
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(limit),
    fields: FIELDS,
  })
  const res = await fetch(`${BASE}/cgi/search.pl?${params.toString()}`, {
    headers: HEADERS,
    signal,
  })
  if (!res.ok) return []
  const data = (await res.json()) as { products?: ObfRaw[] }
  return (data.products ?? [])
    .filter((p) => p.code != null && (p.product_name || p.product_name_es))
    .map((p) => mapProduct(String(p.code), p))
}

export const OBF_ATTRIBUTION =
  'Datos de productos: Open Beauty Facts, licencia ODbL.'
export const OBF_URL = 'https://openbeautyfacts.org'
