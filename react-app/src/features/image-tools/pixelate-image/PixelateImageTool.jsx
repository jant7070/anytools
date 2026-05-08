import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/common/Button'
import { Card } from '../../../components/common/Card'
import { pixelateImageOnCanvas } from './pixelateImage.utils'

const readFileAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export const PixelateImageTool = () => {
  const { t } = useTranslation('tools/pixelate-image')
  const canvasRef = useRef(null)
  const [file, setFile] = useState(null)
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [pixelSize, setPixelSize] = useState(12)

  const fileName = useMemo(() => {
    if (!file?.name) return 'pixelated.png'
    const base = file.name.replace(/\.[^.]+$/, '')
    return `${base}-pixelated.png`
  }, [file])

  const handleFileChange = async (event) => {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    if (!nextFile) {
      setImageDataUrl('')
      return
    }

    try {
      const nextUrl = await readFileAsDataUrl(nextFile)
      setImageDataUrl(nextUrl)
    } catch {
      setFile(null)
      setImageDataUrl('')
    }
  }

  const handlePixelSizeChange = (event) => {
    const value = Number(event.target.value)
    if (!Number.isFinite(value)) return
    setPixelSize(value)
  }

  const handleDownloadClick = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      // Download failed silently — canvas may be tainted or unsupported
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!imageDataUrl) return

    const img = new Image()
    img.onload = () => pixelateImageOnCanvas(canvas, img, pixelSize)
    img.src = imageDataUrl
  }, [imageDataUrl, pixelSize])

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200" htmlFor="upload">
                {t('tool.uploadLabel')}
              </label>
              <input
                id="upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                aria-label={t('tool.uploadAria')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-zinc-200" htmlFor="pixelSize">
                  {t('tool.pixelSizeLabel')}
                </label>
                <span className="text-sm text-zinc-300">{pixelSize}px</span>
              </div>
              <input
                id="pixelSize"
                type="range"
                min={2}
                max={64}
                step={1}
                value={pixelSize}
                onChange={handlePixelSizeChange}
                className="w-full accent-violet-400"
                aria-label={t('tool.pixelSizeAria')}
              />
            </div>

            <Button
              variant="secondary"
              onClick={handleDownloadClick}
              disabled={!imageDataUrl}
              aria-label={t('tool.downloadAria')}
            >
              {t('tool.download')}
            </Button>
          </div>

          <div className="lg:col-span-2">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-800/80">
              <canvas ref={canvasRef} className="h-full w-full" />
            </div>
            {!imageDataUrl ? (
              <p className="mt-3 text-sm text-zinc-400">
                {t('tool.emptyPreview')}
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}

