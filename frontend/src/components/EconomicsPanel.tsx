import React, { useEffect, useMemo, useState } from 'react'
import { fetchHistory } from '../services/api'
import type { MetricHistory } from '../services/api'

interface Props {
  metrics?: MetricHistory[]
  limit?: number
  containerName?: string
  minimal?: boolean
}

const CSP_MULTIPLIERS: Record<string, number> = {
  'AWS': 1.0,
  'GCP': 0.9,
  'Azure': 1.05,
  'Local Hardware': 0.0,
}

const EconomicsPanel: React.FC<Props> = ({ metrics: initialMetrics, limit = 500, containerName, minimal }) => {
  const [metrics, setMetrics] = useState<MetricHistory[] | null>(initialMetrics ?? null)
  const [csp, setCsp] = useState('AWS')

  useEffect(() => {
    let mounted = true
    // If we're provided metrics directly, just use them.
    if (initialMetrics) {
      setMetrics(initialMetrics)
      return
    }
    
    function load() {
      fetchHistory(limit, containerName).then((m) => {
        if (mounted) setMetrics(m)
      }).catch(() => {})
    }

    load()
    const iv = setInterval(load, 5000)

    return () => {
      mounted = false
      clearInterval(iv)
    }
  }, [initialMetrics, limit, containerName])

  const totals = useMemo(() => {
    if (!metrics) return { cost: 0, carbonKg: 0 }
    const multiplier = CSP_MULTIPLIERS[csp] ?? 1.0
    // Backend estimate is base AWD. Adjust by multiplier.
    const cost = metrics.reduce((s, m) => s + ((m.estimated_cost || 0) * multiplier), 0)
    const carbonG = metrics.reduce((s, m) => s + (m.carbon_g || 0), 0)
    return { cost, carbonKg: carbonG / 1000 }
  }, [metrics, csp])

  return (
    <div className={minimal ? "flex flex-col w-full" : "neu-raised p-6 rounded-[var(--neu-radius)] flex flex-col"}>
      {!minimal && (
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-semibold text-[var(--neu-text)]">
            Economics {containerName && <span className="text-sm font-normal text-[var(--neu-text-secondary)] ml-2">({containerName})</span>}
          </h3>
          <select 
            value={csp} 
            onChange={(e) => setCsp(e.target.value)}
            className="neu-inset bg-transparent outline-none border-none text-sm px-3 py-1.5 rounded-[var(--neu-radius-xs)] text-[var(--neu-text)]"
          >
            {Object.keys(CSP_MULTIPLIERS).map(k => (
              <option key={k} value={k} className="bg-[var(--neu-bg)]">{k} Pricing</option>
            ))}
          </select>
        </div>
      )}

      <div className={`flex items-center ${minimal ? "justify-around w-full" : "flex-wrap gap-6 overflow-hidden"}`}>
        <div className="min-w-0">
          <div className={`${minimal ? "text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)]" : "text-sm text-[var(--neu-text-secondary)] font-medium"} mb-1`}>
             {minimal ? "Network Cost" : "Estimated cost"}
          </div>
          <div className={`${minimal ? "text-xl" : "text-2xl sm:text-3xl"} font-bold tracking-tight text-[var(--neu-text)] truncate`} title={`$${totals.cost.toFixed(6)}`}>
            ${totals.cost.toFixed(minimal ? 4 : 6)}
          </div>
        </div>
        <div className="min-w-0">
          <div className={`${minimal ? "text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)]" : "text-sm text-[var(--neu-text-secondary)] font-medium"} mb-1`}>
             {minimal ? "Carbon Est." : "Carbon footprint"}
          </div>
          <div className={`${minimal ? "text-xl" : "text-2xl sm:text-3xl"} font-bold tracking-tight text-[var(--neu-text)] truncate`} title={`${totals.carbonKg.toFixed(4)} kg CO₂`}>
            {totals.carbonKg.toFixed(minimal ? 2 : 4)} <span className={`${minimal ? "text-[10px]" : "text-base sm:text-lg"} text-[var(--neu-text-muted)] tracking-normal`}>kg CO₂</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EconomicsPanel
