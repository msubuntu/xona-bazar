import { useState } from 'react'
import '../components_css/settings-modals.css'

export function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.current || !form.newPass || !form.confirm) {
      setError("Barcha maydonlarni to'ldiring")
      return
    }
    if (form.newPass.length < 6) {
      setError("Yangi parol kamida 6 ta belgi bo'lishi kerak")
      return
    }
    if (form.newPass !== form.confirm) {
      setError("Parollar mos kelmaydi")
      return
    }
    setError('')
    setSuccess(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="sm_overlay" onClick={onClose}>
      <div className="sm_modal" onClick={e => e.stopPropagation()}>
        <button className="sm_close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {success ? (
          <div className="sm_success">
            <div className="sm_success_icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2bc32b" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3>Parol muvaffaqiyatli o'zgartirildi!</h3>
          </div>
        ) : (
          <>
            <div className="sm_header">
              <div className="sm_icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <h3>Parolni o'zgartirish</h3>
              <p>Joriy parolingizni va yangi parolni kiriting</p>
            </div>
            <form className="sm_form" onSubmit={handleSubmit}>
              <div className="sm_field">
                <label>Joriy parol</label>
                <div className="sm_input_wrap">
                  <input type={show.current ? 'text' : 'password'} value={form.current} onChange={e => setForm({...form, current: e.target.value})} placeholder="Joriy parol" />
                  <button type="button" className="sm_eye" onClick={() => setShow({...show, current: !show.current})}>
                    {show.current
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              <div className="sm_field">
                <label>Yangi parol</label>
                <div className="sm_input_wrap">
                  <input type={show.newPass ? 'text' : 'password'} value={form.newPass} onChange={e => setForm({...form, newPass: e.target.value})} placeholder="Kamida 6 ta belgi" />
                  <button type="button" className="sm_eye" onClick={() => setShow({...show, newPass: !show.newPass})}>
                    {show.newPass
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              <div className="sm_field">
                <label>Parolni tasdiqlash</label>
                <div className="sm_input_wrap">
                  <input type={show.confirm ? 'text' : 'password'} value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} placeholder="Yangi parolni qaytadan kiriting" />
                  <button type="button" className="sm_eye" onClick={() => setShow({...show, confirm: !show.confirm})}>
                    {show.confirm
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              {error && <div className="sm_error">{error}</div>}
              <button type="submit" className="sm_submit">Parolni yangilash</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export function TwoFactorModal({ onClose, onEnable }) {
  const [step, setStep] = useState('verify')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleVerify = () => {
    if (code.length !== 6) {
      setError('6 xonali kodni kiriting')
      return
    }
    if (code === '123456') {
      setError('')
      setStep('done')
      onEnable()
      setTimeout(onClose, 1500)
    } else {
      setError('Noto\'g\'ri kod. Sinab ko\'ring: 123456')
    }
  }

  return (
    <div className="sm_overlay" onClick={onClose}>
      <div className="sm_modal" onClick={e => e.stopPropagation()}>
        <button className="sm_close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {step === 'done' ? (
          <div className="sm_success">
            <div className="sm_success_icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2bc32b" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3>Ikki bosqichli autentifikatsiya yoqildi!</h3>
          </div>
        ) : (
          <>
            <div className="sm_header">
              <div className="sm_icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>Ikki bosqichli autentifikatsiya</h3>
              <p>Tasdiqlash kodini kiriting. Sinov uchun: <strong>123456</strong></p>
            </div>
            <div className="sm_code_input">
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
              />
            </div>
            {error && <div className="sm_error">{error}</div>}
            <button className="sm_submit" onClick={handleVerify}>Tasdiqlash</button>
          </>
        )}
      </div>
    </div>
  )
}

export function DeleteAccountModal({ onClose, onDelete }) {
  const [step, setStep] = useState(1)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = () => {
    if (confirmText === 'O\'CHIRISH') {
      onDelete()
      onClose()
    }
  }

  return (
    <div className="sm_overlay" onClick={onClose}>
      <div className="sm_modal sm_danger_modal" onClick={e => e.stopPropagation()}>
        <button className="sm_close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="sm_header">
          <div className="sm_icon danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </div>
          <h3>Hisobni o'chirish</h3>
        </div>

        {step === 1 && (
          <div className="sm_danger_content">
            <p>Hisobingizni o'chirish quyidagilarni keltirib chiqaradi:</p>
            <ul>
              <li>Barcha buyurtmalar tarixi o'chiriladi</li>
              <li>Sevimli mahsulotlar yo'qoladi</li>
              <li>Saqlangan manzillar o'chiriladi</li>
              <li>Amaliyotlar qaytarib bo'lmaydi</li>
            </ul>
            <button className="sm_danger_btn" onClick={() => setStep(2)}>
              Davom etish
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="sm_danger_content">
            <p>O'chirishni tasdiqlash uchun <strong>O'CHIRISH</strong> so'zini kiriting:</p>
            <div className="sm_field">
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="O'CHIRISH"
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontWeight: 700 }}
              />
            </div>
            <button
              className="sm_danger_btn"
              disabled={confirmText !== "O'CHIRISH"}
              onClick={handleDelete}
              style={{ opacity: confirmText === "O'CHIRISH" ? 1 : 0.5 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Hisobni o'chirish
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
