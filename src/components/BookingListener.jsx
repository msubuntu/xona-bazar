import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../services/socket'
import '../components_css/toast.css'

let toastId = 0

export default function BookingListener() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    if (!user) return
    const socket = getSocket()

    const handleBookingUpdated = (data) => {
      const id = ++toastId
      const statusLabels = {
        quote_sent: `${data.craftsmanName} sizga narx taklif qildi: ${data.quotedPrice ? data.quotedPrice.toLocaleString('uz-UZ') + " so'm" : ''}`,
        quote_accepted: `${data.userName} narxni qabul qildi`,
        in_progress: 'Usta ishni boshladi',
        completed: 'Ish yakunlandi',
        cancelled: 'Buyurtma bekor qilindi',
      }
      const msg = statusLabels[data.status] || `Buyurtma holati yangilandi: ${data.status}`

      setToasts(prev => [...prev, { id, message: msg, status: data.status, bookingId: data.bookingId }])
      setTimeout(() => removeToast(id), 6000)
    }

    socket.on('booking_updated', handleBookingUpdated)
    return () => socket.off('booking_updated', handleBookingUpdated)
  }, [user, removeToast])

  if (toasts.length === 0) return null

  return (
    <div className="toast_container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast_item toast_${toast.status === 'quote_sent' ? 'info' : toast.status === 'cancelled' ? 'danger' : 'success'}`}
          onClick={() => { navigate('/user?section=service-bookings'); removeToast(toast.id) }}
        >
          <div className="toast_icon">
            {toast.status === 'quote_sent' ? '💰' : toast.status === 'cancelled' ? '❌' : toast.status === 'completed' ? '✅' : '🔔'}
          </div>
          <div className="toast_text">
            <p>{toast.message}</p>
            <span>Bosing va buyurtmalarga o'ting</span>
          </div>
          <button className="toast_close" onClick={(e) => { e.stopPropagation(); removeToast(toast.id) }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
    </div>
  )
}
