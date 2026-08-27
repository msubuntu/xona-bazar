# Graph Report - .  (2026-08-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 140 nodes · 370 edges · 10 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App.jsx
- react
- package.json
- UserPage.jsx
- useSettings
- devDependencies
- SettingsContext.jsx
- header.jsx
- .oxlintrc.json

## God Nodes (most connected - your core abstractions)
1. `useSettings()` - 31 edges
2. `react` - 27 edges
3. `useAuth()` - 21 edges
4. `useCart()` - 21 edges
5. `Header()` - 13 edges
6. `Footer()` - 9 edges
7. `useSeller()` - 9 edges
8. `UserPage()` - 8 edges
9. `LoginPrompt()` - 7 edges
10. `ProductCard()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `HomePage()` --calls--> `useSettings()`  [EXTRACTED]
  src/App.jsx → src/context/SettingsContext.jsx
- `CartPage()` --calls--> `useSettings()`  [EXTRACTED]
  src/components/CartPage.jsx → src/context/SettingsContext.jsx
- `CartPanel()` --calls--> `useCart()`  [EXTRACTED]
  src/components/CartPanel.jsx → src/context/CartContext.jsx
- `ChatPanel()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ChatPanel.jsx → src/context/AuthContext.jsx
- `ChatPanel()` --calls--> `useSettings()`  [EXTRACTED]
  src/components/ChatPanel.jsx → src/context/SettingsContext.jsx

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.18
Nodes (17): App(), CartPage(), CartPanel(), ChatPanel(), Footer(), ProductDetail(), ProductSkeleton(), INITIAL_MY_PRODUCTS (+9 more)

### Community 1 - "react"
Cohesion: 0.12
Nodes (14): react, Banner(), BANNERS, CATEGORIES, Kategories(), AuthContext, AuthProvider(), FavoritesContext (+6 more)

### Community 2 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, react, react-dom, tailwindcss, @tailwindcss/vite, name, private, scripts (+10 more)

### Community 3 - "UserPage.jsx"
Cohesion: 0.17
Nodes (12): CustomSelect(), DeleteAccountModal(), PasswordModal(), TwoFactorModal(), ADDRESSES, ADDRESSES_TITLE, CURRENCY_OPTIONS, FAVORITES (+4 more)

### Community 4 - "useSettings"
Cohesion: 0.33
Nodes (10): HomePage(), AuthModal(), LoginPrompt(), ProductCard(), ReviewForm(), SellerDashboard(), UserPage(), useAuth() (+2 more)

### Community 5 - "devDependencies"
Cohesion: 0.18
Nodes (11): oxlint, devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react, @types/react (+3 more)

### Community 6 - "SettingsContext.jsx"
Cohesion: 0.22
Nodes (8): FilterPanel(), SORT_OPTIONS, DEFAULTS, loadSettings(), RATES, SettingsContext, SettingsProvider(), translations

### Community 7 - "header.jsx"
Cohesion: 0.39
Nodes (6): Header(), MessagesPage(), INITIAL_CONVERSATIONS, MessagesContext, MessagesProvider(), useMessages()

### Community 8 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

## Knowledge Gaps
- **44 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.jsx`, `UserPage.jsx`, `useSettings`, `SettingsContext.jsx`, `header.jsx`, `.oxlintrc.json`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Why does `plugins` connect `.oxlintrc.json` to `react`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `useSettings()` connect `useSettings` to `App.jsx`, `UserPage.jsx`, `SettingsContext.jsx`, `header.jsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._