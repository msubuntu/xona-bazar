# Usta (Craftsman) Tizimi — Muammolar Ro`yxati

Bu hujjat Xona Bazar platformasining usta (craftsman) modulidagi barcha topilgan
muammolarni kuzatish uchun yaratildi. Har bir muammo bosqichma-bosqich tuzatiladi.

---

## 🔴 Kritik (Critical) Muammolar

| # | Muammo | Holat |
|---|--------|-------|
| K1 | `normalizeCraftsman()` va `getAvatarColor()` 4 ta faylda takrorlangan (CraftsmenPage, CraftsmanDetail, MobileCraftsmen, MobileCraftsmanDetail) — shared utility ga chiqarish kerak | ✅ `src/utils/craftsman.js` yaratildi, 4 ta fayl import qilmoqda |
| K2 | `SERVICE_TYPES` va `DISTRICTS` 3 joyda takrorlangan: `data/craftsmen.js` + `CraftsmanDashboard.jsx` da hardcoded. Dashboard `data/craftsmen.js` dan import qilishi kerak | ✅ Dashboard import qilmoqda; `plumber` label `Santexnika` ga moslashtirildi |
| K3 | `completedWorks` User schema ichida (MongoDB 16MB hujjat limiti xavfi) — alohida collection ga chiqarish (uzoq muddatli) | 🔵 |

---

## 🟠 UX Muammolar

| # | Muammo | Joyi | Holat |
|---|--------|------|-------|
| U1 | **Bron qilishda xizmat turi tanlanmaydi** — doim `services[0]` yuboriladi. Formaga service select qo'shish | CraftsmanDetail.jsx:128, MobileCraftsmanDetail.jsx:104 | ✅ Har ikkalasiga select qo'shildi |
| U2 | **Bron bekor qilishda tasdiq so'ralmaydi** va `cancelReason` kiritilmaydi | CraftsmanDashboard.jsx:251, MobileCraftsmanDashboard.jsx:188 | ✅ Tasdiqlash modali + sabab kiritish qo'shildi |
| U3 | **Lightbox ikki state'dan foydalanadi** — `galleryIndices` va `lightboxIndex` zidlashadi (race condition) | MobileCraftsmanDetail.jsx:336-341 | ✅ Faqat `lightboxIndex` yangilanadi |
| U4 | **Xabarlar bo'limi yashirin** — `renderMessages()` hech qachon chaqirilmaydi, CSS `data-section="messages"` ni yashiradi | CraftsmanDashboard.jsx:574, craftsman-dashboard.css:67 | ✅ `messages` bo'limi yoqildi, CSS olib tashlandi |
| U5 | **API xatolar sukut bilan yutiladi** — `.catch(() => {})` va `.catch(e => console.error(e))` | MobileCraftsmen.jsx:58, MobileCraftsmanDetail.jsx:55 | ✅ Xatolik UI ko'rsatiladi (desktop + mobile) |
| U6 | Dashboard **hardcoded o'zbek matnlar** — `t()` tarjima funksiyasi ishlatilmagan, faqat listing/detail sahifalari i18n | CraftsmanDashboard.jsx, MobileCraftsmanDashboard.jsx | ⏳ |
| U7 | **Rasm (blob) URL leak** — `URL.createObjectURL` previews unmount yoki almashtirishda revoke qilinmaydi | CraftsmanDashboard.jsx:169, MobileCraftsmanDashboard.jsx | ✅ `clearWorkImages()` + ref/foydalanuvchi unmount cleanup |
| U8 | Dashboard route'da **auth guard yo'q** — `/craftsman-dashboard` ga usta bo'lmagan foydalanuvchi kira oladi | App.jsx:201, MobileApp.jsx:50 | ✅ `ProtectedRoute roles={['craftsman']}` qo'shildi |
| U9 | Qidiruv oynasi (desktop) — inline styles ko'p; `debouncedSearch` vs `localSearch` zid ishlatilgan | CraftsmenPage.jsx:300-377 | ✅ Yagona `localSearch` + `matchCraftsman`; overlay CSS klasslar (`.cp_search_*`) ga ko'chirildi |
| U10 | Narx kiritish validatsiyasi yo'q (backend + frontend) | bookings.js:182, dashboard | ✅ Backend: `Number.isFinite(price) && price > 0` |

---

## 🟡 Xavfsizlik (Security)

| # | Muammo | Joyi |
|---|--------|------|
| X1 | Narx taklifida backend validatsiya yo'q — `Number(quotedPrice)` NaN yoki manfiy bo'lishi mumkin | ✅ Tuzatildi (U10 bilan) |
| X2 | Sharh endpoint'ida rate limiting yo'q | ✅ `rateLimit()` middleware + `/reviews` da qo'llanildi (`server/middleware/rate-limit.js`) |

---

## 🔵 Arxiv (Tuzatilganlar)

- K1, K2, U1, U2, U3, U4, U5, U7, U8, U9, U10, X1, X2 — 2026-09-08 da tuzatildi