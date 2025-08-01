import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { 
  HomeIcon, 
  DocumentTextIcon, 
  BellIcon, 
  TrendingUpIcon,
  MapIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  ServerIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { PulseIndicator } from '@/components/ui/PulseIndicator'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  adminOnly?: boolean
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Content', href: '/content', icon: DocumentTextIcon },
  { name: 'Alerts', href: '/alerts', icon: BellIcon, badge: 'new' },
  { name: 'Trends', href: '/trends', icon: TrendingUpIcon },
  { name: 'State Laws', href: '/states', icon: MapIcon },
  { name: 'Deals', href: '/deals', icon: CurrencyDollarIcon },
  { name: 'Search', href: '/search', icon: MagnifyingGlassIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
]

const adminNavigation: NavigationItem[] = [
  { name: 'Admin Dashboard', href: '/admin', icon: ServerIcon, adminOnly: true },
  { name: 'Sources', href: '/admin/sources', icon: DocumentTextIcon, adminOnly: true },
  { name: 'Users', href: '/admin/users', icon: UserGroupIcon, adminOnly: true },
]

const DashboardLayout: React.FC = () => {
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pulseData, setPulseData] = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isCurrentPath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const canAccessAdminFeatures = user?.role === 'admin'

  // Filter navigation based on user permissions
  const filteredNavigation = navigation.filter(item => !item.adminOnly)
  const filteredAdminNavigation = canAccessAdminFeatures 
    ? adminNavigation.filter(item => item.adminOnly) 
    : []

  return (
    <div className="h-screen flex overflow-hidden bg-nil-dark-900">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex z-40 md:hidden"
          >
            <div 
              className="fixed inset-0 bg-nil-dark-900 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative flex-1 flex flex-col max-w-xs w-full bg-nil-dark-800 border-r border-nil-dark-700"
            >
              <SidebarContent 
                navigation={filteredNavigation}
                adminNavigation={filteredAdminNavigation}
                isCurrentPath={isCurrentPath}
                pulseData={pulseData}
                onCloseSidebar={() => setSidebarOpen(false)}
                showCloseButton
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent 
            navigation={filteredNavigation}
            adminNavigation={filteredAdminNavigation}
            isCurrentPath={isCurrentPath}
            pulseData={pulseData}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-nil-dark-800 border-b border-nil-dark-700 shadow-soft">
          {/* Mobile menu button */}
          <button
            type="button"
            className="px-4 border-r border-nil-dark-700 text-nil-dark-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-nil-pulse-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Breadcrumb and page title */}
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">
                {getPageTitle(location.pathname)}
              </h1>
              {pulseData && (
                <div className="ml-4">
                  <PulseIndicator level={pulseData.level} score={pulseData.score} />
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              {/* Notifications */}
              <button
                type="button"
                className="p-1 rounded-full text-nil-dark-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nil-dark-800 focus:ring-nil-pulse-500"
              >
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" />
              </button>

              {/* User info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-nil-dark-400 capitalize">{user.role}</p>
                </div>
                
                <div className="w-8 h-8 bg-nil-pulse-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-1 rounded-full text-nil-dark-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nil-dark-800 focus:ring-nil-pulse-500 disabled:opacity-50"
                  title="Logout"
                >
                  {isLoggingOut ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-nil-dark-900">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

interface SidebarContentProps {
  navigation: NavigationItem[]
  adminNavigation: NavigationItem[]
  isCurrentPath: (path: string) => boolean
  pulseData: any
  onCloseSidebar?: () => void
  showCloseButton?: boolean
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  navigation,
  adminNavigation,
  isCurrentPath,
  pulseData,
  onCloseSidebar,
  showCloseButton
}) => {
  return (
    <div className="flex flex-col h-full bg-nil-dark-800 border-r border-nil-dark-700">
      {/* Logo and close button */}
      <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 border-b border-nil-dark-700">
        <Link to="/" className="flex items-center space-x-2" onClick={onCloseSidebar}>
          <div className="w-8 h-8 bg-nil-pulse-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NP</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">NIL Pulse</h2>
            <p className="text-xs text-nil-dark-400">Intelligence Platform</p>
          </div>
        </Link>
        
        {showCloseButton && (
          <button
            type="button"
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-nil-pulse-500"
            onClick={onCloseSidebar}
          >
            <span className="sr-only">Close sidebar</span>
            <XMarkIcon className="h-6 w-6 text-nil-dark-400" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <NavigationLink
              key={item.name}
              item={item}
              isActive={isCurrentPath(item.href)}
              onClick={onCloseSidebar}
            />
          ))}

          {adminNavigation.length > 0 && (
            <>
              <div className="pt-6 pb-2">
                <h3 className="px-3 text-xs font-semibold text-nil-dark-400 uppercase tracking-wider">
                  Administration
                </h3>
              </div>
              {adminNavigation.map((item) => (
                <NavigationLink
                  key={item.name}
                  item={item}
                  isActive={isCurrentPath(item.href)}
                  onClick={onCloseSidebar}
                />
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-nil-dark-700">
          <Link
            to="/settings"
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-nil-dark-300 hover:bg-nil-dark-700 hover:text-white transition-colors"
            onClick={onCloseSidebar}
          >
            <CogIcon className="mr-3 h-5 w-5" />
            Settings
          </Link>
        </div>
      </div>
    </div>
  )
}

interface NavigationLinkProps {
  item: NavigationItem
  isActive: boolean
  onClick?: () => void
}

const NavigationLink: React.FC<NavigationLinkProps> = ({ item, isActive, onClick }) => {
  const baseClasses = "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
  const activeClasses = "bg-nil-pulse-500 text-white"
  const inactiveClasses = "text-nil-dark-300 hover:bg-nil-dark-700 hover:text-white"

  return (
    <Link
      to={item.href}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      onClick={onClick}
    >
      <item.icon
        className={`mr-3 h-5 w-5 flex-shrink-0 ${
          isActive ? 'text-white' : 'text-nil-dark-400 group-hover:text-white'
        }`}
      />
      <span className="flex-1">{item.name}</span>
      {item.badge && (
        <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
          isActive 
            ? 'bg-nil-pulse-600 text-white' 
            : 'bg-nil-dark-700 text-nil-dark-300 group-hover:bg-nil-dark-600'
        }`}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/': 'Dashboard',
    '/content': 'NIL Content',
    '/alerts': 'My Alerts',
    '/trends': 'Trends & Analysis',
    '/states': 'State Laws',
    '/deals': 'NIL Deals',
    '/search': 'Search',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
    '/admin': 'Admin Dashboard',
    '/admin/sources': 'Content Sources',
    '/admin/users': 'User Management'
  }

  return routes[pathname] || 'NIL Pulse'
}

export default DashboardLayout