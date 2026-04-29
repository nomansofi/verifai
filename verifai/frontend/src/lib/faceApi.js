import * as faceapi from '@vladmandic/face-api'

let _modelsPromise = null

export function getDefaultModelUri() {
  return '/models'
}

export async function loadFaceModels({ modelUri = getDefaultModelUri(), onProgress } = {}) {
  if (_modelsPromise) {
    await _modelsPromise
    if (onProgress) onProgress(100)
    return
  }

  let pct = 0
  let t = null
  const tick = () => {
    pct = Math.min(92, pct + 3 + (pct < 30 ? 4 : 0))
    onProgress?.(pct)
  }
  if (onProgress) {
    onProgress(0)
    t = window.setInterval(tick, 120)
  }

  _modelsPromise = (async () => {
    // TinyFaceDetector is much faster than SSD on most laptops.
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUri)
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUri)
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelUri)
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelUri)
    await faceapi.nets.faceExpressionNet.loadFromUri(modelUri)
  })()

  try {
    await _modelsPromise
    onProgress?.(100)
  } finally {
    if (t) window.clearInterval(t)
  }
}

export function toLabeledDescriptors(users) {
  return users
    .filter((u) => Array.isArray(u.faceDescriptor) && u.faceDescriptor.length > 0)
    .map((u) => new faceapi.LabeledFaceDescriptors(`${u.id}::${u.name}`, [new Float32Array(u.faceDescriptor)]))
}

export function parseMatchLabel(label) {
  // label = `${id}::${name}`
  const idx = label.indexOf('::')
  if (idx === -1) return { id: label, name: label }
  return { id: label.slice(0, idx), name: label.slice(idx + 2) }
}

export function confidenceFromDistance(distance, threshold = 0.5) {
  // Convert distance to a human-friendly percent: 100% at 0.0, ~0% at threshold.
  const clamped = Math.max(0, Math.min(threshold, distance))
  const raw = 1 - clamped / threshold
  return Math.round(raw * 100)
}

export async function descriptorFromDataUrl(photoDataURL) {
  const img = await faceapi.fetchImage(photoDataURL)
  const det = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
  if (!det) return null
  return Array.from(det.descriptor)
}

