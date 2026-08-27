import { useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import '../components_css/filter.css'

const SORT_OPTIONS = [
  { value: 'popular', labelKey: 'sortPopular' },
  { value: 'price-asc', labelKey: 'sortPriceLow' },
  { value: 'price-desc', labelKey: 'sortPriceHigh' },
  { value: 'rating', labelKey: 'sortRating' },
  { value: 'reviews', labelKey: 'sortReviews' },
]

function FilterPanel({ filters, onFilterChange, onSortChange, sort, productCount }) {
  const [open, setOpen] = useState(false)
  const { t } = useSettings()

  return (
    <div className="filter_panel">
      <div className="filter_top">
        <div className="filter_left">
          <button className="filter_toggle" onClick={() => setOpen(!open)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            Filtrlash
          </button>
          <span className="filter_count">{productCount} ta mahsulot</span>
        </div>

        <div className="filter_sort">
          <label>Saralash:</label>
          <select value={sort} onChange={e => onSortChange(e.target.value)}>
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>
      </div>

      {open && (
        <div className="filter_body">
          <div className="filter_group">
            <h4>Narx oralig'i</h4>
            <div className="filter_price_inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceMin}
                onChange={e => onFilterChange({ ...filters, priceMin: e.target.value })}
              />
              <span>—</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceMax}
                onChange={e => onFilterChange({ ...filters, priceMax: e.target.value })}
              />
            </div>
          </div>

          <div className="filter_group">
            <h4>Reyting</h4>
            <div className="filter_rating">
              {[4, 3, 2, 1].map(r => (
                <button
                  key={r}
                  className={`filter_rating_btn ${filters.minRating === r ? 'active' : ''}`}
                  onClick={() => onFilterChange({ ...filters, minRating: filters.minRating === r ? 0 : r })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="fill-amber-400 stroke-amber-400" strokeWidth="1">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {r}+
                </button>
              ))}
            </div>
          </div>

          <div className="filter_group">
            <h4>Chegirma</h4>
            <label className="filter_checkbox">
              <input
                type="checkbox"
                checked={filters.onSale}
                onChange={e => onFilterChange({ ...filters, onSale: e.target.checked })}
              />
              Faqat chegirmalilar
            </label>
          </div>

          <button className="filter_clear" onClick={() => onFilterChange({ priceMin: '', priceMax: '', minRating: 0, onSale: false })}>
            Filtrlarni tozalash
          </button>
        </div>
      )}
    </div>
  )
}

export default FilterPanel
