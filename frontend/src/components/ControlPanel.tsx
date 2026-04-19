import React, { useState } from 'react'
import { deployService, scaleService, startContainer, stopContainer, removeContainer } from '../services/api'

interface Props {
  onDone?: () => void
  containerName?: string
  containerId?: string
  containerStatus?: string
}

function toServiceBaseName(name?: string): string {
  if (!name) return ''
  return name.replace(/-\d+$/, '')
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

const ControlPanel: React.FC<Props> = ({ onDone, containerName, containerId, containerStatus }) => {
  const scopedContainerName = toServiceBaseName(containerName)
  const [image, setImage] = useState('nginx:alpine')
  const [name, setName] = useState('web')
  const [replicas, setReplicas] = useState<number>(1)
  const [envVars, setEnvVars] = useState('')
  const [portMapping, setPortMapping] = useState('8080:80')
  const [scaleName, setScaleName] = useState(scopedContainerName || '')
  const [scaleReplicas, setScaleReplicas] = useState<number>(1)
  const [status, setStatus] = useState<string | null>(null)

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Deploying...')
    try {
      let environment: Record<string, string> | undefined = undefined;
      if (envVars) {
        environment = {}
        envVars.split('\n').forEach(line => {
          const [k, ...v] = line.split('=')
          if (k && k.trim()) environment![k.trim()] = v.join('=').trim()
        })
      }
      
      let portsMap: Record<string, string> | undefined = undefined;
      if (portMapping.trim()) {
        const mappedPorts: Record<string, string> = {}
        portMapping.split(',').forEach(p => {
          const [host, container] = p.split(':')
          const hostPort = host?.trim()
          const containerPort = container?.trim()
          if (hostPort && containerPort) {
            mappedPorts[`${containerPort}/tcp`] = hostPort
          }
        })
        if (Object.keys(mappedPorts).length > 0) {
          portsMap = mappedPorts
        }
      }
      
      await deployService({ image, name, replicas, environment, ports: portsMap })
      setStatus('Deployed')
      if (onDone) onDone()
    } catch (err: unknown) {
      setStatus('Error: ' + errorMessage(err, 'deploy failed'))
    }
    setTimeout(() => setStatus(null), 3000)
  }

  async function handleScale(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Scaling...')
    try {
      await scaleService({ name: scaleName, replicas: scaleReplicas })
      setStatus('Scaled')
      if (onDone) onDone()
    } catch (err: unknown) {
      setStatus('Error: ' + errorMessage(err, 'scale failed'))
    }
    setTimeout(() => setStatus(null), 3000)
  }

  async function handleLifecycle(action: 'start' | 'stop' | 'remove') {
    if (!containerId) return
    setStatus(`${action === 'remove' ? 'Removing' : action === 'start' ? 'Starting' : 'Stopping'}...`)
    try {
      if (action === 'start') await startContainer(containerId)
      else if (action === 'stop') await stopContainer(containerId)
      else if (action === 'remove') await removeContainer(containerId)
      
      const verb = action === 'remove' ? 'removed' : action === 'stop' ? 'stopped' : 'started'
      setStatus(`Successfully ${verb}`)
      if (action === 'remove' && onDone) {
        // give it a tiny delay on remove before refresh to let react router or parent redirect back easily
        setTimeout(() => onDone(), 500)
      } else {
        if (onDone) onDone()
      }
    } catch (err: unknown) {
      setStatus('Error: ' + errorMessage(err, `${action} failed`))
    }
    setTimeout(() => setStatus(null), 3000)
  }

  const TEMPLATES = [
    { label: 'Web Server', image: 'nginx:alpine', name: 'web', env: '', ports: '8080:80' },
    { label: 'Compute App', image: 'localscale-demo', name: 'compute', env: '', ports: '9090:5000' },
    { label: 'Database', image: 'postgres:15-alpine', name: 'db', env: 'POSTGRES_PASSWORD=secret\nPOSTGRES_USER=admin', ports: '5432:5432' },
    { label: 'Cache', image: 'redis:alpine', name: 'cache', env: '', ports: '6379:6379' },
    { label: 'CPU Stress', image: 'alpine', name: 'stress', env: '', ports: '' },
  ]

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setImage(t.image)
    setName(t.name)
    setEnvVars(t.env)
    setPortMapping(t.ports)
    setReplicas(1)
  }

  return (
    <div className="neu-raised p-6 rounded-[var(--neu-radius)] space-y-6">
      <h3 className="text-lg font-semibold text-[var(--neu-text)]">Controls</h3>

      {!containerName && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map(t => (
                <button 
                  key={t.name} 
                  type="button" 
                  onClick={() => applyTemplate(t)} 
                  className="neu-raised p-4 text-left hover:scale-[1.02] transition-transform group"
                >
                  <div className="text-xs font-bold text-[var(--neu-accent)] mb-1 uppercase tracking-widest group-hover:text-[var(--neu-accent-hover)]">Template</div>
                  <div className="text-base font-bold text-[var(--neu-text)] mb-1">{t.label}</div>
                  <div className="text-[10px] font-mono text-[var(--neu-text-muted)] truncate">{t.image}</div>
                </button>
              ))}
          </div>

          <form onSubmit={handleDeploy} className="neu-inset p-6 rounded-[var(--neu-radius)] space-y-4">
            <div className="text-sm font-bold text-[var(--neu-text-muted)] uppercase tracking-widest mb-2">Custom Configuration</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--neu-text-muted)] uppercase ml-1">Image Source</label>
                <input value={image} onChange={(e) => setImage(e.target.value)} className="neu-inset bg-transparent border-none outline-none px-3 py-2.5 w-full rounded-[var(--neu-radius-xs)] text-[var(--neu-text)] font-mono text-sm" placeholder="image:tag" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--neu-text-muted)] uppercase ml-1">Service Identifier</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="neu-inset bg-transparent border-none outline-none px-3 py-2.5 w-full rounded-[var(--neu-radius-xs)] text-[var(--neu-text)]" placeholder="name" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--neu-text-muted)] uppercase ml-1">Instance Count</label>
                <input type="number" value={replicas} onChange={(e) => setReplicas(Number(e.target.value))} className="neu-inset bg-transparent border-none outline-none px-3 py-2.5 w-full rounded-[var(--neu-radius-xs)] text-[var(--neu-text)]" min={1} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--neu-text-muted)] uppercase ml-1">Port Bindings (Host:Guest)</label>
                <input value={portMapping} onChange={(e) => setPortMapping(e.target.value)} className="neu-inset bg-transparent border-none outline-none px-3 py-2.5 w-full rounded-[var(--neu-radius-xs)] text-[var(--neu-text)] text-sm font-mono" placeholder="8080:80" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--neu-text-muted)] uppercase ml-1">Environment Variables</label>
              <textarea value={envVars} onChange={(e) => setEnvVars(e.target.value)} className="neu-inset bg-transparent border-none outline-none px-4 py-3 w-full text-xs font-mono h-28 rounded-[var(--neu-radius-xs)] text-[var(--neu-text)] resize-none" placeholder={`KEY=value\nOTHER_KEY=something`} />
            </div>
            
            <button className="neu-btn text-[var(--neu-accent)] font-bold px-4 py-3 rounded-[var(--neu-radius-xs)] w-full text-sm">Deploy Configured Stack</button>
          </form>
        </div>
      )}

      <form onSubmit={handleScale} className="space-y-3">
        <div className="text-sm font-semibold text-[var(--neu-text)]">Scale Resources</div>
        <div className="flex gap-3">
          <input value={scaleName} onChange={(e) => setScaleName(e.target.value)} disabled={!!containerName} className="neu-inset bg-transparent border-none outline-none px-3 py-2 flex-1 disabled:opacity-60 rounded-[var(--neu-radius-xs)] text-[var(--neu-text)]" placeholder="service base name (e.g. web)" />
          <input type="number" value={scaleReplicas} onChange={(e) => setScaleReplicas(Number(e.target.value))} className="neu-inset bg-transparent border-none outline-none px-3 py-2 w-24 rounded-[var(--neu-radius-xs)] text-[var(--neu-text)]" min={0} />
          <button className="neu-btn text-[var(--neu-accent)] font-bold px-4 py-2 rounded-[var(--neu-radius-xs)]">Scale</button>
        </div>
      </form>

      {containerId && (
        <div className="space-y-3 pt-2">
          <div className="text-sm font-semibold text-[var(--neu-text)]">Lifecycle Configuration</div>
          <div className="flex gap-3">
            {containerStatus !== 'running' ? (
              <button onClick={() => handleLifecycle('start')} className="neu-btn px-4 py-2 font-medium text-green-600 flex-1 rounded-[var(--neu-radius-xs)]">Start Container</button>
            ) : (
              <button onClick={() => handleLifecycle('stop')} className="neu-btn px-4 py-2 font-medium text-yellow-600 flex-1 rounded-[var(--neu-radius-xs)]">Stop Container</button>
            )}
            <button onClick={() => handleLifecycle('remove')} className="neu-btn px-4 py-2 font-medium text-red-500 rounded-[var(--neu-radius-xs)]">Remove</button>
          </div>
        </div>
      )}

      {status && <div className="text-sm font-medium text-[var(--neu-text-secondary)] mt-2">{status}</div>}
    </div>
  )
}

export default ControlPanel
