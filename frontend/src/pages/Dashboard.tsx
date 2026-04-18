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
} from 'lucide-react'
import ContainerList from '../components/ContainerList'
import MetricsChart from '../components/MetricsChart'
import EconomicsPanel from '../components/EconomicsPanel'
import ControlPanel from '../components/ControlPanel'
import PolicyPanel from '../components/PolicyPanel'
import { fetchContainers } from '../services/api'
import type { Container } from '../services/api'
import './Dashboard.css'

type Nav = 'dashboard' | 'economics' | 'settings'

export default function Dashboard() {
  const [containers, setContainers] = useState<Container[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [nav, setNav] = useState<Nav>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const cs = await fetchContainers()
        if (!mounted) return
        setContainers(cs)
        if (selected.length === 0 && cs.length > 0) {
          setSelected(cs.map((c) => c.name))
        }
      } catch (e) {
        console.error('failed to fetch containers', e)
      }
    }
    load()
    const iv = setInterval(load, 5000)
    return () => { mounted = false; clearInterval(iv) }
  }, [selected])

  function handleSelect(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  async function reloadNow() {
    try {
      const cs = await fetchContainers()
      setContainers(cs)
    } catch (e) {
      console.error('reload failed', e)
    }
  }

  const navItems: { key: Nav; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { key: 'economics', label: 'Economics', icon: <DollarSign size={18} /> },
    { key: 'settings', label: 'Policies', icon: <Settings size={18} /> },
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

              {/* Economics summary */}
              <div className="dash-economics-bar">
                <EconomicsPanel />
              </div>

              <div className="dash-grid">
                <div className="dash-grid-main">
                  <ContainerList
                    containers={containers}
                    selected={selected}
                    onSelect={handleSelect}
                  />
                </div>
                <div className="dash-grid-side">
                  <div className="dash-chart-card">
                    <MetricsChart
                      containers={containers.filter((c) => selected.includes(c.name))}
                    />
                  </div>
                  <ControlPanel onDone={reloadNow} />
                </div>
              </div>
            </>
          )}

          {nav === 'economics' && (
            <>
              <div className="dash-page-header">
                <div>
                  <h1 className="dash-page-title">Economics & Scale</h1>
                  <p className="dash-page-desc">Cost and carbon metrics for your infrastructure</p>
                </div>
              </div>
              <div className="dash-eco-grid">
                <EconomicsPanel />
              </div>
            </>
          )}

          {nav === 'settings' && (
            <>
              <div className="dash-page-header">
                <div>
                  <h1 className="dash-page-title">Governance & Policies</h1>
                  <p className="dash-page-desc">Define rules to manage resource usage automatically</p>
                </div>
              </div>
              <PolicyPanel />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
