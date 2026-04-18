import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchPolicies, addPolicy } from '../services/api'

const PolicyPanel = () => {
  const [policies, setPolicies] = useState<any[]>([])
  const [newPolicy, setNewPolicy] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  // Custom Form State
  const [metric, setMetric] = useState('cpu_percent')
  const [threshold, setThreshold] = useState('')
  const [period, setPeriod] = useState('hr')
  const [containerFocus, setContainerFocus] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const data = await fetchPolicies()
      setPolicies(data)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleAdd(e?: FormEvent) {
    if (e) e.preventDefault()
    if (!newPolicy.trim()) return
    setStatus('Adding...')
    try {
      await addPolicy(newPolicy)
      setNewPolicy('')
      setStatus('Policy added')
      load()
    } catch (err: any) {
      setStatus(`Error: ${err.message || 'Failed'}`)
    }
  }

  async function handleAddForm(e: FormEvent) {
    e.preventDefault()
    if (!threshold) return
    setStatus('Adding...')
    try {
      const rawText = `[Form] if ${metric} > ${threshold} ` + (period !== 'None' ? `for 1 ${period}` : '') + (containerFocus ? ` in ${containerFocus}` : '')
      const pObj = { 
        metric: metric, 
        threshold: Number(threshold), 
        period: period === 'None' ? null : period, 
        container: containerFocus || null, 
        raw: rawText 
      }
      await addPolicy(pObj)
      setThreshold('')
      setStatus('Structured policy added')
      load()
    } catch (err: any) {
      setStatus(`Error: ${err.message || 'Failed'}`)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm max-w-4xl">
      <h2 className="text-xl font-semibold mb-4">Governance Policies</h2>
      
      {status && <div className="mb-4 text-sm text-indigo-600 bg-indigo-50 p-2 rounded">{status}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-medium text-lg mb-3">Structured Rule Builder</h3>
          <form onSubmit={handleAddForm} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Metric</label>
                <select value={metric} onChange={v => setMetric(v.target.value)} className="w-full border rounded px-2 py-1.5 dark:bg-gray-900 border-gray-300">
                  <option value="cpu_percent">CPU %</option>
                  <option value="mem_mb">Memory (MB)</option>
                  <option value="carbon_g">Carbon (g)</option>
                  <option value="estimated_cost">Cost ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Threshold</label>
                <input type="number" step="0.1" value={threshold} onChange={e => setThreshold(e.target.value)} className="w-full border rounded px-2 py-1.5 dark:bg-gray-900 border-gray-300" placeholder="e.g. 80" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Period / Limit</label>
                <select value={period} onChange={v => setPeriod(v.target.value)} className="w-full border rounded px-2 py-1.5 dark:bg-gray-900 border-gray-300">
                  <option value="None">Instant</option>
                  <option value="min">per Minute</option>
                  <option value="hr">per Hour</option>
                  <option value="day">per Day</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Container Keyword (Opt)</label>
                <input type="text" value={containerFocus} onChange={e => setContainerFocus(e.target.value)} className="w-full border rounded px-2 py-1.5 dark:bg-gray-900 border-gray-300" placeholder="e.g. redis" />
              </div>
            </div>
            
            <button type="submit" disabled={!threshold} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded transition disabled:bg-indigo-300">
              Add Structured Policy
            </button>
          </form>
        </div>

        <div>
          <h3 className="font-medium text-lg mb-3">Natural Language Input</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sentence Parser</label>
              <textarea
                value={newPolicy}
                onChange={(e) => setNewPolicy(e.target.value)}
                placeholder="e.g. Keep carbon under 500g per day"
                className="w-full border rounded px-3 py-2 h-[126px] dark:bg-gray-900 border-gray-300 font-mono text-sm"
              />
            </div>
            <button type="submit" disabled={!newPolicy.trim()} className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 rounded transition disabled:bg-slate-300">
              Parse & Add Policy
            </button>
          </form>
        </div>
      </div>
      
      <div className="border-t pt-6">
        <h3 className="font-semibold mb-3">Active Policies ({policies.length})</h3>
        {policies.length === 0 ? (
          <div className="text-gray-500 text-sm">No policies active.</div>
        ) : (
          <ul className="space-y-3">
            {policies.map((p, idx) => (
              <li key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm flex justify-between items-center">
                <span>{typeof p === 'string' ? p : p.raw ?? JSON.stringify(p)}</span>
                {typeof p === 'object' && p.container && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded ml-2">Target: {p.container}</span>
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
