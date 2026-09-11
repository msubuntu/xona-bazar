import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handle = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handle)
    handle(mql)
    return () => mql.removeEventListener('change', handle)
  }, [breakpoint])

  return isMobile
}

export default useIsMobile