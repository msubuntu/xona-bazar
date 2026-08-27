import { useNavigate } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'
import Header from './header'
import Footer from './Footer'

function NotFound() {
  const navigate = useNavigate()
  const { t } = useSettings()

  return (
    <div>
      <Header />
      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>404</div>
        <h2 style={{ marginBottom: 8 }}>{t('pageNotFound') || 'Sahifa topilmadi'}</h2>
        <p style={{ color: 'var(--text-muted, #9ca3af)', marginBottom: 24 }}>
          {t('pageNotFoundDesc') || "Siz qidirgan sahifa mavjud emas yoki ko'chirilgan"}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 24px', background: 'var(--accent, #3b82f6)', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}
        >
          {t('home')}
        </button>
      </div>
      <Footer />
    </div>
  )
}

export default NotFound
