export const pixelateImageOnCanvas = (canvas, image, pixelSize) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  canvas.width = width
  canvas.height = height

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)

  const scaledWidth = Math.max(1, Math.ceil(width / pixelSize))
  const scaledHeight = Math.max(1, Math.ceil(height / pixelSize))

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = scaledWidth
  tempCanvas.height = scaledHeight

  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  tempCtx.imageSmoothingEnabled = false
  tempCtx.clearRect(0, 0, scaledWidth, scaledHeight)
  tempCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight)

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, width, height)
}

