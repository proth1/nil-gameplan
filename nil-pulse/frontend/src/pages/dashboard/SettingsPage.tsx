import React from 'react'

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-nil-dark-400 mt-1">Manage your account and notification preferences</p>
      </div>

      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-nil-pulse-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚙️</span>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Account Settings</h3>
        <p className="text-nil-dark-400 mb-4">
          Configure your profile, notifications, and system preferences.
        </p>
        <p className="text-sm text-nil-dark-500">
          Implementation in progress...
        </p>
      </div>
    </div>
  )
}

export default SettingsPage