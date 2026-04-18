import React, { useState } from 'react'
import { deployService, scaleService } from '../services/api'

interface Props {
  onDone?: () => void
}

const ControlPanel: React.FC<Props> = ({ onDone }) => {
  const [image, setImage] = useState('nginx:alpine')
  const [name, setName] = useState('test')
  const [replicas, setReplicas] = useState<number>(1)
  const [scaleName, setScaleName] = useState('')
  const [scaleReplicas, setScaleReplicas] = useState<number>(1)
  const [status, setStatus] = useState<string | null>(null)

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Deploying...')
    try {
      await deployService({ image, name, replicas })
      setStatus('Deployed')
      onDone && onDone()
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || 'deploy failed'))
    }
    setTimeout(() => setStatus(null), 3000)
  }

  async function handleScale(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Scaling...')
    try {
      await scaleService({ name: scaleName, replicas: scaleReplicas })
      setStatus('Scaled')
      onDone && onDone()
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || 'scale failed'))
    }
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-4">
      <h3 className="text-lg font-medium">Controls</h3>

      <form onSubmit={handleDeploy} className="space-y-2">
        <div className="text-sm font-semibold">Deploy</div>
        <div className="flex gap-2">
          <input value={image} onChange={(e) => setImage(e.target.value)} className="border px-2 py-1 flex-1" placeholder="image:tag" />
          <input value={name} onChange={(e) => setName(e.target.value)} className="border px-2 py-1 w-40" placeholder="name" />
          <input type="number" value={replicas} onChange={(e) => setReplicas(Number(e.target.value))} className="border px-2 py-1 w-24" min={1} />
          <button className="bg-indigo-600 text-white px-3 py-1 rounded">Deploy</button>
        </div>
      </form>

      <form onSubmit={handleScale} className="space-y-2">
        <div className="text-sm font-semibold">Scale</div>
        <div className="flex gap-2">
          <input value={scaleName} onChange={(e) => setScaleName(e.target.value)} className="border px-2 py-1 flex-1" placeholder="service base name (e.g. web)" />
          <input type="number" value={scaleReplicas} onChange={(e) => setScaleReplicas(Number(e.target.value))} className="border px-2 py-1 w-24" min={0} />
          <button className="bg-indigo-600 text-white px-3 py-1 rounded">Scale</button>
        </div>
      </form>

      {status && <div className="text-sm text-gray-600">{status}</div>}
    </div>
  )
}

export default ControlPanel
