import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ShieldExclamationIcon,
  HomeIcon,
  ArrowLeftIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-nil-dark-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Icon Animation */}
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center"
            >
              <ShieldExclamationIcon className="h-12 w-12 text-red-400" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="text-6xl font-bold text-red-400 mb-4"
            >
              403
            </motion.div>
          </div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold text-white mb-3">
              Access Denied
            </h1>
            <p className="text-nil-dark-400 leading-relaxed mb-4">
              You don't have permission to access this resource. This could be because:
            </p>
            
            <ul className="text-nil-dark-400 text-sm space-y-2 mb-6">
              <li>• Your account doesn't have the required permissions</li>
              <li>• This feature requires a higher access level</li>
              <li>• Your session may have expired</li>
              <li>• The resource requires admin privileges</li>
            </ul>
          </motion.div>

          {/* User Info */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mb-8 p-4 bg-nil-dark-800 rounded-lg border border-nil-dark-700"
            >
              <div className="flex items-center justify-center space-x-3 mb-2">
                <UserIcon className="h-5 w-5 text-nil-dark-400" />
                <span className="text-white font-medium">{user.name}</span>
              </div>
              <div className="text-sm text-nil-dark-400 space-y-1">
                <p>Role: <span className="text-nil-pulse-400 capitalize">{user.role}</span></p>
                <p>Access Level: <span className="text-nil-pulse-400 capitalize">{user.access_level}</span></p>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="btn-primary flex items-center justify-center space-x-2 px-6 py-3"
              >
                <HomeIcon className="h-5 w-5" />
                <span>Go to Dashboard</span>
              </Link>
              
              <button
                onClick={handleGoBack}
                className="btn-secondary flex items-center justify-center space-x-2 px-6 py-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Go Back</span>
              </button>
            </div>

            {/* Logout Option */}
            <div className="pt-4 border-t border-nil-dark-700">
              <p className="text-sm text-nil-dark-400 mb-3">
                If you believe this is an error, try logging out and back in:
              </p>
              <button
                onClick={handleLogout}
                className="btn-ghost text-sm px-4 py-2"
              >
                Sign out and log back in
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-12 pt-8 border-t border-nil-dark-700"
        >
          <p className="text-sm text-nil-dark-400 mb-4">
            Need access to this feature?
          </p>
          
          <div className="space-y-2 text-sm">
            <p className="text-nil-dark-300">
              Contact your administrator or{' '}
              <a 
                href="mailto:support@nilpulse.com"
                className="text-nil-pulse-400 hover:text-nil-pulse-300 transition-colors"
              >
                support@nilpulse.com
              </a>
            </p>
            
            <div className="flex justify-center space-x-4 pt-4">
              <Link
                to="/settings"
                className="text-nil-dark-300 hover:text-nil-pulse-400 transition-colors"
              >
                Account Settings
              </Link>
              <a
                href="mailto:support@nilpulse.com"
                className="text-nil-dark-300 hover:text-nil-pulse-400 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default UnauthorizedPage