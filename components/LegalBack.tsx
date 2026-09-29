'use client'

// Back returns to wherever the visitor came from on this site (the browser's
// own back, so the gallery comes back where it was), and to the home page
// otherwise.
export function LegalBack() {
  return (
    <a
      className="panel-toggle"
      id="legalBack"
      href="/"
      onClick={(event) => {
        let fromThisSite = false
        try {
          fromThisSite = new URL(document.referrer).origin === location.origin
        } catch {}
        if (fromThisSite && history.length > 1) {
          event.preventDefault()
          history.back()
        }
      }}
    >
      Back
    </a>
  )
}
