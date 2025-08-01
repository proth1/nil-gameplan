import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Lazy load components for better performance
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const DashboardLayout = React.lazy(() => import('@/components/layout/DashboardLayout'))

// Dashboard pages
const HomePage = React.lazy(() => import('@/pages/dashboard/HomePage'))
const ContentPage = React.lazy(() => import('@/pages/dashboard/ContentPage'))
const AlertsPage = React.lazy(() => import('@/pages/dashboard/AlertsPage'))
const TrendsPage = React.lazy(() => import('@/pages/dashboard/TrendsPage'))
const StatesPage = React.lazy(() => import('@/pages/dashboard/StatesPage'))
const DealsPage = React.lazy(() => import('@/pages/dashboard/DealsPage'))
const SearchPage = React.lazy(() => import('@/pages/dashboard/SearchPage'))
const AnalyticsPage = React.lazy(() => import('@/pages/dashboard/AnalyticsPage'))
const SettingsPage = React.lazy(() => import('@/pages/dashboard/SettingsPage'))

// Admin pages
const AdminPage = React.lazy(() => import('@/pages/admin/AdminPage'))
const SourcesPage = React.lazy(() => import('@/pages/admin/SourcesPage'))
const UsersPage = React.lazy(() => import('@/pages/admin/UsersPage'))

// Error pages
const NotFoundPage = React.lazy(() => import('@/pages/error/NotFoundPage'))
const UnauthorizedPage = React.lazy(() => import('@/pages/error/UnauthorizedPage'))

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-nil-dark-900 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="text-nil-dark-400">Loading NIL Pulse...</p>
    </div>
  </div>
)

const App: React.FC = () => {
  const { isInitialized } = useAuthStore()

  // Show loading spinner while auth is initializing
  if (!isInitialized) {
    return <PageLoader />
  }

  return (
    <div className="App">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected dashboard routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="states" element={<StatesPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Admin routes - require admin role */}
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/sources"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SourcesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all route for 404s */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App