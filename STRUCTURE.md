# Xona Bazar — Papka Tuzilishi

```
xona_bazar/
├── index.html                          # Vite entry HTML
├── package.json                        # Frontend dependencies
├── vite.config.js                      # Vite config (proxy, host: 0.0.0.0)
├── .gitignore
├── .oxlintrc.json
├── pentesting.md
│
├── public/                             # Static assets
│   ├── favicon.svg
│   ├── icons.svg
│   └── placeholder.png
│
├── src/                                # React frontend
│   ├── main.jsx                        # App entry
│   ├── App.jsx                         # Router, contexts, global components
│   ├── App.css
│   ├── index.css                       # Global styles
│   │
│   ├── components/                     # Page & UI components
│   │   ├── header.jsx                  # Top header, auth, search, logout modal
│   │   ├── Footer.jsx                  # Footer
│   │   ├── BottomNav.jsx               # Mobile bottom navigation
│   │   ├── Banner.jsx                  # Hero banner/slider
│   │   ├── kategories.jsx              # Category grid
│   │   │
│   │   ├── AuthModal.jsx               # Register/Login modal
│   │   ├── LoginPrompt.jsx             # "Login qiling" prompt
│   │   ├── ProtectedRoute.jsx          # Auth guard wrapper
│   │   │
│   │   ├── ProductCard.jsx             # Product card (grid item)
│   │   ├── ProductDetail.jsx           # Product detail page
│   │   ├── ProductSkeleton.jsx         # Loading skeleton
│   │   ├── FilterPanel.jsx             # Category/price/rating filters
│   │   ├── CustomSelect.jsx            # Custom dropdown select
│   │   │
│   │   ├── SellerProfile.jsx           # Seller public profile
│   │   ├── SellerDashboard.jsx         # Seller dashboard (products, orders, settings)
│   │   ├── StoreMap.jsx                # Leaflet map with markers
│   │   ├── StoresMapPage.jsx           # Full map page
│   │   ├── NearbyStores.jsx            # Nearby stores grid
│   │   │
│   │   ├── CraftsmenPage.jsx           # Craftsmen listing page
│   │   ├── CraftsmanDetail.jsx         # Craftsman public profile + booking
│   │   ├── CraftsmanDashboard.jsx      # Craftsman dashboard (bookings, portfolio)
│   │   │
│   │   ├── CartPage.jsx                # Cart page
│   │   ├── CartPanel.jsx               # Slide-out cart panel
│   │   ├── UserPage.jsx                # User profile + buyer bookings
│   │   │
│   │   ├── MessagesPage.jsx            # Messages/chat page
│   │   ├── ChatPanel.jsx               # Chat panel (create/find conversation)
│   │   ├── BookingListener.jsx         # Global socket → toast notifications
│   │   │
│   │   ├── LocationPicker.jsx          # Map-based location picker
│   │   ├── ReviewForm.jsx              # Star rating + review form
│   │   ├── SettingsModals.jsx          # Theme/locale/account modals
│   │   └── NotFound.jsx                # 404 page
│   │
│   ├── components_css/                 # Component stylesheets
│   │   ├── header.css
│   │   ├── footer.css
│   │   ├── bottomnav.css
│   │   ├── banner.css
│   │   ├── kategories.css
│   │   ├── auth.css
│   │   ├── login-prompt.css
│   │   ├── productcard.css
│   │   ├── productdetail.css
│   │   ├── filter.css
│   │   ├── custom-select.css
│   │   ├── seller.css
│   │   ├── seller-dashboard.css
│   │   ├── seller-dashboard-v2.css
│   │   ├── storemap.css
│   │   ├── storesmap.css
│   │   ├── nearbystores.css
│   │   ├── craftsmen.css
│   │   ├── craftsman-dashboard.css
│   │   ├── cart.css
│   │   ├── cartpage.css
│   │   ├── userpage.css
│   │   ├── messages.css
│   │   ├── chat.css
│   │   ├── locationpicker.css
│   │   ├── review.css
│   │   ├── settings-modals.css
│   │   ├── toast.css
│   │   └── main.css
│   │
│   ├── context/                        # React contexts
│   │   ├── AuthContext.jsx              # User auth state
│   │   ├── CartContext.jsx              # Shopping cart
│   │   ├── FavoritesContext.jsx         # Saved/favorite items
│   │   ├── MessagesContext.jsx          # Messages & conversations
│   │   ├── SellerContext.jsx            # Seller session
│   │   ├── SettingsContext.jsx          # Theme/locale settings
│   │   └── ThemeContext.jsx             # Dark/light mode
│   │
│   ├── services/                       # API & utilities
│   │   ├── api.js                      # Axios instance + API functions
│   │   ├── socket.js                   # Socket.io client
│   │   └── geo.js                      # Geolocation utility
│   │
│   ├── data/                           # Static data / translations
│   │   ├── craftsmen.js
│   │   ├── products.js
│   │   ├── sellers.js
│   │   └── translations.js
│   │
│   └── assets/                         # Images & icons
│       ├── card_p.jpg
│       ├── hero.png
│       ├── react.svg
│       └── vite.svg
│
├── server/                             # Express backend
│   ├── server.js                       # Entry: middleware, socket.io, routes
│   ├── package.json                    # Backend dependencies
│   ├── .env                            # Secrets (not in git)
│   ├── .env.example                    # Env template
│   │
│   ├── config/
│   │   └── db.js                       # MongoDB connection
│   │
│   ├── middleware/
│   │   └── auth.js                     # JWT verify, role authorize, token gen
│   │
│   ├── models/                         # Mongoose schemas
│   │   ├── User.js                     # Users, craftsmen, sellers, admins
│   │   ├── Product.js                  # Products + variants
│   │   ├── Order.js                    # Orders
│   │   ├── Booking.js                  # Craftsman bookings
│   │   └── Conversation.js             # Chat conversations
│   │
│   ├── routes/                         # API routes
│   │   ├── auth.js                     # Register, login, profile, change-password
│   │   ├── products.js                 # CRUD products
│   │   ├── sellers.js                  # Seller/craftsman listing, dashboard
│   │   ├── bookings.js                 # Craftsman booking system
│   │   ├── conversations.js            # Chat CRUD + messages
│   │   └── orders.js                   # Orders
│   │
│   ├── scripts/                        # Utility scripts
│   │   ├── add-indexes.js              # MongoDB index migration
│   │   ├── query-perf.js               # Query performance testing
│   │   ├── benchmark-100.js            # 100+ product benchmark
│   │   └── cleanup-test.js             # Delete test data
│   │
│   └── uploads/                        # User uploaded files (gitignored)
│       ├── *.png / *.jpg / *.webp      # Product & avatar images
│       └── *.mp4                       # Product videos
```

## Tech Stack

| Layer      | Stack                                          |
|------------|------------------------------------------------|
| Frontend   | React 19 + Vite 8 + Tailwind CSS 4            |
| Backend    | Node.js + Express + Mongoose                   |
| Database   | MongoDB                                        |
| Real-time  | Socket.io                                      |
| Maps       | Leaflet (OSM) + Geolocation API                |
| Auth       | JWT (bcrypt, token versioning)                 |
| Security   | helmet, CORS, express-mongo-sanitize, multer   |
