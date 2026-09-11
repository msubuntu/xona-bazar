const AVATAR_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6']

export function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function normalizeCraftsman(u) {
  return {
    id: u._id,
    _id: u._id,
    name: u.name || "Noma'lum usta",
    avatar: u.avatar || (u.name || '?')[0].toUpperCase(),
    color: u.color || getAvatarColor(u.name),
    verified: u.verified || false,
    rating: u.rating || 0,
    reviewCount: u.reviewCount || 0,
    experience: u.experience || '—',
    district: u.district || '',
    description: u.description || '',
    phone: u.phone || '',
    workingHours: u.workingHours || '09:00 - 18:00',
    services: Array.isArray(u.services) ? u.services : [],
    priceRange: u.priceRange || '',
    completedJobs: u.completedJobs || 0,
    available: u.available !== false,
    portfolio: u.portfolio || [],
    completedWorks: u.completedWorks || [],
    location: u.location || '',
    lat: u.lat,
    lng: u.lng,
  }
}