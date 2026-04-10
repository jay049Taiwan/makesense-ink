export const GA_MEASUREMENT_ID = 'G-51MHE2BT74'

export const pageview = (url: string) => {
  window.gtag('event', 'page_view', {
    page_path: url,
  })
}

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string
  category: string
  label?: string
  value?: number
}) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  })
}
