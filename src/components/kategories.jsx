import React from "react"
import '../components_css/kategories.css'

const CATEGORIES = [
  { id: 'all', label: 'Hammasi', icon: '' },
  { id: 'paints', label: 'Bo\'yoqlar', icon: '' },
  { id: 'tiles', label: 'G\'isht va Plitka', icon: '' },
  { id: 'plumbing', label: 'Sanitariya', icon: '' },
  { id: 'electrical', label: 'Elektr', icon: '' },
  { id: 'tools', label: 'Asboblar', icon: '' },
  { id: 'building', label: 'Qurilish', icon: '' },
  { id: 'furniture', label: 'Mebel', icon: '' },
  { id: 'doors', label: 'Eshik va Deraza', icon: '' },
  { id: 'landscape', label: 'Landshaft', icon: '' },
]

function Kategories({ selected, onSelect }) {
    return (
        <div className="kategories">
            <div className="kategories_scroll">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`kategories_btn ${selected === cat.id ? 'active' : ''}`}
                        onClick={() => onSelect(cat.id)}
                    >
                        <span className="kategories_icon">{cat.icon}</span>
                        <span className="kategories_label">{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default Kategories
export { CATEGORIES }
