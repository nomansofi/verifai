import { createContext, useContext } from 'react'

export const PageTitleCtx = createContext(null)

export function usePageTitle() {
  const ctx = useContext(PageTitleCtx)
  if (!ctx) throw new Error('usePageTitle must be used within a PageTitleCtx.Provider')
  return ctx
}
