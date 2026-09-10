// Genera un par de claves VAPID para Web Push. Uso: npm run gen:vapid
// No necesita dependencias: usa la crypto nativa de Node (curva P-256).
import { generateKeyPairSync } from 'node:crypto'

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
})

// Clave pública: punto sin comprimir de 65 bytes (formato que espera el navegador).
const pubRaw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-65)
// Clave privada: escalar de 32 bytes.
const jwk = privateKey.export({ format: 'jwk' })
const privRaw = Buffer.from(jwk.d, 'base64url')

console.log('\nAñade a tu .env.local (frontend):')
console.log(`VITE_VAPID_PUBLIC_KEY="${b64url(pubRaw)}"`)

console.log('\nConfigura como secretos de las Edge Functions:')
console.log(`supabase secrets set \\`)
console.log(`  VAPID_PUBLIC_KEY="${b64url(pubRaw)}" \\`)
console.log(`  VAPID_PRIVATE_KEY="${b64url(privRaw)}" \\`)
console.log(`  VAPID_SUBJECT="mailto:tu-email@example.com"\n`)
