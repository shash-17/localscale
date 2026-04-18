import React, { useEffect, useState } from 'react'
import { fetchContainers, fetchStats, startContainer, stopContainer, removeContainer } from '../services/api'
import type { Container, Stats } from '../services/api'

interface Props {
  selected?: string[]
  onViewDetails?: (name: string) => void
  containers?: Container[]
}

function parseMemoryPercent(mem: string | undefined): number | null {
  if (!mem) return null
  const m = mem.match(/\(([0-9]+\.?[0-9]*)%\)/)
  if (m) return Number(m[1])
  try {
    const parts = mem.split('/')
    if (parts.length >= 2) {
      const usage = parseFloat(parts[0].trim().split(' ')[0])
      const limit = parseFloat(parts[1].trim().split(' ')[0])
      if (!isNaN(usage) && !isNaN(limit) && limit > 0) {
        return Math.round((usage / limit) * 100) / 100
      }
    }
  } catch (e) {}
  return null
}

const ContainerList: React.FC<Props> = ({ selected, onViewDetails, containers: propContainers }) => {
  const [containers, setContainers] = useState<Container[]>(propContainers ?? [])
  const [statsMap, setStatsMap] = useState<Record<string, Stats | null>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (propContainers && propContainers.length > 0) {
      setContainers(propContainers)
      fetchStatsFor(propContainers)
      return
    }
    load()
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

  async function handleAction(e: React.MouseEvent, action: string, id: string) {
    e.stopPropagation()
    setLoading(true)
    try {
      if (action === 'start') await startContainer(id)
      if (action === 'stop') await stopContainer(id)
      if (action === 'remove') await removeContainer(id)
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      if (!propContainers) {
        load()
      } else {
        // If controlled by parent, maybe we can't force parent reload easily here, 
        // but we can refresh our stats. Ideally parent sends a refresh signal.
      }
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Containers</h2>
        <button
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={() => load()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
        {containers.map((c) => {
          const s = statsMap[c.id]
          const cpu = s?.cpu_percent ?? null
          const memPct = parseMemoryPercent(s?.memory)
          return (
            <div
              key={c.id}
              onClick={() => onViewDetails && onViewDetails(c.name)}
              className="neu-raised p-5 rounded-[var(--neu-radius)] cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span
                    className={`inline-block w-3 h-3 rounded-full mr-3 shadow-sm ${
                      c.status === 'running' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <h3 className="font-semibold text-[var(--neu-text)]">{c.name}</h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xs text-[var(--neu-text-muted)] font-mono truncate max-w-[100px]">{c.image.split(':')[0]}</div>
                  {c.ports && c.ports.length > 0 && (
                     <a 
                       href={`http://localhost:${c.ports[0].split('->')[0]}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-[10px] bg-[var(--neu-accent)] text-white px-1.5 py-0.5 rounded font-mono hover:opacity-80 transition-opacity"
                       onClick={(e) => e.stopPropagation()}
                     >
                       {c.ports[0]}
                     </a>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-between text-sm text-[var(--neu-text-secondary)]">
                <div>
                  CPU: <span className="font-medium text-[var(--neu-text)]">{cpu !== null ? `${cpu.toFixed(1)}%` : '—'}</span>
                </div>
                <div>
                  Mem: <span className="font-medium text-[var(--neu-text)]">{memPct !== null ? `${memPct}%` : '—'}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.05)] flex justify-end gap-3 text-xs">
                {c.status !== 'running' ? (
                  <button onClick={(e) => handleAction(e, 'start', c.id)} className="neu-btn px-4 py-2 font-semibold text-green-600 rounded-[var(--neu-radius-xs)]">Start</button>
                ) : (
                  <button onClick={(e) => handleAction(e, 'stop', c.id)} className="neu-btn px-4 py-2 font-semibold text-yellow-600 rounded-[var(--neu-radius-xs)]">Stop</button>
                )}
                <button onClick={(e) => handleAction(e, 'remove', c.id)} className="neu-btn px-4 py-2 font-semibold text-red-500 rounded-[var(--neu-radius-xs)]">Remove</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ContainerList
