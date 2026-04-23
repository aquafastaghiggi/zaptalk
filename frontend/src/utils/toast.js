export function emitToast({ title, message = '', variant = 'info', duration = 3800 } = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('zaptalk:toast', {
      detail: { title, message, variant, duration },
    })
  )
}
