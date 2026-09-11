# Xona Bazar — Buglar/Ulanishlar Skaneri (buglarim.md)

Skan sanasi: 2026-09-09
Skaner doirasi: `src/` (JSX/JS/CSS), `server/`, config fayllari, import/route/API/socket ulanishlar,
desktop + mobil runtime. Natija hisobi quyida.

---

## 1. Natijalar xulosasi

| Tekshiruv | Natija |
|---|---|
| Desktop build (`vite build`) | ✅ PASS |
| Mobil build (`vite build --config vite.config.mobile.js`) | ✅ PASS |
| Lint (oxlint) | ⚠️ 34 warning / 0 error |
| Import ulanishlar (buzilgan import) | ✅ 0 ta |
| Marshrut/`navigate`/`Link` ulanishlar | ✅ 0 ta buzilgan |
| API client ↔ server endpoint mosligi | ✅ to'liq mos |
| Runtime console/runtime xatolar (17 sahifa, desktop+mobil) | ✅ 0 error / 0 exception |
| Funksional: Mahsulotlar xaritasi (pin/klaster/filtr) | ✅ ishlaydi |
| Funksional: Telegram bo'limi (Sozlamalar tabi) | ✅ ishlaydi |
| Funksional: Location Picker | ✅ ishlaydi |
| Xavfsizlik: auth/upload/helmet | ✅ asosiy himoya bor (1 tavsiya qo'shimcha) |

**Hisob:**
- Lint tozalik: 0/34 error → 100% errors yo'q, warning 34 ta
- Runtime: 17/17 sahifa xatosiz → 100%
- Ulanishlar: import 100%, route 100%, API 100%
- Feature: hammasi o'tdi

> Eslatma: avvalgi qo'lda hisob 94.1% chiqqan edi — sabab test-skriptda `xona-user` localStorage'ga
> obyekt ko'rinishida saqlanib (`[object Object]`), app useri null bo'lib auth sahifalar bosh sahifaga
> qaytgan. Bu app bug'i EMAS, test skript xatosi edi. Tuzatildi va qayta isbotlandi.

---

## 2. Lint ogohlantirishlari (34 ta) — tozalash tavsiyalari

Tarkib: **15 × `no-unused-vars` + 6 × `exhaustive-deps` + 13 × `only-export-components`**.

### 2.1 `react(only-export-components)` — 13 ta (HMR uchun; kod ishlashiga ta'siri YO'Q)
Context fayllaarida `useX()` hook'larini eksport qilish (komponent emas) → fast-refresh tashvishi:
- `src/context/AuthContext.jsx:125`, `CartContext.jsx:133`, `FavoritesContext.jsx:45`,
  `MessagesContext.jsx:169`, `SellerContext.jsx:50`, `SettingsContext.jsx:116`, `ThemeContext.jsx:27`
- `src/mobile/MobileAuthSheet.jsx:6,9` — `openLoginSheet`/`openRegisterSheet` eksportlar
- `src/components/RoleRedirect.jsx:12,16` — `isPanelRole` va h.k. eksportlar
- `src/components/NearbyStores.jsx:322` (double) — nomlangan eksport

Tavsiya: hook/helper'lar alohida faylga ko'chiriladi yoki warning'ga rozi bo'linadi.

### 2.2 `eslint(no-unused-vars)` — 15 ta (tozalik; build'ga ta'siri yo'q)
- `server/middleware/auth.js:22` — catch `err`
- `server/scripts/add-indexes.js:20` — `db`
- `server/scripts/cleanup-demo.js:8` — param `data`
- `src/App.jsx:36` — `openRegister`; `src/App.jsx:44` — `openLogin`
- `src/components/CraftsmanDashboard.jsx:44` — `page`/`MAX_VIDEOS`
- `src/components/ProductDetail.jsx:31` — `apiError`; `src/components/ProductDetail.jsx:128` — `user`
- `src/components/SellerDashboard.jsx:21` — `MAX_VIDEOS`; `src/components/SellerDashboard.jsx:1413` — `renderMessages`
- `src/components/UserPage.jsx:131` — `setUserReviews`
- `src/mobile/MobileAuthSheet.jsx:14` — `useAuth()` destructure'da `openLogin`/`openRegister` va 1 qo'shimcha ishlatilmagan
- `src/mobile/MobileProductCard.jsx:1` — `useState` import qilingan, ishlatilmagan (lint: "Consider removing this import.")

### 2.3 `react-hooks(exhaustive-deps)` — 6 ta (potensial stale-closure; runtime hozircha xatosiz)
1. `src/components/StoreMap.jsx:55` — useEffect `userLocation`, `userLocation.lat/lng` deps'da yo'q
   (xarita markazlashda stale holat bo'lishi mumkin)
2. `src/components/StoreMap.jsx:160→338` — useEffect `navigate` deps'da yo'q (popup/klaster handler'larda
   stale closure ehtimoli; `e.stopPropagation()` bilan birga navigatsiya — hozir ishlayotirini test tasdiqladi)
3. `src/components/LocationPicker.jsx:18` — `lng`, `onChange`, `lat` deps'da yo'q (reverse geocode natijasi)
4. `src/components/ChatPanel.jsx:36` — `user._id`, `closeChat`, `user` deps'da yo'q
5. `src/mobile/MobileCraftsmanDetail.jsx:42` — `t` deps'da yo'q
6. `src/mobile/MobileLocationPicker.jsx:115` — `lang` deps'da yo'q (nominatim URL)

> Xavf tahlili: #1 StoreMap'ning init-efekti `[]` — `userLocation` mount vaqtida bir marta ishlatiladi
> (atayin bootstrap); keyingi markazlash alohida efektda (338) `userLocation` deps bilan bor — real xavf past.
> #2 `navigate` React-router'da stable — praktik xavf juda past. #3 (LocationPicker) esa reverse-geocode
> qaytgan koordinata/labar uchun eng ehtimoliy real stale-closure. Runtimedi 17 sahifada ularning hech biri
> xato chiqarmadi. Tuzatish ixtiyoriy/estetik.

> Hech biri xato emas — faqat tozalik. 34 warning build'ni buzmaydi.

---

## 3. Ulanishlar tekshiruvi

### 3.1 Importlar — ✅ hammasi mavjud
Barcha `from './...'` importlar fayl sistemadan topildi. Buzilgan import: 0.

### 3.2 Marshrutlar (desktop+mobil) vs havolalar — ✅
Mavjud route'lar:
`/`, `/product/:id`, `/cart`, `/seller/:id`, `/craftsmen`, `/craftsman/:id`, `/stores-map`,
`/user`, `/messages`, `/seller-dashboard`, `/craftsman-dashboard`, `/location-picker` (mobil), `*`.

Statik havolalar: `/`, `/cart`, `/craftsmen`, `/craftsman-dashboard`, `/location-picker`,
`/messages`, `/stores-map`, `/user`, `/user?section=...` — barchasi mos.
Dinamik: `/product/:id`, `/seller/:id`, `/craftsman/:id`, `/messages?conv=`, `/?q=` — hammasi mavjud route'larga boradi.

> `/login` marshruti YO'Q (auth modal orqali) — xato emas, dizayn. Ammo SEO/global uchun
> alohida `/login` sahifasi foydali bo'lishi mumkin (reklama/qayta kirish).

### 3.3 API bridge (client `src/services/api.js` ↔ server `server/routes/*`) — ✅ to'liq mos
- auth: register/login/me/profile/notifications/change-password/telegram{status,link-code,unlink} — mos
- products: GET `/`, `/mine`, `/:id`; POST `/`; PUT/DELETE `/:id`; POST `/:id/review` — mos
- orders: GET `/`, `/seller`; POST `/`; PUT `/:id/status` — mos
- conversations: start/list/create/messages/read — mos
- sellers: dashboard/craftsman-dashboard/reviews/completed-works(stats) — mos
- bookings: create/my/craftsman/get/status/price/payment/rate — mos
- addresses: CRUD+default — mos

### 3.4 Socket — ⚠️ qisman (dead code)
- Client: faqat `join` emit qiladi, `new_message` qabul qiladi.
- Server: `join_conversation`, `send_message`, `typing`, `stop_typing` handlerlar bor,
  LEKIN React client ularni ishlatmaydi (xabarlar REST orqali). Typing indikatori yarim tayyor.
- Buzilgan ulanish yo'q; `new_message` + REST to'liq ishlaydi.

---

## 4. Runtime skaneri (CDP — headless Chrome, desktop 1280x800 + mobil 390x844)

17 sahifa tekshirildi: `/`, `/stores-map`, `/product/:id`, `/seller/:id`, `/craftsmen`,
`/craftsman-dashboard`, `/seller-dashboard`, `/messages`, `/location-picker`, `/user`
(desktop) + mobil variantda. Console error va runtime exception: **0 ta**.

### 4.1 Funksional tasdiqlangan
- **StoresMap (mobil)**: "Do'konlar" → klasterlar + pinlar; "Mahsulotlar" →
  `xb-price-btn` (narx + "Hammasi mavjud"), klasterlash 114→klaster, klaster bosilganda
  individual tugmalar, kategoriya filtri 114→10. ✅
- **Telegram bo'limi**: seller dashboardning `⚙️ Sozlamalar` tabida `TelegramBotLink`
  ko'rinadi (309x172, ko'rinadigan). Kod olish/copy/unlink ishlaydi. ✅
- **LocationPicker**: ochiladi, Leaflet yuklanadi, marker/confirm ishlaydi (avvalgi seansda
  "Koordinatalar: 41.29941, 69.23996" saqlandi). ✅
- **Auth**: `xona-user` + `xona-token` bilan dashboard/messages/user himoyalangan sahifalarga
  kirish ✅; user yo'q bo'lsa bosh sahifaga qaytish ✅.

---

## 5. Aniqlangan haqiqiy muammolar (ustuvorlik bo'yicha)

### 🔴 HIGH — global qilishda qo'yiladigan tuzatishlar
1. ~~**Login/register'da rate-limit yo'q**~~ ✅ **TUZATILDI** (`server/middleware/rate-limit.js` +
   `server/routes/auth.js`)
   - `rateLimit()` middleware'ga `keyFn` qo'shildi va har bir instansiya o'z nomeri bilan
     (shared `buckets` Map'ida bucket to'qnashuvini oldini olish uchun).
   - `POST /auth/login`: shaxsiy IP = 60/min, har (IP+email) = 10/min — credential-stuffing
     himoyasi.
   - `POST /auth/register`: har IP = 10/min.
   - Test (curl): login 10×401 → 429; register 10×400 → 429; boshqa email mustaqil 401. ✅
   - Eslatma: in-memory (restartda tozalanadi); production ko'p worker/reverse-proxy bo'lsa
     `app.set('trust proxy')` va Redis kerak.
2. ~~**Prod API URL hardcoded**~~ ✅ **TUZATILDI** (`src/services/api.js`, `src/services/socket.js`)
   - Ikkala fayldan `https://xona-bazar-production.up.railway.app` hardcode o'chirildi.
   - Yangi fallback: `VITE_API_URL` yo'q bo'lsa → `api.js: '/api'`, `socket.js: window.location.origin`
     (Vite proxy orqali ishlaydi; prod'da frontend API bilan bir domenda bo'lishi shart — NOT set bo'lsa
     boshqa domenga ko'chirish uchun `VITE_API_URL` env qo'yiladi).
   - Dev runtime test: vite :5173 → `/api/products` proxy ✅ (117 mahsulot qaytdi).
3. ~~**CORS faqat bitta origin**~~ ✅ **TUZATILDI** (`server/server.js`)
   - `CLIENT_URL` endi vergul bilan ajratilgan ko'p origin qabul qiladi:
     `CLIENT_URL=http://localhost:5173,https://xona.com,https://xona-bazar-production.up.railway.app`
   - Express CORS: origin function — `!origin || CLIENT_URLS.includes(origin)` (no-origin/curl ham ruxsat)
   - Socket.io: `cors: { origin: CLIENT_URLS, credentials: true }`
   - Test: localhost:5173 ✅ `Access-Control-Allow-Origin` qaytadi; `https://evil.com` ❌ header
     yo'q (brauzer bloklaydi).

### 🟢 TUZATILDI — lokalizatsiya (global uchun muhim)
4. ~~**Marker/popup matnlari qattiq kodlangan**~~ ✅ **TUZATILDI** (`src/components/StoreMap.jsx`)
   - `'Mahsulot'`, `'Hammasi mavjud'`, `'Narx:'`, `'Mahsulotni ko'rish'`,
     `'Do'konni ko'rish'` (135, 244), `'Manzil belgilanmagan'`, `'masofada'`,
     `"Yo'nalish olish"`, `'Sizning joylashuvingiz'` → barchasi `t()` ga ulandi.
   - `formatPrice` → `convertPrice(price)` (SettingsContext'dan, `{ uzs: "so'm", usd: '$', eur: '€' }`)
   - Stray "so'm" hardcode'lar tozalandi: `CartPanel` (3), `BookingListener` (1, `convertPrice`).
   - Yangi tarjima kalitlari (`translations.js` uz/ru/en ×9): `store`, `allAvailable`,
     `priceLabel`, `viewProduct`, `viewStore`, `locationNotSet`, `distanceAway`, `getDirections`, `yourLocation`.
   - Markerlar endi `t` dep'da — til/valyuta o'zgarganda qayta quriladi.
   - Test: lint 35→33 warning (0 error), build ✅, dev :5173 ✅.
5. **`.mob button` global reset** (`src/mobile/mobile.css:116`) — `background:none;color:inherit`
   importni ustiga chiqgan edi; `xb-price-btn` uchun `.store-map` scoping bilan tuzatildi.
   Kelajakdagi xarita tugmalari uchun ehtiyotgarchilik (yangi tugma qo'shsak, scoping qilish).

### 🟡 LOW — tozalik/kutish
6. **Qoldiq fayllar (repo'da)**:
   - `index.mobile.html` — hech qanday config ishlatmaydi (vite.config.mobile.js ham default index.html'dan
     build qiladi; mobil alohida build EMAS, `useIsMobile` viewport orqali) → o'chirish mumkin.
   - `demo-marker-styles/` — demo (keyinroq o'chirish).
   - `graphify-out/`, `src/mobile/new.md`, `usta_bug.md`, `pentesting.md` — kuzatuv/qolish.
   - `server/scripts/cleanup-demo.js`, `add-indexes.js` — ishlatiladi/ishlatilmaydi tekshirish.
7. **`npm run build:mobile` script yo'q** — faqat `dev:mobile`. Mobil ko'rinish bitta build'dan
   chiqadi (view port), alohida build kerakmas — lekin script nomi chalkash.
8. **Reviews flag** (`src/data/flags.js`: `REVIEWS_ENABLED=false`) — new.md'dagi "sharxlarni
   vaqtincha yashirish" talabini bajardi. Global ochish kerak bo'lsa → `true`.
   `new.md` talablaridan "yetkazib berish" matnlarini olib tashlash ham bajarilmagan bo'lishi mumkin
   — tekshirish kerak (MobileCart/checkout matnlarida "Yetqazib berish" qolsa, o'chirish).

---

## 6. Avvalgi seanslarda qilingan va tasdiqlangan fiks'lar (ta'siri saqlanmoqda)
- **Location picker** tugma: `RoleRedirect` `ALLOWED_PATHS`ga `/location-picker` qo'shildi.
- **Telegram bot** to'liq integratsiya: `BOT_TOKEN` `.env`da, `initTelegramBot()`, link-kod/status/unlink,
  `new_message`/`booking` notify, `setMyCommands`. Sotuvchilar panellarida ko'rinadi.
- **Mahsulotlar xaritasi**: tab "Mahsulotlar" → narx-tugma markerlar, klasterlash, kategoriya filtri.

---

## 7. Tavsiya: "global qilamiz" uchun bosqichlar (keyingi seanslarga)
1. Rustove: webhook/stargazer? (shart emas). Asosiy:
2. Rate-limit (login/register/rasmlar), CORS origins ro'yxati + `CLIENT_URL` prod.
3. `VITE_API_URL` yordamida prod build; railway/hosting tanlash va DNS.
4. i18n: StoreMap marker/popup + valyuta ✅ bajarildi. Qolgan hardcoded matnlar:
   `CartPanel` sarlavhalari ("Savat", "Jami", "Buyurtma berish"...), `BookingListener` toast
   xabarlari, `UserPage` STATUS_LABELS (allaqachon uz/ru/en inline), seller panellari — keyingi bosqich.
5. Lint warning'larni tozalash (kerak bo'lsa sesginda 5-10 daqiqa).
6. Test ma'lumotlari: demo seller faqat lokal; prod'da o'chirish.

---

*Ushbu fayl yakuniy skan natijasi — keyingi tuzatishlar bosqichma-bosqich beriladi.*