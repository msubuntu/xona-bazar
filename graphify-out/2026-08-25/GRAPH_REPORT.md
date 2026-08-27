# Graph Report - .  (2026-08-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 247 nodes · 630 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App.jsx
- ProductDetail.jsx
- dependencies
- UserPage.jsx
- react
- package.json
- SettingsContext.jsx
- server.js
- .oxlintrc.json
- dependencies
- SellerDashboard.jsx
- React + Vite
- kategories.jsx
- data/sellers.js

## God Nodes (most connected - your core abstractions)
1. `useSettings()` - 41 edges
2. `react` - 35 edges
3. `useAuth()` - 29 edges
4. `useCart()` - 19 edges
5. `Header()` - 18 edges
6. `useSeller()` - 17 edges
7. `Footer()` - 13 edges
8. `api` - 13 edges
9. `useFavorites()` - 11 edges
10. `useMessages()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `CartPanel()` --calls--> `useCart()`  [EXTRACTED]
  src/components/CartPanel.jsx → src/context/CartContext.jsx
- `HomePage()` --calls--> `useSettings()`  [EXTRACTED]
  src/App.jsx → src/context/SettingsContext.jsx
- `ChatPanel()` --calls--> `useSeller()`  [EXTRACTED]
  src/components/ChatPanel.jsx → src/context/SellerContext.jsx
- `ChatPanel()` --calls--> `getSocket()`  [EXTRACTED]
  src/components/ChatPanel.jsx → src/services/socket.js
- `CraftsmanDetail()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/CraftsmanDetail.jsx → src/context/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.16
Nodes (27): HomePage(), AuthModal(), Banner(), BANNERS, BottomNav(), CartPage(), ChatPanel(), FilterPanel() (+19 more)

### Community 1 - "ProductDetail.jsx"
Cohesion: 0.19
Nodes (14): estimateTime(), formatDistance(), getDistance(), NearbyStores(), ReviewForm(), AuthContext, AuthProvider(), MessagesContext (+6 more)

### Community 2 - "dependencies"
Cohesion: 0.12
Nodes (17): leaflet, dependencies, leaflet, react, react-dom, react-leaflet, react-router-dom, socket.io-client (+9 more)

### Community 3 - "UserPage.jsx"
Cohesion: 0.10
Nodes (21): App(), CartPanel(), CustomSelect(), DeleteAccountModal(), PasswordModal(), TwoFactorModal(), ADDRESSES, ADDRESSES_TITLE (+13 more)

### Community 4 - "react"
Cohesion: 0.25
Nodes (10): react, CraftsmanDetail(), CraftsmenPage(), Footer(), StoreMap(), SellerContext, useSeller(), craftsmen (+2 more)

### Community 5 - "package.json"
Cohesion: 0.10
Nodes (20): oxlint, devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react, name (+12 more)

### Community 6 - "SettingsContext.jsx"
Cohesion: 0.32
Nodes (6): DEFAULTS, loadSettings(), RATES, SettingsContext, SettingsProvider(), translations

### Community 7 - "server.js"
Cohesion: 0.10
Nodes (22): connectDB(), authorize(), generateToken(), protect(), conversationSchema, messageSchema, orderItemSchema, orderSchema (+14 more)

### Community 8 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (23): bcryptjs, cors, dotenv, express, jsonwebtoken, mongoose, multer, dependencies (+15 more)

### Community 11 - "SellerDashboard.jsx"
Cohesion: 0.32
Nodes (6): LocationPicker(), TASHKENT, CATEGORIES, INITIAL_FORM, SECTIONS, SellerDashboard()

### Community 12 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **76 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.jsx`, `ProductDetail.jsx`, `UserPage.jsx`, `SettingsContext.jsx`, `.oxlintrc.json`, `SellerDashboard.jsx`, `kategories.jsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `plugins` connect `.oxlintrc.json` to `react`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `useSettings()` connect `App.jsx` to `ProductDetail.jsx`, `UserPage.jsx`, `react`, `SettingsContext.jsx`, `SellerDashboard.jsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `UserPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0960591133004926 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._