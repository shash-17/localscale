import React, { useEffect, useMemo, useState } from 'react'
import { fetchHistory } from '../services/api'
import type { MetricHistory } from '../services/api'
import { DollarSign, Leaf, Globe, Server } from 'lucide-react'

interface Props {
  metrics?: MetricHistory[]
  limit?: number
  containerName?: string
  minimal?: boolean
}

// ── CSP Rate Cards (mirror of backend CSP_RATE_CARDS) ──
const CSP_CARDS: Record<string, { label: string; vcpu_hour: number; gb_ram_hour: number; desc: string }> = {
  'sim_default':   { label: 'LocalScale Default', vcpu_hour: 0.01, gb_ram_hour: 0.005, desc: 'Simulator baseline' },
  'aws_t3_medium': { label: 'AWS t3.medium', vcpu_hour: 0.0208, gb_ram_hour: 0.0052, desc: '2 vCPU, 4 GiB' },
  'aws_t3_micro':  { label: 'AWS t3.micro',  vcpu_hour: 0.0052, gb_ram_hour: 0.0052, desc: '2 vCPU, 1 GiB' },
  'gcp_e2_medium': { label: 'GCP e2-medium', vcpu_hour: 0.0168, gb_ram_hour: 0.00225, desc: '2 vCPU, 4 GiB' },
  'gcp_e2_small':  { label: 'GCP e2-small',  vcpu_hour: 0.0084, gb_ram_hour: 0.00225, desc: '2 vCPU, 2 GiB' },
  'azure_b2s':     { label: 'Azure B2s',     vcpu_hour: 0.0208, gb_ram_hour: 0.0052, desc: '2 vCPU, 4 GiB' },
  'local':         { label: 'Local (Free)',   vcpu_hour: 0.0,    gb_ram_hour: 0.0,    desc: 'No cost' },
}

// ── Region Carbon Intensity (mirror of backend CARBON_INTENSITY) ──
const REGIONS: Record<string, { label: string; gco2_kwh: number }> = {
  'us-east-1':      { label: 'US East (Virginia)',   gco2_kwh: 450 },
  'us-west-2':      { label: 'US West (Oregon)',     gco2_kwh: 120 },
  'us-central1':    { label: 'US Central (Iowa)',    gco2_kwh: 480 },
  'eu-west-1':      { label: 'EU West (Ireland)',    gco2_kwh: 200 },
  'eu-central-1':   { label: 'EU Central (Frankfurt)', gco2_kwh: 350 },
  'ap-southeast-1': { label: 'Asia (Singapore)',     gco2_kwh: 500 },
}

const W_PER_VCPU = 10.0
const W_PER_GB_RAM = 0.5

const EconomicsPanel: React.FC<Props> = ({ metrics: initialMetrics, limit = 500, containerName, minimal }) => {
  const [fetchedMetrics, setFetchedMetrics] = useState<MetricHistory[] | null>(null)
  const [csp, setCsp] = useState('sim_default')
  const [region, setRegion] = useState('us-east-1')

  const metrics = initialMetrics ?? fetchedMetrics

  useEffect(() => {
    let mounted = true
    if (initialMetrics) {
      return
    }
    
    function load() {
      fetchHistory(limit, containerName).then((m) => {
        if (mounted) setFetchedMetrics(m)
      }).catch(() => {})
    }

    load()
    const iv = setInterval(load, 5000)

    return () => {
      mounted = false
      clearInterval(iv)
    }
  }, [initialMetrics, limit, containerName])

  const totals = useMemo(() => {
    if (!metrics || metrics.length === 0) return { cost: 0, carbonG: 0, carbonKg: 0, samples: 0 }
    const card = CSP_CARDS[csp] || CSP_CARDS['sim_default']
    const regionData = REGIONS[region] || REGIONS['us-east-1']

    let totalCost = 0
    let totalCarbonG = 0
    const durationHours = 10 / 3600 // Each sample is a 10-second interval

    for (const m of metrics) {
      const vcpus = Math.max((m.cpu_pct || 0), 0) / 100
      const gbRam = Math.max((m.mem_mb || 0), 0) / 1024

      // Cost from real rate cards
      const vcpuCost = vcpus * durationHours * card.vcpu_hour
      const ramCost = gbRam * durationHours * card.gb_ram_hour
      totalCost += vcpuCost + ramCost

      // Carbon from real region data
      const energyCpu = vcpus * durationHours * W_PER_VCPU / 1000
      const energyRam = gbRam * durationHours * W_PER_GB_RAM / 1000
      totalCarbonG += (energyCpu + energyRam) * regionData.gco2_kwh
    }

    return { cost: totalCost, carbonG: totalCarbonG, carbonKg: totalCarbonG / 1000, samples: metrics.length }
  }, [metrics, csp, region])

  // ── Minimal variant (used in status bar) ──
  if (minimal) {
    return (
      <div className="flex items-center justify-around w-full">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)] mb-1">Network Cost</div>
          <div className="text-xl font-bold tracking-tight text-[var(--neu-text)] truncate">
            ${totals.cost.toFixed(4)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)] mb-1">Carbon Est.</div>
          <div className="text-xl font-bold tracking-tight text-[var(--neu-text)] truncate">
            {totals.carbonKg.toFixed(2)} <span className="text-[10px] text-[var(--neu-text-muted)] tracking-normal">kg CO₂</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Full variant ──
  return (
    <div className="neu-raised p-6 rounded-[var(--neu-radius)] flex flex-col space-y-5">
      {/* Header with selectors */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <h3 className="text-lg font-semibold text-[var(--neu-text)] flex items-center gap-2">
          <DollarSign size={18} className="text-[var(--neu-accent)]" />
          Cloud Economics
          {containerName && <span className="text-sm font-normal text-[var(--neu-text-secondary)] ml-1">({containerName})</span>}
        </h3>
        <div className="flex gap-3">
          {/* CSP Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--neu-text-muted)] ml-1 flex items-center gap-1">
              <Server size={9} /> Instance Type
            </label>
            <select
              value={csp}
              onChange={(e) => setCsp(e.target.value)}
              className="neu-inset bg-transparent outline-none border-none text-xs px-3 py-1.5 rounded-[var(--neu-radius-xs)] text-[var(--neu-text)] cursor-pointer"
            >
              {Object.entries(CSP_CARDS).map(([key, val]) => (
                <option key={key} value={key} className="bg-[var(--neu-bg)]">
                  {val.label} ({val.desc})
                </option>
              ))}
            </select>
          </div>

          {/* Region Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--neu-text-muted)] ml-1 flex items-center gap-1">
              <Globe size={9} /> Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="neu-inset bg-transparent outline-none border-none text-xs px-3 py-1.5 rounded-[var(--neu-radius-xs)] text-[var(--neu-text)] cursor-pointer"
            >
              {Object.entries(REGIONS).map(([key, val]) => (
                <option key={key} value={key} className="bg-[var(--neu-bg)]">
                  {val.label} ({val.gco2_kwh} gCO₂/kWh)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Estimated Cost */}
        <div className="neu-inset p-4 rounded-[var(--neu-radius-sm)]">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)] mb-1.5 flex items-center gap-1">
            <DollarSign size={10} /> Session Cost
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--neu-text)]">
            ${totals.cost.toFixed(6)}
          </div>
          <div className="text-[10px] text-[var(--neu-text-muted)] mt-1">
            {CSP_CARDS[csp]?.label || csp} pricing
          </div>
        </div>

        {/* Hourly Rate */}
        <div className="neu-inset p-4 rounded-[var(--neu-radius-sm)]">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)] mb-1.5">
            Hourly Rate
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--neu-text)]">
            ${totals.samples > 0 ? (totals.cost / (totals.samples * 10 / 3600)).toFixed(4) : '0.0000'}
          </div>
          <div className="text-[10px] text-[var(--neu-text-muted)] mt-1">$/hr projected</div>
        </div>

        {/* Carbon Footprint */}
        <div className="neu-inset p-4 rounded-[var(--neu-radius-sm)]">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)] mb-1.5 flex items-center gap-1">
            <Leaf size={10} className="text-green-500" /> Carbon
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--neu-text)]">
            {totals.carbonG.toFixed(2)}
            <span className="text-sm text-[var(--neu-text-muted)] ml-1">g CO₂</span>
          </div>
          <div className="text-[10px] text-[var(--neu-text-muted)] mt-1">{REGIONS[region]?.label}</div>
        </div>

        {/* Grid Intensity */}
        <div className="neu-inset p-4 rounded-[var(--neu-radius-sm)]">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--neu-text-muted)] mb-1.5 flex items-center gap-1">
            <Globe size={10} /> Grid
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--neu-text)]">
            {REGIONS[region]?.gco2_kwh}
            <span className="text-sm text-[var(--neu-text-muted)] ml-1">gCO₂/kWh</span>
          </div>
          <div className="text-[10px] mt-1">
            {REGIONS[region]?.gco2_kwh <= 200 ? (
              <span className="text-green-500 font-bold">🟢 Clean Grid</span>
            ) : REGIONS[region]?.gco2_kwh <= 400 ? (
              <span className="text-yellow-500 font-bold">🟡 Mixed Grid</span>
            ) : (
              <span className="text-red-400 font-bold">🔴 High Carbon</span>
            )}
          </div>
        </div>
      </div>

      {/* Rate card info */}
      <div className="text-[10px] text-[var(--neu-text-muted)] flex items-center gap-4 pt-1 border-t border-[var(--neu-border)]">
        <span>vCPU/hr: <span className="font-mono font-bold text-[var(--neu-text-secondary)]">${CSP_CARDS[csp]?.vcpu_hour.toFixed(4)}</span></span>
        <span>RAM/GB-hr: <span className="font-mono font-bold text-[var(--neu-text-secondary)]">${CSP_CARDS[csp]?.gb_ram_hour.toFixed(4)}</span></span>
        <span>{totals.samples} samples collected</span>
      </div>
    </div>
  )
}

export default EconomicsPanel
