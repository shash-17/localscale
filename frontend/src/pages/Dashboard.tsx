import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  DollarSign,
  Settings,
  Box,
  RefreshCw,
  Home,
  ChevronLeft,
  Menu,
  X,
  PlusSquare,
} from 'lucide-react'
import ContainerList from '../components/ContainerList'
import MetricsChart from '../components/MetricsChart'
import EconomicsPanel from '../components/EconomicsPanel'
import ControlPanel from '../components/ControlPanel'
import PolicyPanel from '../components/PolicyPanel'
import LogViewer from '../components/LogViewer'
import { fetchContainers } from '../services/api'
import type { Container } from '../services/api'
import './Dashboard.css'

type Nav = 'dashboard' | 'control' | 'container_details'

export default function Dashboard() {
  const [containers, setContainers] = useState<Container[]>([])
  const [activeContainer, setActiveContainer] = useState<Container | null>(null)
  const [nav, setNav] = useState<Nav>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  async function reloadNow(currentContainers?: Container[]) {
    try {
      const cs = await fetchContainers()
      setContainers(cs)
      setActiveContainer(prev => {
        if (!prev) return null
        const updated = cs.find(c => c.name === prev.name)
        if (!updated) {
          setNav('dashboard')
          return null
        }
        return updated
      })
    } catch (e) {
      console.error('reload failed', e)
    }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const cs = await fetchContainers()
        if (!mounted) return
        setContainers(cs)
        setActiveContainer(prev => {
          if (!prev) return null
          const updated = cs.find(c => c.name === prev.name)
          if (!updated) {
            setNav('dashboard')
            return null
          }
          return updated
        })
      } catch (e) {
        console.error('failed to fetch containers', e)
      }
    }
    load()
    const iv = setInterval(load, 5000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  function handleContainerClick(name: string) {
    const c = containers.find(x => x.name === name);
    if (c) {
      setActiveContainer(c);
      setNav('container_details');
    }
  }

  const navItems: { key: Nav; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { key: 'control', label: 'Deploy Modules', icon: <PlusSquare size={18} /> },
  ]

  return (
    <div className="dash-shell">
      {/* ── Mobile header ── */}
      <header className="dash-mobile-header">
        <div className="dash-mobile-header-left">
          <button
            className="dash-icon-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="dash-mobile-logo">
            <Box size={18} strokeWidth={2.5} />
            <span>LocalScale</span>
          </div>
        </div>
        <button className="dash-btn-sm" onClick={reloadNow}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {sidebarOpen && (
        <div className="dash-drawer-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'dash-sidebar-open' : ''}`}>
        <div className="dash-sidebar-header">
          <div className="dash-sidebar-logo">
            <div className="dash-logo-icon">
              <Box size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="dash-logo-title">LocalScale</div>
              <div className="dash-logo-sub">Container Platform</div>
            </div>
          </div>
          <button
            className="dash-icon-btn dash-close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="dash-sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setNav(item.key); setSidebarOpen(false) }}
              className={`dash-nav-item ${nav === item.key ? 'dash-nav-active' : ''}`}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <Link to="/" className="dash-nav-item dash-nav-back">
            <span className="dash-nav-icon"><ChevronLeft size={18} /></span>
            <span>Back to Home</span>
          </Link>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="dash-main">
        <div className="dash-main-inner">
          {nav === 'dashboard' && (
            <>
              <div className="dash-page-header">
                <div>
                  <h1 className="dash-page-title">Dashboard</h1>
                  <p className="dash-page-desc">Overview of running containers and resource usage</p>
                </div>
                <div className="dash-page-actions">
                  <button className="dash-btn-outline" onClick={reloadNow}>
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                </div>
              </div>
              
              {/* High-density Status Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="neu-raised p-4 rounded-[var(--neu-radius-sm)] flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)]">Active Fleet</div>
                        <div className="text-xl font-bold text-[var(--neu-text)]">{containers.filter(c => c.status === 'running').length} <span className="text-xs font-medium text-green-500">Live</span></div>
                    </div>
                 </div>
                 <div className="neu-raised p-4 rounded-[var(--neu-radius-sm)] flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)]">Resource Idle</div>
                        <div className="text-xl font-bold text-[var(--neu-text)]">{containers.filter(c => c.status !== 'running').length} <span className="text-xs font-medium text-red-400">Nodes</span></div>
                    </div>
                 </div>
                 <div className="neu-raised p-4 rounded-[var(--neu-radius-sm)] col-span-2 flex items-center justify-center">
                    <EconomicsPanel minimal={true} limit={1} />
                 </div>
              </div>

              {/* Economics summary - removed old redundant one */}

              <div className="dash-grid">
                <div className="dash-grid-main">
                  <ContainerList
                    containers={containers}
                    onViewDetails={handleContainerClick}
                  />
                </div>
                <div className="dash-grid-side">
                  <div className="dash-chart-card">
                    <MetricsChart
                      containers={containers}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {nav === 'control' && (
            <>
              <div className="dash-page-header">
                <div>
                  <h1 className="dash-page-title">Deploy & Scale</h1>
                  <p className="dash-page-desc">Provision new containers and configure existing resource limits</p>
                </div>
              </div>
              <div className="dash-eco-grid w-full lg:max-w-3xl">
                <ControlPanel onDone={() => { reloadNow(); setNav('dashboard') }} />
              </div>
            </>
          )}

          {nav === 'container_details' && activeContainer && (
            <>
              <div className="dash-page-header">
                <div>
                  <h1 className="dash-page-title">{activeContainer.name}</h1>
                  <p className="dash-page-desc flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${activeContainer.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                    {activeContainer.status} • {activeContainer.image}
                  </p>
                </div>
                <div className="dash-page-actions">
                  <button className="dash-btn-outline" onClick={() => setNav('dashboard')}>
                    <ChevronLeft size={14} /> Back to Dashboard
                  </button>
                  <button className="dash-btn-outline" onClick={reloadNow}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              <div className="dash-economics-bar">
                <EconomicsPanel containerName={activeContainer.name} />
              </div>

              <div className="dash-grid-detail mb-6">
                <div className="dash-grid-main space-y-6">
                   <PolicyPanel containerName={activeContainer.name} />
                   <LogViewer containerId={activeContainer.id} containerName={activeContainer.name} />
                </div>
                <div className="dash-grid-side space-y-6">
                  <div className="dash-chart-card">
                    <MetricsChart
                      containers={[activeContainer]}
                    />
                  </div>
                  <ControlPanel 
                    onDone={reloadNow} 
                    containerName={activeContainer.name} 
                    containerId={activeContainer.id}
                    containerStatus={activeContainer.status}
                  />
                </div>
              </div>
            </>
          )}


        </div>
      </main>
    </div>
  )
}
