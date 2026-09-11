import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useSeller } from '../context/SellerContext.jsx'
import './mobile.css'
import MobileBottomNav from './MobileBottomNav.jsx'
import MobileAuthSheet from './MobileAuthSheet.jsx'
import MobileHome from './MobileHome.jsx'
import MobileProductDetail from './MobileProductDetail.jsx'
import MobileCart from './MobileCart.jsx'
import MobileCraftsmen from './MobileCraftsmen.jsx'
import MobileCraftsmanDetail from './MobileCraftsmanDetail.jsx'
import MobileSellerProfile from './MobileSellerProfile.jsx'
import MobileStoresMap from './MobileStoresMap.jsx'
import MobileUserPage from './MobileUserPage.jsx'
import MobileMessages from './MobileMessages.jsx'
import MobileSellerDashboard from './MobileSellerDashboard.jsx'
import MobileLocationPicker from './MobileLocationPicker.jsx'
import MobileCraftsmanDashboard from './MobileCraftsmanDashboard.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'

function MobileNotFound() {
  return (
    <div className="mob_root">
      <div className="mob_empty">
        <div className="mob_empty_title">404 · Sahifa topilmadi</div>
      </div>
    </div>
  )
}

export default function MobileApp() {
  const { showChat } = useSeller()
  const location = useLocation()
  // Pastki navigatsiya bu sahifalarda ko'rsatilmaydi
  const hideBottomNav = ['/user', '/seller-dashboard', '/craftsman-dashboard'].includes(location.pathname)
  return (
    <div className="mob_root">
      <Routes>
        <Route path="/" element={<MobileHome />} />
        <Route path="/product/:id" element={<MobileProductDetail />} />
        <Route path="/cart" element={<MobileCart />} />
        <Route path="/craftsmen" element={<MobileCraftsmen />} />
        <Route path="/craftsman/:id" element={<MobileCraftsmanDetail />} />
        <Route path="/seller/:id" element={<MobileSellerProfile />} />
        <Route path="/stores-map" element={<MobileStoresMap />} />
        <Route path="/user" element={<ProtectedRoute><MobileUserPage /></ProtectedRoute>} />
        <Route path="/messages" element={<MobileMessages />} />
        <Route path="/seller-dashboard" element={<ProtectedRoute roles={['seller']}><MobileSellerDashboard /></ProtectedRoute>} />
        <Route path="/location-picker" element={<MobileLocationPicker />} />
        <Route path="/craftsman-dashboard" element={<ProtectedRoute roles={['craftsman']}><MobileCraftsmanDashboard /></ProtectedRoute>} />
        <Route path="*" element={<MobileNotFound />} />
      </Routes>
      {!hideBottomNav && <MobileBottomNav />}
      {showChat && <ChatPanel />}
      <MobileAuthSheet />
    </div>
  )
}