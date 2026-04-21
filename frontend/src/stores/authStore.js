import { create } from 'zustand'
import api from '../services/api'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('zaptalk_token') || null,
  user: null,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('zaptalk_token', data.access_token)
    set({ token: data.access_token })

    // Carrega dados do usuário
    const { data: me } = await api.get('/auth/me')
    set({ user: me })
  },

  loadMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data })
    } catch {
      set({ token: null, user: null })
      localStorage.removeItem('zaptalk_token')
    }
  },

  logout: () => {
    localStorage.removeItem('zaptalk_token')
    set({ token: null, user: null })
  },
}))
