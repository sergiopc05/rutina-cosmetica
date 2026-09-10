// Genera los iconos PWA a partir de un SVG. Uso: npm run gen:icons
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/icons')

const bg = '#7e22ce'
const bg2 = '#a855f7'

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

// Maskable: el mismo fondo pero con el motivo más pequeño (zona segura del 80%).
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

const jobs = [
  { svg: fullSvg, size: 192, name: 'icon-192.png' },
  { svg: fullSvg, size: 512, name: 'icon-512.png' },
  { svg: maskableSvg, size: 512, name: 'icon-maskable-512.png' },
  { svg: monoSvg, size: 96, name: 'icon-monochrome-96.png' },
  { svg: fullSvg, size: 180, name: 'apple-touch-icon.png' },
]

await mkdir(outDir, { recursive: true })
for (const job of jobs) {
  await sharp(Buffer.from(job.svg))
    .resize(job.size, job.size)
    .png()
    .toFile(resolve(outDir, job.name))
  console.log('✓', job.name)
}

await writeFile(resolve(root, 'public/favicon.svg'), fullSvg)
console.log('✓ favicon.svg')
