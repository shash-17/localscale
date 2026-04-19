import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { fetchPolicyViolations } from '../services/api'
import type { PolicyViolation } from '../services/api'

interface Props {
  containerName?: string
  limit?: number
}

function formatMetric(metric: string): string {
  const m = (metric || '').toLowerCase()
  if (m === 'cpu_percent') return 'CPU %'
  if (m === 'mem_mb') return 'Memory (MB)'
  if (m === 'carbon') return 'Carbon (g)'
  if (m === 'cost') return 'Cost ($)'
  return metric
}

function formatObserved(v: PolicyViolation): string {
  if (v.metric === 'cost') return `$${Number(v.observed).toFixed(6)}`
  if (v.metric === 'cpu_percent') return `${Number(v.observed).toFixed(1)}%`
  if (v.metric === 'mem_mb') return `${Number(v.observed).toFixed(2)} MB`
  if (v.metric === 'carbon') return `${Number(v.observed).toFixed(3)} g`
  return String(v.observed)
}

function formatThreshold(v: PolicyViolation): string {
  if (v.metric === 'cost') return `$${Number(v.threshold).toFixed(6)}`
  if (v.metric === 'cpu_percent') return `${Number(v.threshold).toFixed(1)}%`
  if (v.metric === 'mem_mb') return `${Number(v.threshold).toFixed(2)} MB`
  if (v.metric === 'carbon') return `${Number(v.threshold).toFixed(3)} g`
  return String(v.threshold)
}

const PolicyViolationsPanel = ({ containerName, limit = 20 }: Props) => {
  const [violations, setViolations] = useState<PolicyViolation[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPolicyViolations(limit, containerName)
      setViolations(data)
    } catch (err) {
      console.error('Failed to load policy violations', err)
    } finally {
      setLoading(false)
    }
  }, [containerName, limit])

  useEffect(() => {
    void load()
    const iv = setInterval(() => {
      void load()
    }, 5000)
    return () => clearInterval(iv)
  }, [load])

  const latestViolationTime = useMemo(() => {
    if (violations.length === 0) return null
    try {
      return new Date(violations[0].timestamp).toLocaleTimeString()
    } catch {
      return violations[0].timestamp
    }
  }, [violations])

  return (
    <div className="neu-raised p-6 rounded-[var(--neu-radius)] w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center neu-inset">
            <ShieldAlert size={16} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[var(--neu-text)]">Policy Violations</h3>
            <p className="text-[10px] text-[var(--neu-text-muted)] uppercase tracking-wider font-bold">
              {containerName ? `Scoped: ${containerName}` : 'Global stream'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-[var(--neu-text)]">{violations.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)]">
            Recent events
          </div>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="mb-3 text-xs text-[var(--neu-text-muted)]">
          Latest at <span className="font-semibold text-[var(--neu-text)]">{latestViolationTime}</span>
        </div>
      )}

      {violations.length === 0 ? (
        <div className="neu-inset rounded-[var(--neu-radius-xs)] p-6 text-center">
          <AlertTriangle size={22} className="mx-auto mb-2 text-[var(--neu-text-muted)] opacity-60" />
          <p className="text-xs text-[var(--neu-text-muted)] italic">
            {loading ? 'Checking policy stream...' : 'No violations detected in the selected window.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {violations.map((v) => (
            <div key={v.id} className="neu-flat px-4 py-3 rounded-[var(--neu-radius-sm)]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-[var(--neu-text)] truncate">
                  {v.container_name}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                  Violation
                </span>
              </div>

              <div className="text-xs text-[var(--neu-text-secondary)] mb-1">
                <span className="font-semibold text-[var(--neu-text)]">{formatMetric(v.metric)}</span>
                {' '}observed{' '}
                <span className="font-mono font-semibold text-red-500">{formatObserved(v)}</span>
                {' '}over threshold{' '}
                <span className="font-mono font-semibold">{formatThreshold(v)}</span>
                {' '}({v.period})
              </div>

              <div className="text-[10px] text-[var(--neu-text-muted)] font-mono truncate">
                {v.policy || 'Structured policy rule'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PolicyViolationsPanel
