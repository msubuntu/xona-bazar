import { useState, useRef, useEffect } from 'react'
import '../components_css/custom-select.css'

function CustomSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={`cs_root ${open ? 'open' : ''}`} ref={ref}>
      <button className="cs_trigger" onClick={() => setOpen(!open)} type="button">
        <span className="cs_icon">{selected?.icon || ''}</span>
        <span className="cs_label">{selected?.label || placeholder || 'Tanlang'}</span>
        <svg className={`cs_arrow ${open ? 'rotate' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="cs_dropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`cs_option ${opt.value === value ? 'active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              <span className="cs_opt_icon">{opt.icon || ''}</span>
              <span className="cs_opt_label">{opt.label}</span>
              {opt.value === value && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2bc32b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
