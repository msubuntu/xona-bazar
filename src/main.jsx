import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import setupLeafletIcons from './services/leafletIcons.js'
setupLeafletIcons()
import App from './App.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { SellerProvider } from './context/SellerContext.jsx'
import { MessagesProvider } from './context/MessagesContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'
import RoleRedirect from './components/RoleRedirect.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
            <CartProvider>
              <FavoritesProvider>
                <SellerProvider>
                  <MessagesProvider>
                    <App />
                    <RoleRedirect />
                  </MessagesProvider>
                </SellerProvider>
              </FavoritesProvider>
            </CartProvider>
            </SettingsProvider>
          </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
