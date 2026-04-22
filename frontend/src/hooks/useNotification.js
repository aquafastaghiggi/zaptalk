import { useEffect, useRef } from 'react'

const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='

export function useNotification() {
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND)
    audioRef.current = audio
  }, [])

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }

  const showVisualNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      })
    }
  }

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }

  const notify = (title, options = {}) => {
    playSound()
    showVisualNotification(title, options)
  }

  return {
    notify,
    playSound,
    showVisualNotification,
    requestPermission,
  }
}
