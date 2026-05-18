import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { AdminRoute, PrivateRoute } from './components/ProtectedRoute.jsx';

const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const AnimeDetailPage = lazy(() => import('./pages/AnimeDetailPage.jsx'));
const WatchPage = lazy(() => import('./pages/WatchPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/anime/:id" element={<AnimeDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/watch/:animeId/:episodeId"
          element={
            <PrivateRoute>
              <WatchPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff' } }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
