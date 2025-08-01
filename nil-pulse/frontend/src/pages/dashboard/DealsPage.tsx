import React from 'react'

const DealsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">NIL Deals</h1>
        <p className="text-nil-dark-400 mt-1">Track and analyze NIL deals with leaderboards and filtering</p>
      </div>

      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-nil-pulse-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🏆</span>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Deal Tracking</h3>
        <p className="text-nil-dark-400 mb-4">
          Comprehensive NIL deal database with athlete rankings, value analysis, and market insights.
        </p>
        <p className="text-sm text-nil-dark-500">
          Implementation in progress...
        </p>
      </div>
    </div>
  )
}

export default DealsPage