const API_URL = '/api'

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('xona-token')
  const isFormData = options.body instanceof FormData

  const headers = { ...options.headers }
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Xatolik')
  return data
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => request('/auth/me'),
    updateProfile: (body) => {
      if (body instanceof FormData) return request('/auth/profile', { method: 'PUT', body })
      return request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) })
    },
  },

  products: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/products?${q}`)
    },
    get: (id) => request(`/products/${id}`),
    create: (body) => {
      if (body instanceof FormData) return request('/products', { method: 'POST', body })
      return request('/products', { method: 'POST', body: JSON.stringify(body) })
    },
    update: (id, body) => {
      if (body instanceof FormData) return request(`/products/${id}`, { method: 'PUT', body })
      return request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    },
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    review: (id, body) => request(`/products/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
  },

  orders: {
    list: () => request('/orders'),
    create: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
    updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  conversations: {
    list: () => request('/conversations'),
    create: (sellerId, text) => request('/conversations', { method: 'POST', body: JSON.stringify({ sellerId, text }) }),
    sendMessage: (id, text) => request(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
    markRead: (id) => request(`/conversations/${id}/read`, { method: 'PUT' }),
  },

  sellers: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/sellers?${q}`)
    },
    get: (id) => request(`/sellers/${id}`),
    reviews: (id, params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/sellers/${id}/reviews?${q}`)
    },
    dashboard: () => request('/sellers/me/dashboard'),
    craftsmanDashboard: () => request('/sellers/me/craftsman-dashboard'),
    completedWorks: {
      list: () => request('/sellers/me/completed-works'),
      create: (formData) => request('/sellers/me/completed-works', { method: 'POST', body: formData }),
      delete: (workId) => request(`/sellers/me/completed-works/${workId}`, { method: 'DELETE' }),
    },
    reviews: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/sellers/me/reviews?${q}`)
    },
  },

  sellerProducts: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/products/mine?${q}`)
    },
  },

  sellerOrders: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/orders/seller?${q}`)
    },
    updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  bookings: {
    create: (body) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
    my: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/bookings/my?${q}`)
    },
    craftsman: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/bookings/craftsman?${q}`)
    },
    get: (id) => request(`/bookings/${id}`),
    updateStatus: (id, status, cancelReason) => request(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, cancelReason }) }),
    setPrice: (id, quotedPrice) => request(`/bookings/${id}/price`, { method: 'PUT', body: JSON.stringify({ quotedPrice }) }),
    updatePayment: (id, data) => request(`/bookings/${id}/payment`, { method: 'PUT', body: JSON.stringify(data) }),
    rate: (id, data) => request(`/bookings/${id}/rate`, { method: 'POST', body: JSON.stringify(data) }),
  },
}

export function setToken(token) {
  if (token) localStorage.setItem('xona-token', token)
  else localStorage.removeItem('xona-token')
}

export function getToken() {
  return localStorage.getItem('xona-token')
}
