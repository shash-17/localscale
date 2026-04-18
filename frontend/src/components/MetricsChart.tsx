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
import type { MetricHistory } from '../services/api'

interface Props {
  containerName?: string
  limit?: number
}

const MetricsChart: React.FC<Props> = ({ containerName, limit = 200 }) => {
  const [data, setData] = useState<Array<any>>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!containerName) {
        setData([])
        return
      }
      try {
        const all = await fetchHistory(limit)
        const filtered = all
          .filter((m) => m.container_name === containerName)
          .map((m) => ({ time: new Date(m.timestamp).toLocaleTimeString(), cpu: m.cpu_pct, mem: m.mem_mb }))
          .reverse()
        if (mounted) setData(filtered)
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
  }, [containerName, limit])

  if (!containerName) {
    return <div className="text-sm text-gray-500">Select a container to view metrics.</div>
  }

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 p-3 rounded-lg border">
      <h3 className="mb-2 font-medium">Metrics for {containerName}</h3>
      {data.length === 0 ? (
        <div className="text-sm text-gray-500">No metrics available yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" unit="%" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#8884d8" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="mem" stroke="#82ca9d" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default MetricsChart
