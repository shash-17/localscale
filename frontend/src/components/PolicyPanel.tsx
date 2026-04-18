import React, { useEffect, useState } from 'react'
import { fetchPolicies, addPolicy } from '../services/api'

const PolicyPanel: React.FC = () => {
  const [policies, setPolicies] = useState<any[]>([])
  const [newPolicy, setNewPolicy] = useState('')
  const [status, setStatus] = useState<string | null>(null)

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newPolicy.trim()) return
    setStatus('Adding...')
    try {
      await addPolicy(newPolicy)
      setNewPolicy('')
      setStatus('Policy added')
      load()
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || 'failed to add'))
    }
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border">
      <h2 className="text-xl font-semibold mb-4">Governance Policies</h2>
      <p className="text-gray-500 text-sm mb-6">
        Specify rules like <strong>"Never spend more than $5.00/day"</strong> or <strong>"Keep carbon footprint under 10g"</strong>.
      </p>

      <form onSubmit={handleAdd} className="mb-8 flex gap-2">
        <input 
          type="text" 
          value={newPolicy} 
          onChange={(e) => setNewPolicy(e.target.value)} 
          className="border px-3 py-2 flex-1 rounded dark:bg-gray-800 dark:border-gray-700" 
          placeholder="e.g. Never spend more than $5.00/day" 
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Add Rule</button>
      </form>
      {status && <div className="text-sm text-indigo-600 mb-4">{status}</div>}

      <div className="space-y-3">
        {policies.length === 0 && <div className="text-gray-500 text-sm">No policies configured yet.</div>}
        {policies.map((p, idx) => (
          <div key={idx} className="p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {p.raw || (typeof p === 'string' ? p : JSON.stringify(p))}
            </p>
            {p.metric && (
              <div className="text-xs text-gray-500 mt-1 flex gap-3">
                <span className="uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400">
                  {p.metric}
                </span>
                {p.threshold !== undefined && <span>Threshold: {p.threshold}</span>}
                {p.period && <span>Period: {p.period}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PolicyPanel
