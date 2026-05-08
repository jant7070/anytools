import { ToolLayout } from '@/components/layout/ToolLayout'
import { PixelateImageTool } from './PixelateImageTool'
import { pixelateImageMeta } from './pixelateImage.meta'
import { useTranslation } from 'react-i18next'

export const PixelateImagePage = () => {
  const { t } = useTranslation('tools/pixelate-image')

  return (
    <ToolLayout meta={pixelateImageMeta}>
      <PixelateImageTool />

      <section className="mt-10 space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
          {t('page.howToTitle')}
        </h2>
        <p className="max-w-2xl text-sm text-zinc-300">
          {t('page.howToBody')}
        </p>
      </section>
    </ToolLayout>
  )
}

