import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { api } from '../services/api'

export default function TelegramBotLink() {
  const { t } = useSettings()
  const [status, setStatus] = useState(null)
  const [code, setCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let active = true
    api.auth.telegramStatus()
      .then(r => { if (active) setStatus(r) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const handleGetCode = useCallback(async () => {
    setBusy(true)
    setErr('')
    setCode(null)
    try {
      const r = await api.auth.telegramLinkCode()
      setCode(r.code)
      if (!status?.botUsername) {
        setStatus(s => ({ ...s, botTokenSet: r.botTokenSet, botUsername: r.botUsername, linked: s?.linked || false }))
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }, [status?.botUsername])

  const handleUnlink = useCallback(async () => {
    if (!window.confirm(t('tgUnlinkConfirm'))) return
    setBusy(true)
    setErr('')
    try {
      await api.auth.telegramUnlink()
      setStatus(s => ({ ...s, linked: false, chatId: '' }))
      setCode(null)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }, [t])

  const copyCode = () => {
    navigator.clipboard?.writeText(`/link ${code}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const username = status?.botUsername ? status.botUsername.replace(/^@/, '') : ''
  const botLink = username ? `https://t.me/${username}` : null

  return (
    <div className="tg-bot">
      <div className="tg-bot-head">
        <span className="tg-bot-icon">🤖</span>
        <div>
          <div className="tg-bot-title">{t('tgBot')}</div>
          <div className="tg-bot-desc">{t('tgBotDesc')}</div>
        </div>
      </div>

      {status && status.botTokenSet === false && (
        <div className="tg-bot-warn">{t('tgNotConfigured')}</div>
      )}

      {!status?.linked ? (
        <>
          {username && (
            <a className="tg-bot-link" href={botLink} target="_blank" rel="noreferrer">
              {t('tgOpenBot')}: @{username}
            </a>
          )}
          {code ? (
            <div className="tg-bot-code-box">
              <div className="tg-bot-code-label">{t('tgCode')}</div>
              <div className="tg-bot-code-row">
                <span className="tg-bot-code">{code}</span>
                <button type="button" className="tg-bot-code-copy" onClick={copyCode}>
                  {copied ? t('tgCopied') : t('tgCopy')}
                </button>
              </div>
              <div className="tg-bot-code-hint">{t('tgExpiresIn')}</div>
              <div className="tg-bot-steps">
                <div>{t('tgCodeStep1').replace('@XonaBazarBot', username ? `@${username}` : '@XonaBazarBot')}</div>
                <div>{t('tgCodeStep2')} → <b>/link {code}</b></div>
              </div>
            </div>
          ) : (
            <button type="button" className="tg-bot-btn" onClick={handleGetCode} disabled={busy}>
              {t('tgGetCode')}
            </button>
          )}
        </>
      ) : (
        <div className="tg-bot-linked">
          <span className="tg-bot-success">✅ {t('tgLinked')}</span>
          <p>{t('tgLinkedChat')}</p>
          <button type="button" className="tg-bot-unlink" onClick={handleUnlink} disabled={busy}>
            {t('tgUnlink')}
          </button>
        </div>
      )}

      {err && <div className="tg-bot-warn">{err}</div>}
    </div>
  )
}