import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LoginCredentials } from '@/types'

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage: React.FC = () => {
  const location = useLocation()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as any)?.from || '/'

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError()
  }, [clearError])

  // Focus email field on mount
  useEffect(() => {
    setFocus('email')
  }, [setFocus])

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    clearError()

    try {
      await login(data as LoginCredentials)
      // Redirect happens automatically via useAuthStore and ProtectedRoute
    } catch (error) {
      console.error('Login failed:', error)
      // Error is handled by the auth store
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-nil-dark-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mx-auto w-16 h-16 bg-nil-pulse-500 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-white font-bold text-2xl">NP</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome to NIL Pulse
          </h2>
          <p className="text-nil-dark-400">
            Sign in to access your NIL intelligence dashboard
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 space-y-6"
        >
          <div className="card p-8">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Global Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-900/20 border border-red-500/30 rounded-lg p-4"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-nil-dark-300 mb-2">
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-nil-dark-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-nil-dark-400 hover:text-nil-dark-300" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-nil-dark-400 hover:text-nil-dark-300" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="btn-primary w-full flex justify-center items-center space-x-2 py-3"
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Demo Credentials */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center text-sm text-nil-dark-400"
          >
            <div className="bg-nil-dark-800 rounded-lg p-4 border border-nil-dark-700">
              <p className="font-medium text-nil-dark-300 mb-2">Demo Credentials</p>
              <div className="space-y-1">
                <p>Email: <span className="font-mono text-nil-pulse-400">demo@nilpulse.com</span></p>
                <p>Password: <span className="font-mono text-nil-pulse-400">demo123</span></p>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center"
          >
            <div className="text-xs text-nil-dark-400 space-y-2">
              <p>
                Powered by{' '}
                <span className="text-nil-pulse-400 font-medium">NIL Gameplan</span>
              </p>
              <div className="flex justify-center space-x-4">
                <a href="#" className="hover:text-nil-dark-300 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-nil-dark-300 transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-nil-dark-300 transition-colors">
                  Support
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Background Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-nil-pulse-500/5 via-transparent to-nil-dark-900" />
        
        {/* Animated circles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-nil-pulse-500/10"
            style={{
              width: Math.random() * 400 + 100,
              height: Math.random() * 400 + 100,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              scale: [1, Math.random() * 0.5 + 0.8],
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default LoginPage