import { useEffect, useState } from 'react'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  Power,
} from 'lucide-react'
import {
  fetchScalingStatus,
  fetchScalingEvents,
  updateScalingConfig,
} from '../services/api'
import type { ScalingEvent, AutoScalerConfig, ScalingStatus } from '../services/api'

interface Props {
  containerName?: string
}

const AutoScalerPanel = ({ containerName }: Props) => {
  const [status, setStatus] = useState<ScalingStatus | null>(null)
  const [events, setEvents] = useState<ScalingEvent[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable config
  const [editConfig, setEditConfig] = useState<Partial<AutoScalerConfig>>({})

  async function load() {
    try {
      const [s, e] = await Promise.all([
        fetchScalingStatus(),
        fetchScalingEvents(20, containerName),
      ])
      setStatus(s)
      setEvents(e)
      if (Object.keys(editConfig).length === 0 && s.config) {
        setEditConfig(s.config)
      }
    } catch (err) {
      console.error('Failed to load auto-scaler status', err)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [containerName])

  async function handleToggle() {
    setLoading(true)
    try {
      await updateScalingConfig({ enabled: !status?.enabled })
      await load()
    } catch (err) {
      console.error('Failed to toggle auto-scaler', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveConfig() {
    setSaving(true)
    try {
      await updateScalingConfig(editConfig)
      await load()
      setShowConfig(false)
    } catch (err) {
      console.error('Failed to save config', err)
    } finally {
      setSaving(false)
    }
  }

  function getActionIcon(action: string) {
    if (action === 'SCALE_UP') return <TrendingUp size={14} className="text-green-500" />
    if (action === 'SCALE_DOWN') return <TrendingDown size={14} className="text-amber-500" />
    return <Minus size={14} className="text-[var(--neu-text-muted)]" />
  }

  function getActionBadge(action: string) {
    if (action === 'SCALE_UP')
      return 'bg-green-100 text-green-700 border-green-200'
    if (action === 'SCALE_DOWN')
      return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  function formatTime(ts: string) {
    try {
      return new Date(ts).toLocaleTimeString()
    } catch {
      return ts
    }
  }

  const latestEvent = events.length > 0 ? events[0] : null

  return (
    <div className="neu-raised p-6 rounded-[var(--neu-radius)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center neu-inset">
            <Zap size={16} className="text-[var(--neu-accent)]" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[var(--neu-text)]">
              Predictive Auto-Scaler
            </h3>
            <p className="text-[10px] text-[var(--neu-text-muted)] uppercase tracking-wider font-bold">
              Linear Regression Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Settings toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="dash-icon-btn p-1.5"
            title="Configure auto-scaler"
          >
            <Settings size={14} />
          </button>

          {/* Enable/Disable toggle */}
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--neu-radius-xs)] text-xs font-bold transition-all ${
              status?.enabled
                ? 'neu-btn-pressed text-green-600'
                : 'neu-btn text-[var(--neu-text-muted)]'
            }`}
          >
            <Power size={12} />
            {status?.enabled ? 'Active' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Status indicator */}
      {status && (
        <div className="flex items-center gap-4 mb-5 neu-inset px-4 py-3 rounded-[var(--neu-radius-xs)]">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                status.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span className="text-xs font-semibold text-[var(--neu-text-secondary)]">
              {status.enabled ? 'Monitoring' : 'Standby'}
            </span>
          </div>
          {latestEvent && (
            <>
              <div className="w-px h-4 bg-[var(--neu-shadow-dark)]" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--neu-text-muted)]">Last decision:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getActionBadge(
                    latestEvent.action
                  )}`}
                >
                  {getActionIcon(latestEvent.action)}
                  {latestEvent.action.replace('_', ' ')}
                </span>
              </div>
              <div className="w-px h-4 bg-[var(--neu-shadow-dark)]" />
              <div className="text-xs text-[var(--neu-text-muted)]">
                Slope: <span className="font-mono font-bold text-[var(--neu-text)]">{latestEvent.slope.toFixed(2)}</span>
              </div>
              <div className="text-xs text-[var(--neu-text-muted)]">
                CPU: <span className="font-mono font-bold text-[var(--neu-text)]">{latestEvent.current_cpu.toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Config panel (collapsible) */}
      {showConfig && (
        <div className="mb-5 neu-inset p-4 rounded-[var(--neu-radius-xs)] space-y-3">
          <div className="text-xs font-bold text-[var(--neu-text-muted)] uppercase tracking-widest mb-2">
            Scaling Parameters
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'lookback_minutes' as const, label: 'Lookback (min)', type: 'number' },
              { key: 'slope_up_threshold' as const, label: 'Scale-Up Slope', type: 'number', step: '0.5' },
              { key: 'slope_down_threshold' as const, label: 'Scale-Down Slope', type: 'number', step: '0.5' },
              { key: 'cpu_low_for_down' as const, label: 'CPU Low (%)', type: 'number' },
              { key: 'cooldown_seconds' as const, label: 'Cooldown (s)', type: 'number' },
              { key: 'max_replicas' as const, label: 'Max Replicas', type: 'number' },
              { key: 'min_replicas' as const, label: 'Min Replicas', type: 'number' },
              { key: 'ma_window' as const, label: 'MA Window', type: 'number' },
              { key: 'min_data_points' as const, label: 'Min Points', type: 'number' },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--neu-text-muted)] uppercase ml-0.5">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  step={field.step}
                  value={(editConfig as any)[field.key] ?? ''}
                  onChange={(e) =>
                    setEditConfig((prev) => ({
                      ...prev,
                      [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                    }))
                  }
                  className="neu-inset bg-transparent border-none outline-none px-2.5 py-1.5 w-full rounded-[var(--neu-radius-xs)] text-sm text-[var(--neu-text)] font-mono"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="neu-btn text-[var(--neu-accent)] font-bold px-4 py-2 rounded-[var(--neu-radius-xs)] text-sm w-full mt-2"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}

      {/* Events log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[var(--neu-text)]">
            Scaling Event Log
          </h4>
          <span className="text-[10px] text-[var(--neu-text-muted)] font-bold uppercase tracking-wider">
            {events.length} events
          </span>
        </div>

        {events.length === 0 ? (
          <div className="neu-inset rounded-[var(--neu-radius-xs)] p-6 text-center">
            <Activity size={24} className="mx-auto mb-2 text-[var(--neu-text-muted)] opacity-50" />
            <p className="text-xs text-[var(--neu-text-muted)] italic">
              No scaling events recorded yet. Enable the auto-scaler and run containers to see predictions.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="neu-flat px-4 py-3 rounded-[var(--neu-radius-sm)] flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getActionIcon(ev.action)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--neu-text)]">
                        {ev.container_name}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getActionBadge(
                          ev.action
                        )}`}
                      >
                        {ev.action.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--neu-text-muted)] truncate mt-0.5">
                      {ev.reason}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-[10px] font-mono text-[var(--neu-text-secondary)]">
                    {ev.current_replicas} → {ev.target_replicas}
                  </span>
                  <span className="text-[9px] text-[var(--neu-text-muted)]">
                    {formatTime(ev.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AutoScalerPanel
