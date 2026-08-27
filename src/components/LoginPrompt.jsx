import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import '../components_css/login-prompt.css'

export default function LoginPrompt({ onClose }) {
  const { openLogin } = useAuth()
  const { t } = useSettings()

  const handleLogin = () => {
    onClose()
    openLogin()
  }

  return (
    <div className="lp_overlay" onClick={onClose}>
      <div className="lp_modal" onClick={e => e.stopPropagation()}>
        <button className="lp_close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="lp_icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </div>

        <h3>{t('loginRequired')}</h3>
        <p>{t('loginRequiredDesc')}</p>

        <div className="lp_actions">
          <button className="lp_login_btn" onClick={handleLogin}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            {t('goToLogin')}
          </button>
          <button className="lp_cancel" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  )
}
