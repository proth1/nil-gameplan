import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  HomeIcon, 
  MagnifyingGlassIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-nil-dark-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 404 Animation */}
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="text-8xl font-bold text-nil-pulse-500 mb-4"
            >
              404
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-24 h-1 bg-nil-pulse-500 mx-auto rounded-full"
            />
          </div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold text-white mb-3">
              Page Not Found
            </h1>
            <p className="text-nil-dark-400 leading-relaxed">
              The page you're looking for doesn't exist or has been moved. 
              It might be a broken link or you may have typed the URL incorrectly.
            </p>
          </motion.div>

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
              
              <Link
                to="/search"
                className="btn-secondary flex items-center justify-center space-x-2 px-6 py-3"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Search Content</span>
              </Link>
            </div>

            <button
              onClick={() => window.history.back()}
              className="btn-ghost flex items-center justify-center space-x-2 px-6 py-2 mx-auto"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Go Back</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Helpful Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-12 pt-8 border-t border-nil-dark-700"
        >
          <p className="text-sm text-nil-dark-400 mb-4">
            Or try one of these popular sections:
          </p>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link
              to="/trends"
              className="text-nil-dark-300 hover:text-nil-pulse-400 transition-colors"
            >
              Trending Topics
            </Link>
            <Link
              to="/deals"
              className="text-nil-dark-300 hover:text-nil-pulse-400 transition-colors"
            >
              NIL Deals
            </Link>
            <Link
              to="/states"
              className="text-nil-dark-300 hover:text-nil-pulse-400 transition-colors"
            >
              State Laws
            </Link>
            <Link
              to="/alerts"
              className="text-nil-dark-300 hover:text-nil-pulse-400 transition-colors"
            >
              My Alerts
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default NotFoundPage