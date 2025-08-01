import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  MapIcon,
  TrophyIcon,
  BellIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { PulseIndicator, PulseSummary } from '@/components/ui/PulseIndicator'
import { LoadingSpinner, LoadingCard } from '@/components/ui/LoadingSpinner'
import { dashboardApi } from '@/services/api'
import { DashboardSummary, PulseData } from '@/types'
import { formatDistanceToNow, format } from 'date-fns'

const HomePage: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h')

  // Fetch dashboard summary
  const { 
    data: summary, 
    isLoading: summaryLoading, 
    error: summaryError 
  } = useQuery({
    queryKey: ['dashboard-summary', selectedTimeframe],
    queryFn: () => dashboardApi.getSummary({ hours: getHoursFromTimeframe(selectedTimeframe) }),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  // Fetch real-time pulse data
  const { 
    data: pulseData, 
    isLoading: pulseLoading 
  } = useQuery({
    queryKey: ['dashboard-pulse'],
    queryFn: () => dashboardApi.getPulse({ window: 60 }),
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  })

  if (summaryError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">
          <DocumentTextIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Failed to load dashboard</h3>
        <p className="text-nil-dark-400">
          There was an error loading the dashboard data. Please try refreshing the page.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Pulse Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">NIL Pulse Dashboard</h1>
          <p className="text-nil-dark-400 mt-1">Real-time intelligence on the NIL market</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Timeframe selector */}
          <div className="flex bg-nil-dark-800 rounded-lg p-1">
            {['1h', '24h', '7d', '30d'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-nil-pulse-500 text-white'
                    : 'text-nil-dark-300 hover:text-white hover:bg-nil-dark-700'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>

          {/* Live pulse indicator */}
          {pulseData && !pulseLoading && (
            <PulseIndicator 
              level={pulseData.pulse.level} 
              score={pulseData.pulse.score}
              showLabel
              showScore
            />
          )}
        </div>
      </div>

      {/* Pulse Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="New Laws"
          value={summary?.summary.new_laws || 0}
          change={+12}
          trend="up"
          icon={DocumentTextIcon}
          loading={summaryLoading}
        />
        <StatCard
          title="Big Deals"
          value={summary?.summary.big_deals || 0}
          change={-5}
          trend="down"
          icon={TrophyIcon}
          loading={summaryLoading}
        />
        <StatCard
          title="Total Content"
          value={summary?.summary.total_content || 0}
          change={+8}
          trend="up"
          icon={EyeIcon}
          loading={summaryLoading}
        />
        <StatCard
          title="Active States"
          value={summary?.summary.active_states || 0}
          change={0}
          trend="stable"
          icon={MapIcon}
          loading={summaryLoading}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pulse Summary and Hot Topics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pulse Summary */}
          {pulseData && (
            <PulseSummary
              current={{ level: pulseData.pulse.level, score: pulseData.pulse.score }}
              trend="up"
              change={15}
              timeframe="1 hour ago"
            />
          )}

          {/* Hot Topics */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Hot Topics</h3>
              <span className="text-xs text-nil-dark-400">Last 24 hours</span>
            </div>
            <div className="card-body">
              {summaryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-nil-dark-700 rounded animate-pulse flex-1 mr-4" />
                      <div className="h-3 w-8 bg-nil-dark-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {summary?.summary.hot_topics?.slice(0, 5).map((topic, index) => (
                    <motion.div
                      key={topic.topic}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between py-2 hover:bg-nil-dark-700 -mx-3 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-nil-pulse-400">
                          #{index + 1}
                        </span>
                        <span className="text-sm text-white">{topic.topic}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ArrowTrendingUpIcon className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-nil-dark-400">
                          {topic.velocity?.toFixed(1) || '0.0'}/hr
                        </span>
                      </div>
                    </motion.div>
                  )) || (
                    <p className="text-nil-dark-400 text-center py-4">
                      No trending topics at this time
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline: Major Headlines */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Timeline: Major Headlines</h3>
              <span className="text-xs text-nil-dark-400">Last 24 hours</span>
            </div>
            <div className="card-body">
              {summaryLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-nil-dark-700 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-nil-dark-700 rounded animate-pulse w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {summary?.recentContent?.slice(0, 5).map((content, index) => (
                    <motion.div
                      key={content.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start space-x-3 py-3 hover:bg-nil-dark-700 -mx-3 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          content.importance_score >= 80 ? 'bg-red-400' :
                          content.importance_score >= 60 ? 'bg-yellow-400' : 'bg-green-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {content.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-nil-dark-400">
                            {formatDistanceToNow(new Date(content.published_at), { addSuffix: true })}
                          </span>
                          <span className="text-xs text-nil-pulse-400 capitalize">
                            {content.primary_category.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-nil-dark-400">
                            Score: {content.importance_score}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )) || (
                    <p className="text-nil-dark-400 text-center py-4">
                      No recent content available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - State Activity Map, Alerts, Deals */}
        <div className="space-y-6">
          {/* State Law Map */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">State Law Map</h3>
              <button className="text-xs text-nil-pulse-400 hover:text-nil-pulse-300">
                View All
              </button>
            </div>
            <div className="card-body">
              <StateActivityMap 
                stateActivity={summary?.stateActivity || []}
                loading={summaryLoading}
              />
            </div>
          </div>

          {/* My Alerts */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">My Alerts</h3>
              <BellIcon className="h-5 w-5 text-nil-dark-400" />
            </div>
            <div className="card-body">
              <div className="text-center py-4">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-nil-dark-300">Active Alerts</span>
                  <span className="text-nil-pulse-400 font-medium">
                    {summary?.userAlerts.active || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nil-dark-300">Triggered Today</span>
                  <span className="text-orange-400 font-medium">
                    {summary?.userAlerts.triggered_today || 0}
                  </span>
                </div>
                <button className="btn-primary btn-sm mt-4 w-full">
                  Manage Alerts
                </button>
              </div>
            </div>
          </div>

          {/* Top NIL Deals */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Top NIL Deals</h3>
              <span className="text-xs text-nil-dark-400">This week</span>
            </div>
            <div className="card-body">
              {summaryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="space-y-1 flex-1">
                        <div className="h-3 bg-nil-dark-700 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-nil-dark-700 rounded animate-pulse w-1/2" />
                      </div>
                      <div className="h-4 w-16 bg-nil-dark-700 rounded animate-pulse ml-3" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {summary?.summary.top_athletes?.slice(0, 5).map((athlete, index) => (
                    <motion.div
                      key={athlete.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between py-2 hover:bg-nil-dark-700 -mx-3 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{athlete.name}</p>
                        <p className="text-xs text-nil-dark-400">{athlete.deals} deals</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-nil-pulse-400">
                          #{index + 1}
                        </span>
                      </div>
                    </motion.div>
                  )) || (
                    <p className="text-nil-dark-400 text-center py-4">
                      No deal data available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Components

interface StatCardProps {
  title: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon,
  loading 
}) => {
  if (loading) {
    return <LoadingCard />
  }

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-nil-dark-400'
  }

  const TrendIcon = trend === 'up' ? ArrowTrendingUpIcon : 
                   trend === 'down' ? ArrowTrendingDownIcon : 
                   ClockIcon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-nil-dark-300">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-nil-dark-700 rounded-lg">
          <Icon className="h-6 w-6 text-nil-pulse-400" />
        </div>
      </div>
      
      <div className="flex items-center mt-4">
        <div className={`flex items-center ${trendColors[trend]}`}>
          <TrendIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">
            {trend === 'stable' ? 'No change' : `${Math.abs(change)}%`}
          </span>
        </div>
        <span className="text-xs text-nil-dark-400 ml-2">vs last period</span>
      </div>
    </motion.div>
  )
}

interface StateActivityMapProps {
  stateActivity: Array<{ state: string; activity: number }>
  loading?: boolean
}

const StateActivityMap: React.FC<StateActivityMapProps> = ({ stateActivity, loading }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-3 bg-nil-dark-700 rounded animate-pulse w-12" />
            <div className="h-3 bg-nil-dark-700 rounded animate-pulse w-8" />
          </div>
        ))}
      </div>
    )
  }

  const maxActivity = Math.max(...stateActivity.map(s => s.activity), 1)

  return (
    <div className="space-y-2">
      <div className="text-xs text-nil-dark-400 mb-3">
        Most active states (mentions)
      </div>
      {stateActivity.slice(0, 10).map((state, index) => (
        <motion.div
          key={state.state}
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: '100%' }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between py-1"
        >
          <span className="text-xs font-medium text-nil-dark-300 w-8">
            {state.state}
          </span>
          <div className="flex-1 mx-2">
            <div className="h-2 bg-nil-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(state.activity / maxActivity) * 100}%` }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="h-full bg-nil-pulse-500 rounded-full"
              />
            </div>
          </div>
          <span className="text-xs text-nil-dark-400 w-6 text-right">
            {state.activity}
          </span>
        </motion.div>
      ))}
      {stateActivity.length === 0 && (
        <p className="text-nil-dark-400 text-center py-4 text-sm">
          No state activity data available
        </p>
      )}
    </div>
  )
}

// Helper function
function getHoursFromTimeframe(timeframe: string): number {
  switch (timeframe) {
    case '1h': return 1
    case '24h': return 24
    case '7d': return 168
    case '30d': return 720
    default: return 24
  }
}

export default HomePage