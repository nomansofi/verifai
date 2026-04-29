import { useEffect } from 'react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'

export default function PlaceholderPage({ title, subtitle }) {
  const { setTitle } = usePageTitle()
  useEffect(() => setTitle(title), [setTitle, title])
  return (
    <div className="glass p-6">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/65">{subtitle || 'Coming soon.'}</div>
    </div>
  )
}

