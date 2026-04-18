import React, { useEffect, useState, useRef } from 'react'
import { fetchLogs } from '../services/api'
import { Terminal, RefreshCw, ChevronDown } from 'lucide-react'

interface Props {
  containerId: string
  containerName: string
}

const LogViewer: React.FC<Props> = ({ containerId, containerName }) => {
  const [logs, setLogs] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await fetchLogs(containerId, 100)
      setLogs(data)
    } catch (e) {
      console.error('Failed to fetch logs', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    let iv: any
    if (autoRefresh) {
      iv = setInterval(loadLogs, 3000)
    }
    return () => clearInterval(iv)
  }, [containerId, autoRefresh])

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  return (
    <div className="neu-raised p-6 rounded-[var(--neu-radius)] flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-[var(--neu-accent)]" />
          <h3 className="text-lg font-semibold text-[var(--neu-text)]">System Logs</h3>
          <span className="text-xs text-[var(--neu-text-muted)] font-mono px-2 py-0.5 neu-inset rounded">
            {containerName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--neu-text-secondary)] cursor-pointer">
             <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="hidden"
             />
             <div className={`w-8 h-4 rounded-full transition-all duration-300 flex items-center p-0.5 ${autoRefresh ? 'bg-[var(--neu-accent)]' : 'neu-inset'}`}>
                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0'}`} />
             </div>
             Auto-tail
          </label>
          <button 
            onClick={loadLogs} 
            disabled={loading}
            className="dash-icon-btn p-1.5"
            title="Refresh logs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 neu-inset bg-[#1e1e2e] rounded-[var(--neu-radius-xs)] p-4 font-mono text-sm overflow-y-auto text-gray-300">
        {logs ? (
          <div className="whitespace-pre-wrap break-all leading-relaxed">
            {logs}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[var(--neu-text-muted)] italic">
            Connecting to stream...
          </div>
        )}
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <div className="text-[10px] text-[var(--neu-text-muted)] font-medium flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live link established
        </div>
        <button className="text-[10px] uppercase font-bold text-[var(--neu-text-muted)] hover:text-[var(--neu-accent)] transition-colors flex items-center gap-1">
           Export Logs <ChevronDown size={10} />
        </button>
      </div>
    </div>
  )
}

export default LogViewer
