import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@supabase/supabase-js'
import { User, AuthSession, LoginCredentials } from '@/types'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface AuthState {
  // State
  user: User | null
  session: AuthSession | null
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  clearError: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })

        try {
          // Authenticate with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          })

          if (error) {
            throw new Error(error.message)
          }

          if (!data.user || !data.session) {
            throw new Error('Authentication failed')
          }

          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileError || !profile) {
            throw new Error('Failed to load user profile')
          }

          if (!profile.is_active) {
            throw new Error('Account is inactive. Please contact support.')
          }

          const user: User = {
            id: data.user.id,
            email: data.user.email!,
            name: profile.name,
            role: profile.role,
            access_level: profile.access_level,
            created_at: profile.created_at,
            last_login: profile.last_login,
            is_active: profile.is_active,
            metadata: profile.metadata
          }

          const session: AuthSession = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at!
          }

          // Update last login
          await supabase
            .from('user_profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id)

          set({
            user,
            session,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })

          // Set up session refresh timer
          const state = get()
          state.setupRefreshTimer()

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          const { error } = await supabase.auth.signOut()
          
          if (error) {
            console.error('Logout error:', error)
          }

          // Clear all auth state
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          })

          // Clear persisted state
          localStorage.removeItem('nil-pulse-auth-storage')

        } catch (error) {
          console.error('Logout failed:', error)
          // Force logout even if API call fails
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          })
        }
      },

      refreshToken: async () => {
        const { session } = get()
        
        if (!session?.refresh_token) {
          throw new Error('No refresh token available')
        }

        try {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: session.refresh_token
          })

          if (error || !data.session) {
            throw new Error('Token refresh failed')
          }

          const newSession: AuthSession = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at!
          }

          set({ session: newSession })

          // Set up next refresh
          const state = get()
          state.setupRefreshTimer()

        } catch (error) {
          console.error('Token refresh failed:', error)
          // Force logout on refresh failure
          await get().logout()
          throw error
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        const { user } = get()
        
        if (!user) {
          throw new Error('No user logged in')
        }

        set({ isLoading: true, error: null })

        try {
          const { error } = await supabase
            .from('user_profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          if (error) {
            throw new Error(error.message)
          }

          // Update local user state
          set({
            user: { ...user, ...updates },
            isLoading: false
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Profile update failed'
          set({
            isLoading: false,
            error: errorMessage
          })
          throw error
        }
      },

      clearError: () => {
        set({ error: null })
      },

      initialize: async () => {
        if (get().isInitialized) return

        set({ isLoading: true })

        try {
          // Check for existing session
          const { data: { session }, error } = await supabase.auth.getSession()

          if (error) {
            console.error('Session check failed:', error)
            set({ isInitialized: true, isLoading: false })
            return
          }

          if (!session) {
            set({ isInitialized: true, isLoading: false })
            return
          }

          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError || !profile || !profile.is_active) {
            await supabase.auth.signOut()
            set({ isInitialized: true, isLoading: false })
            return
          }

          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: profile.name,
            role: profile.role,
            access_level: profile.access_level,
            created_at: profile.created_at,
            last_login: profile.last_login,
            is_active: profile.is_active,
            metadata: profile.metadata
          }

          const authSession: AuthSession = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at!
          }

          set({
            user,
            session: authSession,
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false
          })

          // Set up session refresh timer
          const state = get()
          state.setupRefreshTimer()

        } catch (error) {
          console.error('Auth initialization failed:', error)
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false
          })
        }
      },

      // Helper function to set up token refresh timer
      setupRefreshTimer: () => {
        const { session } = get()
        
        if (!session) return

        // Refresh token 5 minutes before expiry
        const refreshTime = (session.expires_at * 1000) - Date.now() - (5 * 60 * 1000)
        
        if (refreshTime > 0) {
          setTimeout(async () => {
            try {
              await get().refreshToken()
            } catch (error) {
              console.error('Automatic token refresh failed:', error)
            }
          }, refreshTime)
        }
      }
    }),
    {
      name: 'nil-pulse-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated
      }),
      // Initialize auth on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Initialize auth after hydration
          setTimeout(() => {
            state.initialize()
          }, 100)
        }
      }
    }
  )
)

// Set up auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useAuthStore.getState()

  switch (event) {
    case 'SIGNED_OUT':
      store.logout()
      break
    
    case 'TOKEN_REFRESHED':
      if (session) {
        const authSession: AuthSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at!
        }
        useAuthStore.setState({ session: authSession })
      }
      break
    
    case 'SIGNED_IN':
      // Handle sign in (usually handled by login action)
      break
  }
})

// Export utility functions
export const getAuthHeaders = () => {
  const { session } = useAuthStore.getState()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export const isTokenExpired = () => {
  const { session } = useAuthStore.getState()
  if (!session) return true
  return Date.now() >= session.expires_at * 1000
}

export const requireAuth = () => {
  const { isAuthenticated, user } = useAuthStore.getState()
  if (!isAuthenticated || !user) {
    throw new Error('Authentication required')
  }
  return user
}

export const requireRole = (requiredRole: string) => {
  const user = requireAuth()
  if (user.role !== requiredRole) {
    throw new Error(`Role '${requiredRole}' required`)
  }
  return user
}

export const hasRole = (role: string) => {
  const { user } = useAuthStore.getState()
  return user?.role === role
}

export const hasAccessLevel = (level: string) => {
  const { user } = useAuthStore.getState()
  if (!user) return false
  
  const levels = { standard: 1, premium: 2, enterprise: 3 }
  const userLevel = levels[user.access_level as keyof typeof levels] || 0
  const requiredLevel = levels[level as keyof typeof levels] || 1
  
  return userLevel >= requiredLevel
}