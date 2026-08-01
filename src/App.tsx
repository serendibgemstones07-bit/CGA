import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GemstoneList } from './pages/GemstoneList';
import { GemstoneDetail } from './pages/GemstoneDetail';
import { GemstoneForm } from './pages/GemstoneForm';
import { BuyerSharePage } from './pages/BuyerSharePage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminManagement } from './pages/AdminManagement';
import { InviteSignup } from './pages/InviteSignup';
import { CatalogSharePage } from './pages/CatalogSharePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/share/:token" element={<BuyerSharePage />} />
          <Route path="/invite/:token" element={<InviteSignup />} />
          <Route path="/catalog/:token" element={<CatalogSharePage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="/gemstones" element={<GemstoneList />} />
            <Route path="/gemstones/add" element={<GemstoneForm mode="add" />} />
            <Route path="/gemstones/:id" element={<GemstoneDetail />} />
            <Route path="/gemstones/:id/edit" element={<GemstoneForm mode="edit" />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminManagement />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
