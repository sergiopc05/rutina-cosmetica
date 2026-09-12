// Genera los iconos PWA. Uso: npm run gen:icons
//
// Si existe public/brand/logo-source.jpg (o .png) los genera a partir de esa
// foto de producto. Si no, cae de vuelta al trazo abstracto de siempre.
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/icons')
const brandDir = resolve(root, 'public/brand')

const LILAC = '#f3e8ff' // --color-brand-100: fondo de la foto, para el maskable
const bg = '#7e22ce'
const bg2 = '#a855f7'

async function firstExisting(paths) {
  for (const p of paths) {
    try {
      await access(p)
      return p
    } catch {
      /* sigue probando */
    }
  }
  return null
}

const logoSrc = await firstExisting([
  resolve(brandDir, 'logo-source.jpg'),
  resolve(brandDir, 'logo-source.jpeg'),
  resolve(brandDir, 'logo-source.png'),
])

const mark = (color) => `
  <path fill="${color}" d="M256 96c0 0 -104 120 -104 190 a104 104 0 1 0 208 0 c0 -70 -104 -190 -104 -190 z"/>
  <circle cx="220" cy="300" r="26" fill="${color}" opacity="0.35"/>
`

const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg2}"/><stop offset="1" stop-color="${bg}"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  ${mark('#ffffff')}
</svg>`

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg2}"/><stop offset="1" stop-color="${bg}"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(51.2 51.2) scale(0.8)">${mark('#ffffff')}</g>
</svg>`

const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 512 512">
  ${mark('#ffffff')}
</svg>`

await mkdir(outDir, { recursive: true })

if (logoSrc) {
  console.log('Usando foto de producto como logo:', logoSrc)
  const photo = sharp(logoSrc).rotate() // respeta la orientación EXIF

  const squares = [
    { size: 192, file: 'icon-192.png' },
    { size: 512, file: 'icon-512.png' },
    { size: 180, file: 'apple-touch-icon.png' },
  ]
  for (const { size, file } of squares) {
    await photo
      .clone()
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(resolve(outDir, file))
    console.log('✓', file)
  }

  await photo.clone().resize(32, 32, { fit: 'cover' }).png().toFile(resolve(root, 'public/favicon.png'))
  console.log('✓ favicon.png')

  // Maskable: la foto al 80% centrada (zona segura) sobre el mismo lila de fondo.
  const inner = await sharp(logoSrc)
    .rotate()
    .resize(410, 410, { fit: 'cover' })
    .png()
    .toBuffer()
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: LILAC },
  })
    .composite([{ input: inner, left: 51, top: 51 }])
    .png()
    .toFile(resolve(outDir, 'icon-maskable-512.png'))
  console.log('✓ icon-maskable-512.png (maskable)')
} else {
  console.log('No hay public/brand/logo-source.*, generando icono abstracto')
  const jobs = [
    { svg: fullSvg, size: 192, name: 'icon-192.png' },
    { svg: fullSvg, size: 512, name: 'icon-512.png' },
    { svg: maskableSvg, size: 512, name: 'icon-maskable-512.png' },
    { svg: fullSvg, size: 180, name: 'apple-touch-icon.png' },
  ]
  for (const job of jobs) {
    await sharp(Buffer.from(job.svg))
      .resize(job.size, job.size)
      .png()
      .toFile(resolve(outDir, job.name))
    console.log('✓', job.name)
  }
  await writeFile(resolve(root, 'public/favicon.svg'), fullSvg)
  console.log('✓ favicon.svg')
}

// El badge monocromo del aviso siempre usa el trazo abstracto: una foto no
// funciona como silueta para el badge de notificaciones de Android.
await sharp(Buffer.from(monoSvg))
  .resize(96, 96)
  .png()
  .toFile(resolve(outDir, 'icon-monochrome-96.png'))
console.log('✓ icon-monochrome-96.png (badge)')
