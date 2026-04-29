import fs from 'node:fs/promises'
import path from 'node:path'

const CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
const OUT_DIR = path.resolve('public/models')

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${res.status}: ${url}`)
  return await res.json()
}

async function download(url, outPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${res.status}: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, buf)
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const manifests = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'face_landmark_68_model-weights_manifest.json',
    'face_recognition_model-weights_manifest.json',
  ]

  for (const m of manifests) {
    const url = `${CDN}${m}`
    const out = path.join(OUT_DIR, m)
    // eslint-disable-next-line no-console
    console.log(`Downloading ${m}`)
    const json = await fetchJson(url)
    await fs.writeFile(out, JSON.stringify(json, null, 2))

    const paths = new Set()
    for (const group of json) {
      for (const p of group.paths || []) paths.add(p)
    }
    for (const p of paths) {
      // eslint-disable-next-line no-console
      console.log(`  -> ${p}`)
      await download(`${CDN}${p}`, path.join(OUT_DIR, p))
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Models saved to ${OUT_DIR}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})

