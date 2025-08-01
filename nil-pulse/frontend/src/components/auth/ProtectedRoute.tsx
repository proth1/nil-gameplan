import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { UserRole, AccessLevel } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredAccessLevel?: AccessLevel
  fallbackPath?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredAccessLevel,
  fallbackPath = '/login'
}) => {
  const location = useLocation()
  const { 
    isAuthenticated, 
    isInitialized, 
    isLoading, 
    user, 
    initialize 
  } = useAuthStore()

  // Initialize auth if not already done
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize()
    }
  }, [isInitialized, isLoading, initialize])

  // Show loading spinner while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-nil-dark-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-nil-dark-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }

  // Check role requirements
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  // Check access level requirements
  if (requiredAccessLevel && !hasRequiredAccessLevel(user.access_level, requiredAccessLevel)) {
    return <Navigate to="/unauthorized" replace />
  }

  // User is authenticated and authorized
  return <>{children}</>
}

// Helper function to check access levels
function hasRequiredAccessLevel(userLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
  const levels = {
    standard: 1,
    premium: 2,
    enterprise: 3
  }

  const userLevelNum = levels[userLevel] || 0
  const requiredLevelNum = levels[requiredLevel] || 1

  return userLevelNum >= requiredLevelNum
}

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallback?: React.ReactNode
  showFallback?: boolean
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
  showFallback = true
}) => {
  const { user } = useAuthStore()

  if (!user || !allowedRoles.includes(user.role)) {
    if (showFallback && fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return <>{children}</>
}

interface AccessLevelGuardProps {
  children: React.ReactNode
  requiredLevel: AccessLevel
  fallback?: React.ReactNode
  showFallback?: boolean
}

export const AccessLevelGuard: React.FC<AccessLevelGuardProps> = ({
  children,
  requiredLevel,
  fallback,
  showFallback = true
}) => {
  const { user } = useAuthStore()

  if (!user || !hasRequiredAccessLevel(user.access_level, requiredLevel)) {
    if (showFallback && fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return <>{children}</>
}

interface ConditionalRenderProps {
  children: React.ReactNode
  condition: boolean
  fallback?: React.ReactNode
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  condition,
  fallback
}) => {
  if (!condition) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

// Hook for checking permissions
export const usePermissions = () => {
  const { user } = useAuthStore()

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false
  }

  const hasAccessLevel = (level: AccessLevel): boolean => {
    return user ? hasRequiredAccessLevel(user.access_level, level) : false
  }

  const isAdmin = (): boolean => {
    return hasRole('admin')
  }

  const canAccessAdminFeatures = (): boolean => {
    return isAdmin()
  }

  const canManageUsers = (): boolean => {
    return isAdmin()
  }

  const canManageSources = (): boolean => {
    return isAdmin()
  }

  const canExportData = (): boolean => {
    return hasAccessLevel('premium') || isAdmin()
  }

  const canCreateAlerts = (): boolean => {
    return user ? user.is_active : false
  }

  const canAccessAnalytics = (): boolean => {
    return hasAccessLevel('standard')
  }

  const canAccessAdvancedAnalytics = (): boolean => {
    return hasAccessLevel('premium') || isAdmin()
  }

  return {
    user,
    hasRole,
    hasAnyRole,
    hasAccessLevel,
    isAdmin,
    canAccessAdminFeatures,
    canManageUsers,
    canManageSources,
    canExportData,
    canCreateAlerts,
    canAccessAnalytics,
    canAccessAdvancedAnalytics
  }
}