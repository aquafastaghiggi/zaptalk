import { Navigate } from 'react-router-dom'
//import { useAuthStore } from '../stores/authStore'
import { useAuthStore } from "../../stores/authStore";

export default function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}
