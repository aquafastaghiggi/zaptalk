import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import RequestAccessPage from './pages/RequestAccessPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import InviteAcceptPage from './pages/InviteAcceptPage'
import SignupConfirmedPage from './pages/SignupConfirmedPage'
import HelpPage from './pages/HelpPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import SetupWizardPage from './pages/SetupWizardPage'
import WelcomePage from './pages/WelcomePage'
import PrivateRoute from './components/ui/PrivateRoute'
import ToastHost from './components/ui/ToastHost'

export default function App() {
  return (
    <BrowserRouter>
      <ToastHost />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/create-account" element={<Navigate to="/sign-up" replace />} />
        <Route path="/request-access" element={<RequestAccessPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/signup-confirmed" element={<SignupConfirmedPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/app" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="/change-password" element={<PrivateRoute><ChangePasswordPage /></PrivateRoute>} />
        <Route path="/setup" element={<PrivateRoute roles={['admin']}><SetupWizardPage /></PrivateRoute>} />
        <Route path="/welcome" element={<PrivateRoute><WelcomePage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
