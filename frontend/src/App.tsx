import React, { useEffect, useState } from 'react'
import './App.css'
import ContainerList from './components/ContainerList'
import MetricsChart from './components/MetricsChart'
import EconomicsPanel from './components/EconomicsPanel'
import ControlPanel from './components/ControlPanel'
import PolicyPanel from './components/PolicyPanel'
import { fetchContainers } from './services/api'
import type { Container } from './services/api'

function App() {
  const [containers, setContainers] = useState<Container[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [nav, setNav] = useState<'dashboard' | 'economics' | 'settings'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const cs = await fetchContainers()
        if (!mounted) return
        setContainers(cs)
        if (!selected && cs.length > 0) {
          setSelected(cs[0].name)
        }
      } catch (e) {
        console.error('failed to fetch containers', e)
      }
    }

    load()
    const iv = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(iv)
    }
  }, [selected])

  function handleSelect(name: string) {
    setSelected((prev) => (prev === name ? null : name))
  }

  async function reloadNow() {
    try {
      const cs = await fetchContainers()
      setContainers(cs)
    } catch (e) {
      console.error('reload failed', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-3 bg-white dark:bg-gray-900 border-b">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="text-lg font-semibold">LocalScale</div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reloadNow} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Refresh</button>
        </div>
      </header>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">LocalScale</div>
                <div className="text-sm text-gray-500 mt-1">Containers & economics</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">Close</button>
            </div>
            <nav className="mt-4 space-y-2">
              <button onClick={() => { setNav('dashboard'); setSidebarOpen(false) }} className={`w-full text-left px-3 py-2 rounded ${nav === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Dashboard</button>
              <button onClick={() => { setNav('economics'); setSidebarOpen(false) }} className={`w-full text-left px-3 py-2 rounded ${nav === 'economics' ? 'bg-indigo-50 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Economics</button>
              <button onClick={() => { setNav('settings'); setSidebarOpen(false) }} className={`w-full text-left px-3 py-2 rounded ${nav === 'settings' ? 'bg-indigo-50 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Settings</button>
            </nav>
          </aside>
        </div>
      )}

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r hidden md:block">
          <div className="p-4 border-b">
            <div className="text-xl font-bold">LocalScale</div>
            <div className="text-sm text-gray-500 mt-1">Containers & economics</div>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => setNav('dashboard')} className={`w-full text-left px-3 py-2 rounded ${nav === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Dashboard</button>
            <button onClick={() => setNav('economics')} className={`w-full text-left px-3 py-2 rounded ${nav === 'economics' ? 'bg-indigo-50 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Economics</button>
            <button onClick={() => setNav('settings')} className={`w-full text-left px-3 py-2 rounded ${nav === 'settings' ? 'bg-indigo-50 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Settings</button>
          </nav>
        </aside>

        {/* Main area */}
        <main className="flex-1 p-4">
          {nav === 'dashboard' && (
            <>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold">Dashboard</h1>
                  <p className="text-sm text-gray-500">Overview of running containers</p>
                </div>
                <div className="w-full md:w-96">
                  <EconomicsPanel />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ContainerList containers={containers} selected={selected ?? undefined} onSelect={handleSelect} />
                </div>
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border h-64 md:h-80">
                    <MetricsChart containerName={selected ?? undefined} />
                  </div>
                  <ControlPanel onDone={reloadNow} />
                </div>
              </div>
            </>
          )}

          {nav === 'economics' && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Economics & Scale</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EconomicsPanel />
              </div>
            </>
          )}

          {nav === 'settings' && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Settings & Policies</h1>
              <PolicyPanel />
            </>
          )}
</main>
      </div>
    </div>
  )

}

export default App
