import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api'

export default function TelegramLoginButton({ className = '', hintClassName = '' }) {
  const { telegramLogin } = useAuth()
  const containerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { botUsername } = await api.auth.telegramConfig()
        if (cancelled || !botUsername || !containerRef.current) return

        const clean = botUsername.replace(/^@/, '')
        window.TelegramLoginWidget = {
          dataOnload: () => {},
          dataAuth: (user) => {
            telegramLogin({ ...user, role: 'buyer' }).catch(() => {})
          },
        }
        containerRef.current.innerHTML = ''
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.setAttribute('data-telegram-login', clean)
        script.setAttribute('data-size', 'large')
        script.setAttribute('data-radius', '8')
        script.setAttribute('data-request-access', 'write')
        script.setAttribute('data-onauth', 'TelegramLoginWidget.dataAuth(user)')
        script.setAttribute('data-userpic', 'false')
        containerRef.current.appendChild(script)
      } catch (err) {
        console.warn('Telegram login widget:', err.message)
      }
    })()
    return () => { cancelled = true }
  }, [telegramLogin])

  return (
    <div className={`auth_tg_block ${className}`}>
      <div className="auth_tg_widget" ref={containerRef}></div>
      <div className={`auth_tg_hint ${hintClassName}`}>Telegram orqali tez kirish — telefon raqami tasdiqlangan, parol shart emas</div>
    </div>
  )
}