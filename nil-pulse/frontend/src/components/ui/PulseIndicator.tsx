import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PulseLevel } from '@/types'

interface PulseIndicatorProps {
  level: PulseLevel
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showScore?: boolean
  className?: string
}

const levelConfig = {
  minimal: {
    color: 'text-nil-dark-500',
    bgColor: 'bg-nil-dark-500',
    ringColor: 'ring-nil-dark-500',
    label: 'Minimal',
    intensity: 0.3
  },
  low: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
    ringColor: 'ring-yellow-400',
    label: 'Low',
    intensity: 0.5
  },
  medium: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-400',
    ringColor: 'ring-orange-400',
    label: 'Medium',
    intensity: 0.7
  },
  high: {
    color: 'text-red-400',
    bgColor: 'bg-red-400',
    ringColor: 'ring-red-400',
    label: 'High',
    intensity: 1.0
  }
}

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    container: 'w-6 h-6',
    text: 'text-xs',
    ring: 'ring-1'
  },
  md: {
    dot: 'w-3 h-3',
    container: 'w-8 h-8',
    text: 'text-sm',
    ring: 'ring-2'
  },
  lg: {
    dot: 'w-4 h-4',
    container: 'w-12 h-12',
    text: 'text-base',
    ring: 'ring-4'
  }
}

export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  level,
  score,
  size = 'md',
  showLabel = true,
  showScore = false,
  className
}) => {
  const config = levelConfig[level]
  const sizeClasses = sizeConfig[size]

  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      {/* Animated pulse dot */}
      <div className={clsx('relative flex items-center justify-center', sizeClasses.container)}>
        {/* Outer pulsing ring */}
        <motion.div
          className={clsx(
            'absolute inset-0 rounded-full',
            config.bgColor,
            'opacity-20'
          )}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.1, 0.2]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Middle ring */}
        <motion.div
          className={clsx(
            'absolute inset-1 rounded-full',
            config.bgColor,
            'opacity-40'
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.2, 0.4]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
        />
        
        {/* Inner dot */}
        <div
          className={clsx(
            sizeClasses.dot,
            config.bgColor,
            'rounded-full relative z-10'
          )}
        />
      </div>

      {/* Labels and score */}
      {(showLabel || showScore) && (
        <div className="flex items-center space-x-2">
          {showLabel && (
            <span className={clsx(sizeClasses.text, config.color, 'font-medium')}>
              {config.label} Pulse
            </span>
          )}
          {showScore && (
            <span className={clsx(sizeClasses.text, 'text-nil-dark-400')}>
              ({score})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface PulseChartProps {
  data: Array<{ timestamp: string; score: number; level: PulseLevel }>
  className?: string
}

export const PulseChart: React.FC<PulseChartProps> = ({ data, className }) => {
  const maxScore = Math.max(...data.map(d => d.score), 100)
  
  return (
    <div className={clsx('h-16 flex items-end space-x-1', className)}>
      {data.map((point, index) => {
        const height = (point.score / maxScore) * 100
        const config = levelConfig[point.level]
        
        return (
          <motion.div
            key={index}
            className={clsx('flex-1 rounded-t', config.bgColor, 'opacity-70')}
            style={{ height: `${height}%` }}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            title={`${point.level} (${point.score}) at ${new Date(point.timestamp).toLocaleTimeString()}`}
          />
        )
      })}
    </div>
  )
}

interface PulseSummaryProps {
  current: { level: PulseLevel; score: number }
  trend: 'up' | 'down' | 'stable'
  change: number
  timeframe: string
  className?: string
}

export const PulseSummary: React.FC<PulseSummaryProps> = ({
  current,
  trend,
  change,
  timeframe,
  className
}) => {
  const config = levelConfig[current.level]
  
  const trendConfig = {
    up: { color: 'text-green-400', icon: '↗' },
    down: { color: 'text-red-400', icon: '↘' },
    stable: { color: 'text-nil-dark-400', icon: '→' }
  }

  return (
    <div className={clsx('card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-nil-dark-300">NIL Market Pulse</h3>
        <PulseIndicator level={current.level} score={current.score} size="sm" showLabel={false} />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className={clsx('text-2xl font-bold', config.color)}>
              {current.score}
            </span>
            <span className={clsx('text-sm font-medium', config.color)}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-nil-dark-400 mt-1">
            Market activity level
          </p>
        </div>
        
        <div className="text-right">
          <div className={clsx('flex items-center space-x-1', trendConfig[trend].color)}>
            <span className="text-lg">{trendConfig[trend].icon}</span>
            <span className="text-sm font-medium">
              {Math.abs(change)}%
            </span>
          </div>
          <p className="text-xs text-nil-dark-400 mt-1">
            vs {timeframe}
          </p>
        </div>
      </div>
    </div>
  )
}

interface PulseAlertProps {
  level: PulseLevel
  message: string
  timestamp: string
  onDismiss?: () => void
  className?: string
}

export const PulseAlert: React.FC<PulseAlertProps> = ({
  level,
  message,
  timestamp,
  onDismiss,
  className
}) => {
  const config = levelConfig[level]
  
  if (level === 'minimal' || level === 'low') {
    return null // Don't show alerts for low activity
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={clsx(
        'flex items-start space-x-3 p-4 rounded-lg border',
        level === 'high' ? 'bg-red-900/20 border-red-500/30' : 'bg-orange-900/20 border-orange-500/30',
        className
      )}
    >
      <PulseIndicator level={level} score={0} size="sm" showLabel={false} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p className={clsx('text-sm font-medium', config.color)}>
              {config.label} Activity Alert
            </p>
            <p className="text-sm text-nil-dark-300 mt-1">
              {message}
            </p>
            <p className="text-xs text-nil-dark-400 mt-2">
              {new Date(timestamp).toLocaleString()}
            </p>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-4 text-nil-dark-400 hover:text-nil-dark-300 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}