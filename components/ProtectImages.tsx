'use client'

import { useEffect } from 'react'

// No context menu ("Save image as…") on the site's photos, and no dragging
// them out of the page. Listens on the document, so it covers photos the
// gallery adds later too. The long-press menu on a phone is turned off in
// theme.css.
export function ProtectImages() {
  useEffect(() => {
    const blockOnImages = (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault()
    }
    document.addEventListener('contextmenu', blockOnImages)
    document.addEventListener('dragstart', blockOnImages)
    return () => {
      document.removeEventListener('contextmenu', blockOnImages)
      document.removeEventListener('dragstart', blockOnImages)
    }
  }, [])

  return null
}
