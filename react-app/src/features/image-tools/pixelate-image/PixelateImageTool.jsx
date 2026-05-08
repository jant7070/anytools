import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { FileInput } from '@/components/common/FileInput'
import { RangeSlider } from '@/components/common/RangeSlider'
import { readFileAsDataUrl } from '@/utils/file'
import { pixelateImageOnCanvas } from './pixelateImage.utils'

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
      // Canvas may be tainted or unsupported
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageDataUrl) return

    const img = new Image()
    img.onload = () => pixelateImageOnCanvas(canvas, img, pixelSize)
    img.src = imageDataUrl
  }, [imageDataUrl, pixelSize])

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <FileInput
              id="upload"
              label={t('tool.uploadLabel')}
              accept="image/*"
              onChange={handleFileChange}
              aria-label={t('tool.uploadAria')}
            />

            <RangeSlider
              id="pixelSize"
              label={t('tool.pixelSizeLabel')}
              value={pixelSize}
              suffix="px"
              min={2}
              max={64}
              step={1}
              onChange={handlePixelSizeChange}
              aria-label={t('tool.pixelSizeAria')}
            />

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
            {!imageDataUrl && (
              <p className="mt-3 text-sm text-zinc-400">
                {t('tool.emptyPreview')}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

