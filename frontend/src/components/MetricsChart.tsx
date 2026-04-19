import React, { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { fetchHistory } from '../services/api'
import type { Container } from '../services/api'

interface Props {
  containers?: Container[]
  limit?: number
}

type MetricType = 'cpu' | 'mem' | 'cost' | 'carbon'
type ChartPoint = { time: string } & Record<string, number | string>

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const MetricsChart: React.FC<Props> = ({ containers = [], limit = 200 }) => {
  const [data, setData] = useState<ChartPoint[]>([])
  const [metricType, setMetricType] = useState<MetricType>('cost')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (containers.length === 0) {
        setData([])
        return
      }
      try {
        const all = await fetchHistory(limit)
        
        // Group by timestamp
        const grouped: Record<string, ChartPoint> = {}
        for (const m of all) {
          const t = new Date(m.timestamp).toLocaleTimeString()
          if (!grouped[t]) {
            grouped[t] = { time: t }
          }
          grouped[t][`${m.container_name}_cpu`] = m.cpu_pct
          grouped[t][`${m.container_name}_mem`] = m.mem_mb
          grouped[t][`${m.container_name}_cost`] = m.estimated_cost || 0
          grouped[t][`${m.container_name}_carbon`] = m.carbon_g || 0
        }
        
        const merged = Object.values(grouped).reverse()
        if (mounted) setData(merged)
      } catch (e) {
        console.error('Failed to load metrics', e)
      }
    }

    load()
    const iv = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(iv)
    }
  }, [containers, limit])

  if (containers.length === 0) {
    return <div className="text-sm text-gray-500">Wait for containers to start...</div>
  }

  const names = containers.map(c => c.name)

  return (
    <div className="w-full h-full neu-raised rounded-[var(--neu-radius)] flex flex-col p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-base text-[var(--neu-text)]">{containers.length === 1 ? 'Metrics Tracker' : 'Combined Metrics Tracker'}</h3>
        <select 
           value={metricType} 
            onChange={(e) => setMetricType(e.target.value as MetricType)}
           className="text-sm neu-inset bg-transparent border-none outline-none rounded-[var(--neu-radius-xs)] px-3 py-1.5 text-[var(--neu-text)]"
        >
          <option value="cpu" className="bg-[var(--neu-bg)]">CPU %</option>
          <option value="mem" className="bg-[var(--neu-bg)]">Memory (MB)</option>
          <option value="cost" className="bg-[var(--neu-bg)]">Cost ($)</option>
          <option value="carbon" className="bg-[var(--neu-bg)]">Carbon (g)</option>
        </select>
      </div>

      {data.length === 0 ? (
        <div className="text-sm text-[var(--neu-text-muted)] flex-1 flex items-center justify-center">No metrics available yet.</div>
      ) : (
        <div className="flex-1 min-h-[0px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" tick={{fontSize: 10}} />
              <YAxis 
                 tick={{fontSize: 10}} 
                 tickFormatter={(val) => {
                   if (metricType === 'cost') return `$${Number(val).toFixed(5)}`
                   if (metricType === 'cpu') return `${val}%`
                   if (metricType === 'mem') return `${val}mb`
                   if (metricType === 'carbon') return `${val}g`
                   return val
                 }}
              />
              <Tooltip 
                 formatter={(val: number) => {
                   if (metricType === 'cost') return [`$${val.toFixed(6)}`, 'Cost']
                   if (metricType === 'cpu') return [`${val}%`, 'CPU']
                   if (metricType === 'mem') return [`${val} MB`, 'Mem']
                   if (metricType === 'carbon') return [`${val} g`, 'Carbon']
                   return val
                 }}
              />
              <Legend wrapperStyle={{fontSize: 11}} />
              {names.map((name, i) => (
                <Line 
                   key={name}
                   type="monotone" 
                   dataKey={`${name}_${metricType}`} 
                   name={name}
                   stroke={COLORS[i % COLORS.length]} 
                   dot={false} 
                   isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default MetricsChart
