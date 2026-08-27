export function getGeoErrorMessage(error) {
  if (!error) return ''
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Joylashuvga ruxsat berilmagan. Brauzer manzil satridagi qulf belgisini bosib, \"Joylashuv\" ruxsatini yoqing va sahifani yangilang."
    case error.POSITION_UNAVAILABLE:
      return "Joylashuvingizni aniqlab bo'lmadi. Internet yoki GPS aloqasini tekshiring."
    case error.TIMEOUT:
      return "Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko'ring."
    default:
      return "Joylashuvni aniqlashda xatolik yuz berdi."
  }
}
