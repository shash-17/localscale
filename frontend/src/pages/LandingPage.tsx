import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  BarChart3,
  Cpu,
  Leaf,
  ArrowRight,
  ChevronDown,
  Shield,
  Layers,
  Zap,
  Activity,
  Server,
  DollarSign,
} from 'lucide-react'
import './LandingPage.css'

/* ─────────── Animated Section ─────────── */
function AnimatedSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={`landing-animated ${isVisible ? 'landing-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ─────────── Feature data ─────────── */
const features = [
  {
    icon: Server,
    title: 'Container Orchestration',
    description:
      'Deploy, start, stop, and remove Docker containers from an intuitive dashboard with real-time status indicators.',
  },
  {
    icon: Activity,
    title: 'Live Metrics',
    description:
      'Real-time CPU and memory monitoring with interactive charts. Track resource usage across all running containers simultaneously.',
  },
  {
    icon: BarChart3,
    title: 'Auto-Scaling',
    description:
      'Scale services up or down with a single command. Set replica counts and let the platform handle distribution intelligently.',
  },
  {
    icon: DollarSign,
    title: 'Cost Economics',
    description:
      'Track estimated compute costs in real time. Understand exactly what each container costs and optimize your spend.',
  },
  {
    icon: Leaf,
    title: 'Carbon Footprint',
    description:
      'Monitor environmental impact with per-container carbon emission tracking. Make sustainable infrastructure decisions.',
  },
  {
    icon: Shield,
    title: 'Governance Policies',
    description:
      'Define rules via structured builder or natural language. Enforce CPU limits, cost caps, and carbon budgets automatically.',
  },
]

const stats = [
  { value: 'Real-Time', label: 'Metrics Sync' },
  { value: '< 1s', label: 'Deploy Speed' },
  { value: '6+', label: 'Core Modules' },
  { value: '100%', label: 'Open Source' },
]

const workflowSteps = [
  {
    number: '01',
    title: 'Connect',
    description: 'Point LocalScale to your Docker daemon. Automatic container discovery handles the rest.',
  },
  {
    number: '02',
    title: 'Monitor',
    description: 'Real-time dashboards show CPU, memory, cost, and carbon metrics for every running service.',
  },
  {
    number: '03',
    title: 'Optimize',
    description: 'Set governance policies, scale services, and optimize resource allocation from one interface.',
  },
]

/* ─────────── Landing Page ─────────── */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing-page">
      {/* ── Nav ── */}
      <nav className={`landing-nav ${scrollY > 50 ? 'landing-nav-scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <Box size={22} strokeWidth={2.5} />
            <span>LocalScale</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#stack" className="landing-nav-link">Stack</a>
          </div>
          <div className="landing-nav-actions">
            <Link to="/dashboard" className="landing-btn-primary">
              Open Dashboard
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-dot-grid" />
        </div>

        <div className="landing-hero-content">
          <div className="landing-hero-text">
            <AnimatedSection>
              <div className="landing-badge">
                <span className="landing-badge-dot" />
                Container Infrastructure Platform
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <h1 className="landing-title">
                Scale Containers.
                <br />
                <span className="landing-title-accent">Track Everything.</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <p className="landing-subtitle">
                The local-first container management platform with real-time metrics,
                cost economics, carbon tracking, and policy-driven governance — all in
                one dashboard.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <div className="landing-hero-cta">
                <Link to="/dashboard" className="landing-btn-primary landing-btn-lg">
                  Launch Dashboard
                  <ArrowRight size={18} />
                </Link>
                <a href="#features" className="landing-btn-outline landing-btn-lg">
                  Explore Features
                </a>
              </div>
            </AnimatedSection>
          </div>

          {/* Hero Visual — Neumorphic orb with orbiting chips */}
          <div className="landing-hero-visual">
            <div className="landing-blob" />
            <div className="landing-hero-orb">
              <Layers size={64} strokeWidth={1.5} className="landing-hero-orb-icon" />
            </div>
            <div className="landing-orbit-item">
              <div className="landing-orbit-chip">
                <Cpu size={14} /> CPU Metrics
              </div>
            </div>
            <div className="landing-orbit-item">
              <div className="landing-orbit-chip">
                <Leaf size={14} /> Carbon Tracking
              </div>
            </div>
            <div className="landing-orbit-item">
              <div className="landing-orbit-chip">
                <DollarSign size={14} /> Cost Analytics
              </div>
            </div>
          </div>
        </div>

        <div className="landing-scroll-indicator">
          <ChevronDown size={16} />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats">
        <div className="landing-container">
          <div className="landing-stats-inner">
            {stats.map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 100}>
                <div className="landing-stat-card">
                  <div className="landing-stat-value">{stat.value}</div>
                  <div className="landing-stat-label">{stat.label}</div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features" id="features">
        <div className="landing-container">
          <AnimatedSection>
            <div className="landing-section-header">
              <h2 className="landing-section-title">
                Everything to manage local infrastructure
              </h2>
              <p className="landing-section-desc">
                Six integrated modules for container lifecycle management, real-time
                observability, cost optimization, and governance.
              </p>
            </div>
          </AnimatedSection>

          <div className="landing-features-grid">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 80}>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">
                    <feature.icon size={20} strokeWidth={2} />
                  </div>
                  <h3 className="landing-feature-title">{feature.title}</h3>
                  <p className="landing-feature-desc">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-workflow" id="how-it-works">
        <div className="landing-container">
          <AnimatedSection>
            <div className="landing-section-header">
              <h2 className="landing-section-title">Up and running in minutes</h2>
              <p className="landing-section-desc">
                No complex setup. Point LocalScale at your Docker host and start
                managing containers immediately.
              </p>
            </div>
          </AnimatedSection>

          <div className="landing-workflow-grid">
            {workflowSteps.map((step, i) => (
              <AnimatedSection key={step.number} delay={i * 120}>
                <div className="landing-workflow-step">
                  <div className="landing-workflow-number">{step.number}</div>
                  <h3 className="landing-workflow-title">{step.title}</h3>
                  <p className="landing-workflow-desc">{step.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture ── */}
      <section className="landing-arch" id="stack">
        <div className="landing-container">
          <AnimatedSection>
            <div className="landing-arch-inner">
              <div className="landing-arch-item">
                <span className="landing-arch-label">Frontend</span>
                <span className="landing-arch-value">React + Vite</span>
              </div>
              <div className="landing-arch-divider" />
              <div className="landing-arch-item">
                <span className="landing-arch-label">Backend</span>
                <span className="landing-arch-value">FastAPI</span>
              </div>
              <div className="landing-arch-divider" />
              <div className="landing-arch-item">
                <span className="landing-arch-label">Runtime</span>
                <span className="landing-arch-value">Docker SDK</span>
              </div>
              <div className="landing-arch-divider" />
              <div className="landing-arch-item">
                <span className="landing-arch-label">Charts</span>
                <span className="landing-arch-value">Recharts</span>
              </div>
              <div className="landing-arch-divider" />
              <div className="landing-arch-item">
                <span className="landing-arch-label">Metrics</span>
                <span className="landing-arch-value">SQLite</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-container">
          <AnimatedSection>
            <div className="landing-cta-inner">
              <h2 className="landing-cta-title">
                Ready to take control of your containers?
              </h2>
              <p className="landing-cta-desc">
                Open the dashboard and start managing, monitoring, and optimizing your
                local infrastructure now.
              </p>
              <div className="landing-cta-actions">
                <Link to="/dashboard" className="landing-btn-primary landing-btn-lg">
                  Open Dashboard
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="landing-btn-outline landing-btn-lg"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div className="landing-footer-brand">
              <Box size={15} strokeWidth={2.5} />
              <span>LocalScale</span>
            </div>
            <div className="landing-footer-links">
              <a href="#features" className="landing-footer-link">Features</a>
              <a href="#how-it-works" className="landing-footer-link">How It Works</a>
              <a href="#stack" className="landing-footer-link">Stack</a>
            </div>
            <p className="landing-footer-copy">
              &copy; {new Date().getFullYear()} LocalScale. Built for developers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
