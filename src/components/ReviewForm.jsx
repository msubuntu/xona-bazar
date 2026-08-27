import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { api } from '../services/api'
import '../components_css/review.css'

function ReviewForm({ productName, productId, onSubmitted }) {
  const { user, openLogin } = useAuth()
  const { t } = useSettings()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!user) {
    return (
      <div className="review_login_needed">
        <p>{t('loginRequiredDesc')}</p>
        <button onClick={openLogin}>{t('loginPrompt')}</button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="review_success">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #2bc32b)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13"/></svg>
        <h3>Rahmat!</h3>
        <p>Sizning sharhingiz muvaffaqiyatli yuborildi.</p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0 || !productId) return
    setSubmitting(true)
    setError(null)
    try {
      const { product } = await api.products.review(productId, { rating, text })
      setSubmitted(true)
      onSubmitted?.(product)
    } catch (err) {
      setError(err.message || 'Sharh yuborishda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <form className="review_form" onSubmit={handleSubmit}>
      <h3>{productName} uchun sharh yozing</h3>

      <div className="review_stars_input">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            type="button"
            className={`review_star ${s <= displayRating ? 'filled' : ''}`}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
              className={s <= displayRating ? 'fill-amber-400 stroke-amber-400' : 'fill-gray-200 stroke-gray-300'}
              strokeWidth="1">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        ))}
        {displayRating > 0 && (
          <span className="review_rating_label">
            {displayRating === 5 ? 'Ajoyib' : displayRating === 4 ? 'Yaxshi' : displayRating === 3 ? 'O\'rtacha' : displayRating === 2 ? 'Yomon' : 'Juda yomon'}
          </span>
        )}
      </div>

      <textarea
        className="review_textarea"
        rows={4}
        placeholder="Sharhingizni yozing... (ixtiyoriy)"
        value={text}
        onChange={e => setText(e.target.value)}
      />

      {error && <p style={{ color: 'var(--danger, #ef4444)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <button
        type="submit"
        className="review_submit"
        disabled={rating === 0 || submitting}
      >
        {submitting ? '...' : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        )}
        {submitting ? 'Yuklanmoqda...' : 'Sharh yuborish'}
      </button>
    </form>
  )
}

export default ReviewForm
