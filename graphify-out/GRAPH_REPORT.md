# Graph Report - xona_bazar  (2026-09-02)

## Corpus Check
- 71 files · ~52,342 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 295 nodes · 748 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dee60100`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- ProductDetail.jsx
- benchmark-100.js
- UserPage.jsx
- Xona Bazar — Papka Tuzilishi
- dependencies
- server.js
- .oxlintrc.json
- dependencies
- CraftsmanDashboard.jsx
- React + Vite

## God Nodes (most connected - your core abstractions)
1. `useSettings()` - 43 edges
2. `react` - 37 edges
3. `useAuth()` - 37 edges
4. `Header()` - 19 edges
5. `useCart()` - 19 edges
6. `useSeller()` - 17 edges
7. `useMessages()` - 15 edges
8. `api` - 15 edges
9. `Footer()` - 12 edges
10. `useFavorites()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `HomePage()` --calls--> `useSettings()`  [EXTRACTED]
  src/App.jsx → src/context/SettingsContext.jsx
- `AuthModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/AuthModal.jsx → src/context/AuthContext.jsx
- `AuthModal()` --calls--> `getGeoErrorMessage()`  [EXTRACTED]
  src/components/AuthModal.jsx → src/services/geo.js
- `BottomNav()` --calls--> `useCart()`  [EXTRACTED]
  src/components/BottomNav.jsx → src/context/CartContext.jsx
- `BottomNav()` --calls--> `useFavorites()`  [EXTRACTED]
  src/components/BottomNav.jsx → src/context/FavoritesContext.jsx

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.09
Nodes (34): HomePage(), AuthModal(), Banner(), BANNERS, CartPage(), CraftsmanDashboard(), AVATAR_COLORS, CraftsmanDetail() (+26 more)

### Community 1 - "ProductDetail.jsx"
Cohesion: 0.18
Nodes (19): CartPanel(), Header(), SEARCH_SUGGESTIONS, estimateTime(), formatDistance(), getDistance(), NearbyStores(), ProductCard() (+11 more)

### Community 2 - "benchmark-100.js"
Cohesion: 0.36
Nodes (7): BRANDS, CATEGORIES, printPlan(), rand(), randInt(), run(), STATUSES

### Community 3 - "UserPage.jsx"
Cohesion: 0.09
Nodes (38): react, App(), BookingListener(), BottomNav(), ChatPanel(), CustomSelect(), LoginPrompt(), MessagesPage() (+30 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (37): leaflet, oxlint, dependencies, leaflet, react, react-dom, react-leaflet, react-router-dom (+29 more)

### Community 7 - "server.js"
Cohesion: 0.06
Nodes (35): connectDB(), authorize(), generateToken(), protect(), bookingSchema, conversationSchema, messageSchema, orderItemSchema (+27 more)

### Community 8 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (27): bcryptjs, cors, dotenv, express, express-mongo-sanitize, helmet, jsonwebtoken, mongoose (+19 more)

### Community 11 - "CraftsmanDashboard.jsx"
Cohesion: 0.25
Nodes (7): BOOKING_FILTERS, DISTRICTS, SECTIONS, SERVICE_TYPES, STATUS_LABELS, LocationPicker(), TASHKENT

### Community 12 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **99 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `UserPage.jsx` to `.oxlintrc.json`, `App.jsx`, `CraftsmanDashboard.jsx`, `ProductDetail.jsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `plugins` connect `.oxlintrc.json` to `UserPage.jsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `useSettings()` connect `App.jsx` to `CraftsmanDashboard.jsx`, `ProductDetail.jsx`, `UserPage.jsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09268707482993198 - nodes in this community are weakly interconnected._
- **Should `UserPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08636363636363636 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._