import { io } from 'socket.io-client'

let socket = null
let lastJoinedUserId = null

export function getSocket() {
  if (!socket) {
    const isDev = window.location.port === '5173' || window.location.port === '3000'
    const url = isDev ? window.location.origin : window.location.protocol + '//' + window.location.hostname + ':5000'
    socket = io(url, { autoConnect: false, reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 20 })
  }
  return socket
}

export function connectSocket(userId) {
  if (!userId) return getSocket()
  const s = getSocket()
  lastJoinedUserId = userId

  const joinHandler = () => {
    s.emit('join', userId)
  }

  s.off('connect', joinHandler)
  s.on('connect', joinHandler)

  if (!s.connected) {
    s.connect()
  } else {
    s.emit('join', userId)
  }

  s.off('reconnect', joinHandler)
  s.on('reconnect', () => {
    if (lastJoinedUserId) {
      s.emit('join', lastJoinedUserId)
    }
  })

  return s
}

export function disconnectSocket() {
  lastJoinedUserId = null
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
