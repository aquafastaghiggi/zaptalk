import { useEffect, useRef } from 'react'

const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='
const NOTIFICATION_PREFS_KEY = 'zaptalk:notification-prefs'

function readPreferences() {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (!raw) {
      return {
        soundEnabled: true,
        visualEnabled: true,
        priorityOnly: false,
        minPriority: 2,
      }
    }
    return {
      soundEnabled: true,
      visualEnabled: true,
      priorityOnly: false,
      minPriority: 2,
      ...JSON.parse(raw),
    }
  } catch {
    return {
      soundEnabled: true,
      visualEnabled: true,
      priorityOnly: false,
      minPriority: 2,
    }
  }
}

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

  const getPreferences = () => readPreferences()

  const showVisualNotification = (title, options = {}) => {
    const prefs = readPreferences()
    if (!prefs.visualEnabled) return
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
    const prefs = readPreferences()
    const priority = Number(options.priority ?? 0)
    if (prefs.priorityOnly && priority < Number(prefs.minPriority ?? 2)) {
      return
    }

    if (prefs.soundEnabled) {
      playSound()
    }
    showVisualNotification(title, options)
  }

  return {
    notify,
    playSound,
    showVisualNotification,
    requestPermission,
    getPreferences,
  }
}
