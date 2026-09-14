# Xona Bazar Telegram boti — hujjat

## Umumiy ma'lumot

| | |
|---|---|
| **Asosiy fayl** | `server/services/telegramBot.js` (1041 qator) |
| **Ishga tushiriladigan joy** | `server/server.js:31` → `initTelegramBot()` |
| **Bot nomi** | `@XonaBazarBot` (`.env` → `BOT_USERNAME`) |
| **Sozlama (konfig)** | `.env` → `BOT_TOKEN`, `BOT_WEBHOOK_URL`, `BOT_WEBHOOK_SECRET` |

### Ish rejimlari
- `BOT_TOKEN` sozlanmagan bo'lsa — bot **o'chgan** holatda (kutish rejimi), server ishlayveradi.
- `BOT_WEBHOOK_URL` o'rnatilgan bo'lsa — **webhook** rejimi (Telegram serverlar post yuboradi).
- Aks holda — **poll** rejimi (bot har soniyada `getUpdates` so'raydi).
- Webhook sozlashda xato bo'lsa, avtomatik poll rejimiga o'tadi.

---

## 1. Ulanish (linking) tizimi

Bot sotuvchi/usta akkauntiga Telegram orqali ulanadi:

1. Sayt paneli → Sozlamalar → **Telegram bot** bo'limi.
2. «Ulash kodi olish» tugmasi → `POST /api/auth/telegram/link-code` (`server/routes/auth.js:142`).
3. Faylga 6 xonali kod yaratiladi, 10 daqiqa amal qiladi (`telegramLinkExpiry`).
4. Botga `/link 123456` deb yuboriladi.
5. Kod mos kelsa `user.telegramChatId` saqlanadi, kod o'chiriladi.
6. `/unlink` → ulanish bekor qilinadi.

**User modelida saqlanadigan maydonlar** (`server/models/User.js:34-37`):
- `notifTelegram` (Boolean, default `true`)
- `telegramChatId` (string)
- `telegramLinkCode` (6 xonalik kod)
- `telegramLinkExpiry` (amal qilish muddati)

**Nazorat qoidalari:**
- Kod noto'g'ri yoki muddati o'tgan bo'lsa — xato xabari.
- **Bitta Telegram akkaunt bitta sayt akkauntiga ulanishi mumkin.** Yangi `/link` bilan ulashda oldingi akkauntning ulanishi avtomatik bekor qilinadi (xabarda ko'rsatiladi).
- `/unlink` — ushbu chatga ulangan **barcha** akkauntlarni ajratadi.
- Server ishga tushganda `dedupeTelegramChats()` nostandart holatlarni tozalaydi (bir chat→bir akkaunt kafolati).
- Kod faqat 6 ta raqam bo'lishi shart (`/^\d{6}$/`).

---

## 2. Buyruqlar (komandalar)

Botda asosiy menyu tugmalari + yozma buyruqlar mavjud:

| Buyruq | Tugma | Tavsif |
|---|---|---|
| `/start` | — | Xush kelibsiz + ulash yo'riqnomasi |
| `/link KOD` | — | Akkauntni Telegram orqali ulash |
| `/unlink` | — | Ulanishni bekor qilish |
| `/holat` | 📊 Holat | Ishlar bo'yicha statistika |
| `/productlar` | 📦 Mening mahsulotlarim | Sotuvchining mahsulotlari (paginatsiya, 20 tadan) |
| `/product 1` | — | Mahsulot tafsiloti (narx, ombor, variantlar, reyting) |
| `/stock 1 150` | — | Mahsulot omborini yangilash (sotuvchi) |
| `/buyurtmalar` | 🛒 Buyurtmalar | Buyurtmalar / so'rovlar ro'yxati (paginatsiya) |
| `/buyurtma 1` | — | Buyurtma tafsiloti + boshqaruv tugmalari |
| `/ishlar` | 🖼 Ishlarim | Ustaning tugatgan ishlari |
| `/ish 1` | — | Ish tafsiloti |
| `/broadcast matn` | — | Barcha ulangan foydalanuvchilarga xabar (faqat admin) |
| `/yordam` | ❓ Yordam | Barcha buyruqlar ro'yxati |

**Statistika (`/holat`):**
- **Sotuvchi** uchun: mahsulotlar soni (faol/alohida), buyurtmalar (yangi/ochiq), **bugungi va haftalik savdo summasi**, **top-5 mahsulotlar**, reyting va baholar.
- **Usta** uchun: so'rovlar, kutilyotgan, yakunlangan, **bugungi/haftalik faollik**, bajarilgan ishlar, reyting.
- Oddiy mijoz uchun: faqat sotuvchi/ustalar uchun degan xabar.

**Paginatsiya:** `/productlar` va `/buyurtmalar` 20 tadadan ko'p bo'lsa, pastda **◀️ [sahifa/umumiy] ▶️** tugmalari chiqadi (`page:*` callback). `/productlar 3` / `/buyurtmalar 2` deb sahifa raqamini ham yozish mumkin.

**Rasmlar:** `/product 1` tafsilotida mahsulot rasmi yuboriladi — bitta rasm bo'lsa `sendPhoto`, bir nechta bo'lsa `sendMediaGroup` (sarlavha faqat birinchi rasmda). `/productlar` ro'yxati **fakrat matnli** — thumbnail yuborilmaydi (past yuklama). Rasm URL'lar asosi `PUBLIC_URL` env'idan (default: `https://xona-bazar.onrender.com`) olinadi, tashqi URL'lar o'zicha ishlatiladi.

---

## 3. Inline tugmalar orqali boshqaruv

Bot ichidan buyurtma/so'rov holatini o'zgartirish mumkin.

### Booking (usta uchun) — `bj_*`
| Tugma | Callback | Holat sharti |
|---|---|---|
| ✅ Qabul qilish | `bj_accept:` | `pending` → `quote_accepted` |
| 💬 Narx taklifi | `bj_price:` | `pending` → foydalanuvchi narxni raqamda yozadi → `quote_sent` |
| ▶️ Ishni boshlash | `bj_start:` | `quote_accepted` → `in_progress` |
| ✅ Yakunlash | `bj_done:` | `in_progress` → `completed` (+1 `completedJobs`) |
| ❌ Bekor qilish | `bj_cancel:` | `pending`, `quote_accepted`, `in_progress` → `cancelled` |

### Order (sotuvchi uchun) — `ord_*`
| Tugma | Callback | Holat sharti |
|---|---|---|
| ✅ Tasdiqlash | `ord_accept:` | `pending` → `confirmed` |
| ✅ Yakunlash | `ord_done:` | `confirmed` → `completed` |
| ❌ Bekor qilish | `ord_cancel:` | `pending`, `confirmed` → `cancelled` |

**Xavfsizlik:** har bir tugma faqat ob'ekt egasiga (craftsmanId / items.sellerId bo'yicha) ishlaydi. Boshqa akkaunt bosgan bo'lsa — "Bu sizning buyurtmangiz emas" javobi.

**Narx taklifi oqimi:** usta `bj_price` bosadi → bot "narxni so'mda yozing" deydi → usta `150000` yozadi → mijozga narx taklifi haqida xabar boradi.

---

## 4. Faol notifikatsiyalar (xabarlar)

`notifyUser(userId, text)` funksiyasi orqali sayt hodisalari Telegramda xabar qilib yuboriladi. Xabar faqat quyidagi shartlar bajarilsa boradi:
- `BOT_TOKEN` o'rnatilgan bo'lsa,
- foydalanuvchi `telegramChatId` bilan ulangan bo'lsa,
- `notifTelegram` o'chirilmagan bo'lsa.

**Qayerda ishlatiladi:**

| Hodisa | Foydalanuvchi | Joyi |
|---|---|---|
| Yangi buyurtma | Sotuvchiga | `routes/orders.js:114` |
| **Ombor qolmog'i (STOCK_LOW_WARNING=5)** | **Sotuvchiga** | `routes/orders.js` (stock decrement) |
| **Yangi sotuvchi/usta ro'yxatdan o'tishi** | **Admin(lar)ga** | `routes/auth.js` (register) |
| Buyurtma holati o'zgarishi | Mijozga | `routes/orders.js:147` |
| Yangi chat / suhbat xabari | Suhbatdoshga | `routes/conversations.js:102,148`, `server.js:131` |
| Yangi so'rov (booking) | Ustaga | `routes/bookings.js:42` |
| So'rov holati o'zgarishi | Mijozga | `routes/bookings.js:187,239` |
| Narx taklifi yuborilishi | Mijozga | `services/telegramBot.js` (order price flow) |
| Booking holati o'zgarishi (tugma) | Mijozga | `services/telegramBot.js:695` |
| Order holati o'zgarishi (tugma) | Mijozga | `services/telegramBot.js:731` |

---

## 5. Xavfsizlik

- Webhook so'rovida `X-Telegram-Bot-Api-Secret-Token` tekshiriladi (`server.js:61-69`). Token mos kelmasa — 403.
- Barcha matnlar `esc()` funksiyasi orqali HTML-zararsizlantiriladi (`&`, `<`, `>`, `"`).
- Faqat ro'yxatdan o'tgan `callback` prefiks'lar ishlaydi (`bj_*`, `ord_*`, `page:*`).
- Noma'lum buyruq/xabar — foydalanuvchiga yordam ko'rsatiladi.
- Xabarlar uzunligi `truncate()` bilan 4000 belgiga (buyurtma tafsilotida 3500) cheklanadi.
- `notifTelegram` o'chirilgan foydalanuvchiga xabar yuborilmaydi.

**Admin:** `role: 'admin'` bo'lgan foydalanuvchi `/broadcast` bilan barcha ulanganlarga xabar yuborishi mumkin; yangi sotuvchi/usta ro'yxatdan o'tsa adminlarga avtomatik xabar boradi. Admin sayt paneli orqali emas, faqat DB/seed orqali o'rnatiladi (`scripts/seed-demo-users.js` → `demo-admin@xona.demo`).

---

## 6. Formatlash va til

- Barcha matnlar **o'zbek** tilida, `parse_mode: HTML` bilan yuboriladi.
- Narxlar `uz-UZ` formatida: `1 500 000 so'm` (`fmt()`).
- Sanalar `toLocaleDateString('uz-UZ')` bilan.
- Asosiy menyu `resize_keyboard` tugmalari orqali beriladi (📊 📦 🛒 🖼 ❓).

---

## 7. Frontend aloqasi

- API chaqiruvlar: `src/services/api.js:34-36` → `auth.telegramStatus()`, `auth.telegramLinkCode()`, `auth.telegramUnlink()`.
- Sozlamalar paneli tillari: `src/data/translations.js` → `tgBot`, `tgBotDesc`, `tgCodeHint`, `tgOpenBot`, `tgLinkedChat`, `tgNotConfigured` bloklari (uz/ru/en tillarida).
- `.env` misoli: `server/.env.example`.

---

## 8. .env sozlamalari

```env
BOT_TOKEN=123456789:AAF...        # BotFather'dan olinadigan token
BOT_USERNAME=XonaBazarBot          # Bot username (ixtiyoriy)
BOT_WEBHOOK_URL=https://example.com/telegram/webhook   # (ixtiyoriy) webhook rejimi
BOT_WEBHOOK_SECRET=random_secret   # (ixtiyoriy) webhook xavfsizlik tokeni
```

**Webhook rejimi:** `BOT_WEBHOOK_URL` o'rnatilsa, server `POST /telegram/webhook` endpoint'ini Telegram bilan bog'laydi (server.js:61-69). O'rnatilmasa — poll rejimi ishlaydi.