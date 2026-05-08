export const SEO = ({ title, description }) => (
  <>
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </>
)

