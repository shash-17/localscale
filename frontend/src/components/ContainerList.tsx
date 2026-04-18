import React, { useEffect, useState } from 'react'
import { fetchContainers, fetchStats } from '../services/api'
import type { Container, Stats } from '../services/api'

interface Props {
  selected?: string
  onSelect?: (name: string) => void
  containers?: Container[]
}

function parseMemoryPercent(mem: string | undefined): number | null {
  if (!mem) return null
  const m = mem.match(/\(([0-9]+\.?[0-9]*)%\)/)
  if (m) return Number(m[1])
  // fallback: try to parse usage/limit
  try {
    const parts = mem.split('/')
    if (parts.length >= 2) {
      const usage = parseFloat(parts[0].trim().split(' ')[0])
      const limit = parseFloat(parts[1].trim().split(' ')[0])
      if (!isNaN(usage) && !isNaN(limit) && limit > 0) {
        return Math.round((usage / limit) * 10000) / 100
      }
    }
  } catch (e) {
    // ignore
  }
  return null
}

const ContainerList: React.FC<Props> = ({ selected, onSelect, containers: propContainers }) => {
  const [containers, setContainers] = useState<Container[]>(propContainers ?? [])
  const [statsMap, setStatsMap] = useState<Record<string, Stats | null>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // If parent supplies containers, use them and fetch stats for them.
    if (propContainers && propContainers.length > 0) {
      setContainers(propContainers)
      fetchStatsFor(propContainers)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propContainers])

  async function load() {
    setLoading(true)
    try {
      const cs = await fetchContainers()
      setContainers(cs)
      const statsArr = await Promise.all(cs.map((c) => fetchStats(c.id).catch(() => null)))
      const map: Record<string, Stats | null> = {}
      cs.forEach((c, i) => (map[c.id] = statsArr[i]))
      setStatsMap(map)
    } catch (e) {
      console.error('Failed to load containers', e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStatsFor(cs: Container[]) {
    setLoading(true)
    try {
      const statsArr = await Promise.all(cs.map((c) => fetchStats(c.id).catch(() => null)))
      const map: Record<string, Stats | null> = {}
      cs.forEach((c, i) => (map[c.id] = statsArr[i]))
      setStatsMap(map)
    } catch (e) {
      console.error('Failed to load stats', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Containers</h2>
        <button
          className="text-sm text-gray-500"
          onClick={() => load()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {containers.map((c) => {
          const s = statsMap[c.id]
          const cpu = s?.cpu_percent ?? null
          const memPct = parseMemoryPercent(s?.memory)
          const isSelected = selected === c.name
          return (
            <div
              key={c.id}
              onClick={() => onSelect && onSelect(c.name)}
              className={`p-4 border rounded-lg cursor-pointer hover:shadow-sm ${
                isSelected ? 'ring-2 ring-indigo-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span
                    className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      c.status === 'running' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    aria-hidden
                  />
                  <h3 className="font-medium">{c.name}</h3>
                </div>
                <div className="text-sm text-gray-500">{c.image}</div>
              </div>

              <div className="mt-3 flex justify-between text-sm text-gray-700">
                <div>
                  CPU: <span className="font-medium">{cpu !== null ? `${cpu.toFixed(1)}%` : '—'}</span>
                </div>
                <div>
                  Mem:{' '}
                  <span className="font-medium">{memPct !== null ? `${memPct}%` : s?.memory ?? '—'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ContainerList
