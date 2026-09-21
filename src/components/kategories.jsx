import React from "react"
import '../components_css/kategories.css'

const CATEGORIES = [
  { id: 'all', label: 'Hammasi', icon: '' },
  { id: 'flooring', label: 'Pol qoplamalari', icon: '🟫' },
  { id: 'walls', label: 'Devor materiallari', icon: '🎨' },
  { id: 'ceiling', label: 'Shift materiallari', icon: '⬜' },
  { id: 'tiles', label: 'Plitka va keramika', icon: '🧱' },
  { id: 'doors', label: 'Eshiklar', icon: '🚪' },
  { id: 'plumbing', label: 'Santexnika', icon: '🚿' },
  { id: 'electrical', label: 'Elektrika va yoritish', icon: '💡' },
  { id: 'furniture', label: 'Mebel va dekor', icon: '🛋️' },
]

function Kategories({ selected, onSelect, categories = null }) {
    const totalCount = categories ? categories.reduce((s, c) => s + (c.count || 0), 0) : 0
    const list = categories && categories.length
      ? [{ id: 'all', label: 'Hammasi', icon: '', count: totalCount }, ...categories.map(c => ({ id: c.category, label: c.category, icon: '', count: c.count }))]
      : CATEGORIES
    return (
        <div className="kategories">
            <div className="kategories_scroll">
                {list.map(cat => (
                    <button
                        key={cat.id}
                        className={`kategories_btn ${selected === cat.id ? 'active' : ''}`}
                        onClick={() => onSelect(cat.id)}
                    >
                        <span className="kategories_icon">{cat.icon}</span>
                        <span className="kategories_label">{cat.label}</span>
                        {categories && <span className="kategories_count">{cat.count}</span>}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default Kategories
export { CATEGORIES }
