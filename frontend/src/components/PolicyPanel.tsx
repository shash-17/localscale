import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchPolicies, addPolicy } from '../services/api'

interface Props {
  containerName?: string
}

interface PolicyObject {
  metric?: string
  threshold?: number
  period?: string
  container?: string
  raw?: string
  [key: string]: unknown
}

type PolicyEntry = string | PolicyObject

function isPolicyObject(value: PolicyEntry): value is PolicyObject {
  return typeof value === 'object' && value !== null
}

function policyInScope(policyContainer: unknown, selectedContainer: string): boolean {
  if (!policyContainer || typeof policyContainer !== 'string') return true
  const p = policyContainer.toLowerCase().trim()
  const c = selectedContainer.toLowerCase().trim()
  return c === p || c.startsWith(`${p}-`) || p.startsWith(`${c}-`)
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return 'Failed'
}

const PolicyPanel = ({ containerName }: Props) => {
  const [policies, setPolicies] = useState<PolicyEntry[]>([])
  const [newPolicy, setNewPolicy] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  // Custom Form State
  const [metric, setMetric] = useState('cpu_percent')
  const [threshold, setThreshold] = useState('')
  const [period, setPeriod] = useState('hr')
  const [containerFocus, setContainerFocus] = useState(containerName || '')

  const load = useCallback(async () => {
    try {
      const data = await fetchPolicies()
      if (containerName) {
        setPolicies(
          data.filter((p) => !isPolicyObject(p) || policyInScope(p.container, containerName))
        )
      } else {
        setPolicies(data)
      }
    } catch (e) {
      console.error(e)
    }
  }, [containerName])

  useEffect(() => {
    const timer = setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(timer)
  }, [load])

  async function handleAdd(e?: FormEvent) {
    if (e) e.preventDefault()
    if (!newPolicy.trim()) return
    setStatus('Adding...')
    try {
      let finalPolicy = newPolicy
      if (containerName && !newPolicy.includes(containerName)) {
        finalPolicy = `${newPolicy} in ${containerName}`
      }
      await addPolicy(finalPolicy)
      setNewPolicy('')
      setStatus('Policy added')
      await load()
    } catch (err: unknown) {
      setStatus(`Error: ${getErrorMessage(err)}`)
    }
  }

  async function handleAddForm(e: FormEvent) {
    e.preventDefault()
    if (!threshold) return
    setStatus('Adding...')
    try {
      const targetContainer = containerName || containerFocus
      const rawText = `[Form] if ${metric} > ${threshold} ` + (period !== 'None' ? `for 1 ${period}` : '') + (targetContainer ? ` in ${targetContainer}` : '')
      const pObj: PolicyObject = {
        metric,
        threshold: Number(threshold),
        period: period === 'None' ? 'run' : period,
        container: targetContainer || undefined,
        raw: rawText,
      }
      await addPolicy(pObj)
      setThreshold('')
      setStatus('Structured policy added')
      await load()
    } catch (err: unknown) {
      setStatus(`Error: ${getErrorMessage(err)}`)
    }
  }

  return (
    <div className="neu-raised p-6 rounded-[var(--neu-radius)] max-w-4xl w-full">
      <h2 className="text-xl font-semibold mb-6 text-[var(--neu-text)]">
        Governance Policies {containerName && <span className="text-base font-normal text-[var(--neu-text-secondary)] ml-2">({containerName})</span>}
      </h2>
      
      {status && <div className="mb-5 text-sm text-[var(--neu-accent)] bg-[var(--neu-accent-soft)] px-3 py-2 rounded-md font-medium">{status}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-base mb-4 text-[var(--neu-text)]">Structured Rule Builder</h3>
          <form onSubmit={handleAddForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-[var(--neu-text-secondary)] mb-1.5 uppercase tracking-wider">Metric</label>
                <select value={metric} onChange={v => setMetric(v.target.value)} className="neu-inset bg-transparent border-none outline-none w-full rounded-[var(--neu-radius-xs)] px-3 py-2 text-sm text-[var(--neu-text)]">
                  <option value="cpu_percent" className="bg-[var(--neu-bg)]">CPU %</option>
                  <option value="mem_mb" className="bg-[var(--neu-bg)]">Memory (MB)</option>
                  <option value="carbon" className="bg-[var(--neu-bg)]">Carbon (g)</option>
                  <option value="cost" className="bg-[var(--neu-bg)]">Cost ($)</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-[var(--neu-text-secondary)] mb-1.5 uppercase tracking-wider">Threshold</label>
                <input type="number" step="0.1" value={threshold} onChange={e => setThreshold(e.target.value)} className="neu-inset bg-transparent border-none outline-none w-full rounded-[var(--neu-radius-xs)] px-3 py-2 text-sm text-[var(--neu-text)]" placeholder="e.g. 80" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-[var(--neu-text-secondary)] mb-1.5 uppercase tracking-wider">Period</label>
                <select value={period} onChange={v => setPeriod(v.target.value)} className="neu-inset bg-transparent border-none outline-none w-full rounded-[var(--neu-radius-xs)] px-3 py-2 text-sm text-[var(--neu-text)]">
                  <option value="None" className="bg-[var(--neu-bg)]">Instant</option>
                  <option value="min" className="bg-[var(--neu-bg)]">per Minute</option>
                  <option value="hr" className="bg-[var(--neu-bg)]">per Hour</option>
                  <option value="day" className="bg-[var(--neu-bg)]">per Day</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-[var(--neu-text-secondary)] mb-1.5 uppercase tracking-wider">Container</label>
                <input type="text" disabled={!!containerName} value={containerName || containerFocus} onChange={e => setContainerFocus(e.target.value)} className="neu-inset bg-transparent border-none outline-none w-full rounded-[var(--neu-radius-xs)] px-3 py-2 text-sm text-[var(--neu-text)] disabled:opacity-50" placeholder="e.g. redis" />
              </div>
            </div>
            
            <button type="submit" disabled={!threshold} className="neu-btn w-full text-[var(--neu-accent)] hover:text-[var(--neu-accent-hover)] font-bold py-2.5 rounded-[var(--neu-radius-xs)] disabled:opacity-60 transition-colors mt-2">
              Add Structured Policy
            </button>
          </form>
        </div>

        <div>
          <h3 className="font-semibold text-base mb-4 text-[var(--neu-text)]">Natural Language Input</h3>
          <form onSubmit={handleAdd} className="flex flex-col h-[calc(100%-2rem)] space-y-4">
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-semibold text-[var(--neu-text-secondary)] mb-1.5 uppercase tracking-wider">Sentence Parser</label>
              <textarea
                value={newPolicy}
                onChange={(e) => setNewPolicy(e.target.value)}
                placeholder={containerName ? `e.g. Keep carbon under 500g per day (auto-applies to ${containerName})` : "e.g. Keep carbon under 500g per day for redis"}
                className="neu-inset bg-transparent border-none outline-none w-full rounded-[var(--neu-radius-xs)] flex-1 px-4 py-3 font-mono text-sm resize-none text-[var(--neu-text)]"
              />
            </div>
            <button type="submit" disabled={!newPolicy.trim()} className="neu-btn w-full text-[var(--neu-text-secondary)] hover:text-[var(--neu-text)] font-bold py-2.5 rounded-[var(--neu-radius-xs)] disabled:opacity-60 transition-colors">
              Parse & Add Policy
            </button>
          </form>
        </div>
      </div>
      
      <div className="pt-6 border-t border-[rgba(0,0,0,0.05)] mt-4">
        <h3 className="font-semibold text-[var(--neu-text)] mb-4">Active Policies ({policies.length})</h3>
        {policies.length === 0 ? (
          <div className="text-[var(--neu-text-muted)] text-sm italic">No policies active{containerName ? ` for ${containerName}` : ''}.</div>
        ) : (
          <ul className="space-y-3">
            {policies.map((p, idx) => (
              <li key={idx} className="neu-flat px-4 py-3 rounded-[var(--neu-radius-sm)] text-sm text-[var(--neu-text)] flex justify-between items-center transition-all">
                <span className="font-mono text-xs opacity-90">{typeof p === 'string' ? p : p.raw ?? JSON.stringify(p)}</span>
                {typeof p === 'object' && p.container && (
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-[var(--neu-accent-soft)] text-[var(--neu-accent)] px-2 py-0.5 rounded ml-3 whitespace-nowrap">Target: {p.container}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default PolicyPanel
