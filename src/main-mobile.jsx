import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './mobile/mobile.css'
import MobileApp from './mobile/MobileApp.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { SellerProvider } from './context/SellerContext.jsx'
import { MessagesProvider } from './context/MessagesContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'

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
                  <MobileApp />
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