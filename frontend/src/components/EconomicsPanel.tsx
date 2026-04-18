import React, { useEffect, useMemo, useState } from 'react'
import { fetchHistory } from '../services/api'
import type { MetricHistory } from '../services/api'

interface Props {
  metrics?: MetricHistory[]
  limit?: number
}

const EconomicsPanel: React.FC<Props> = ({ metrics: initialMetrics, limit = 500 }) => {
  const [metrics, setMetrics] = useState<MetricHistory[] | null>(initialMetrics ?? null)

  useEffect(() => {
    let mounted = true
    if (!initialMetrics) {
      fetchHistory(limit).then((m) => mounted && setMetrics(m)).catch(() => {})
    }
    return () => {
      mounted = false
    }
  }, [initialMetrics, limit])

  const totals = useMemo(() => {
    if (!metrics) return { cost: 0, carbonKg: 0 }
    const cost = metrics.reduce((s, m) => s + (m.estimated_cost || 0), 0)
    const carbonG = metrics.reduce((s, m) => s + (m.carbon_g || 0), 0)
    return { cost, carbonKg: carbonG / 1000 }
  }, [metrics])

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
      <h3 className="text-lg font-medium mb-3">Economics</h3>
      <div className="flex items-baseline space-x-8">
        <div>
          <div className="text-sm text-gray-500">Estimated cost</div>
          <div className="text-3xl font-extrabold">${totals.cost.toFixed(6)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Carbon footprint</div>
          <div className="text-3xl font-extrabold">{totals.carbonKg.toFixed(4)} kg CO2</div>
        </div>
      </div>
    </div>
  )
}

export default EconomicsPanel
