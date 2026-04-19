import axios from 'axios'
import type { AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
})

export interface Container {
  id: string
  name: string
  status: string
  image: string
  ports?: string[]
}

export interface Stats {
  cpu_percent: number
  memory: string
  network_io: string
}

export interface MetricHistory {
  id?: number
  container_name: string
  cpu_pct: number
  mem_mb: number
  timestamp: string
  estimated_cost: number
  carbon_g: number
}

export interface DeployRequest {
  image: string
  name: string
  replicas?: number
  ports?: Record<string, any>
  environment?: Record<string, string>
}

export interface ScaleRequest {
  name: string
  replicas: number
}

export async function fetchContainers(): Promise<Container[]> {
  const { data } = await api.get<Container[]>('/containers')
  return data
}

export async function fetchStats(id: string): Promise<Stats> {
  const { data } = await api.get<Stats>(`/containers/${id}/stats`)
  return data
}

export async function deployService(req: DeployRequest): Promise<any> {
  const { data } = await api.post('/deploy', req)
  return data
}

export async function scaleService(req: ScaleRequest): Promise<any> {
  const { data } = await api.post('/scale', req)
  return data
}

export async function fetchHistory(limit = 100, containerName?: string): Promise<MetricHistory[]> {
  const url = containerName 
    ? `/metrics/history?limit=${limit}&container_name=${encodeURIComponent(containerName)}`
    : `/metrics/history?limit=${limit}`
  const { data } = await api.get<MetricHistory[]>(url)
  return data
}

export default api

export async function fetchPolicies(): Promise<any[]> {
  try {
    const { data } = await api.get<any[]>('/policies')
    return data
  } catch(e) {
    return []
  }
}

export async function addPolicy(policy: any): Promise<any> {
  const { data } = await api.post('/policies', { policy })
  return data
}


export async function stopContainer(id: string): Promise<any> {
  const { data } = await api.post(`/containers/${id}/stop`)
  return data
}

export async function startContainer(id: string): Promise<any> {
  const { data } = await api.post(`/containers/${id}/start`)
  return data
}

export async function removeContainer(id: string): Promise<any> {
  const { data } = await api.delete(`/containers/${id}`)
  return data
}

export async function fetchLogs(id: string, tail = 100): Promise<string> {
  const { data } = await api.get<{ logs: string }>(`/containers/${id}/logs?tail=${tail}`)
  return data.logs
}

// ── Auto-Scaler APIs ──────────────────────────────────────────
export interface ScalingEvent {
  id: number
  container_name: string
  action: string
  slope: number
  current_cpu: number
  current_replicas: number
  target_replicas: number
  reason: string
  timestamp: string
}

export interface AutoScalerConfig {
  enabled: boolean
  lookback_minutes: number
  min_data_points: number
  slope_up_threshold: number
  slope_down_threshold: number
  cpu_low_for_down: number
  cooldown_seconds: number
  max_replicas: number
  min_replicas: number
  ma_window: number
}

export interface ScalingStatus {
  enabled: boolean
  config: AutoScalerConfig
  recent_events: ScalingEvent[]
}

export async function fetchScalingEvents(limit = 50, containerName?: string): Promise<ScalingEvent[]> {
  const url = containerName
    ? `/scaling/events?limit=${limit}&container_name=${encodeURIComponent(containerName)}`
    : `/scaling/events?limit=${limit}`
  const { data } = await api.get<ScalingEvent[]>(url)
  return data
}

export async function fetchScalingConfig(): Promise<AutoScalerConfig> {
  const { data } = await api.get<AutoScalerConfig>('/scaling/config')
  return data
}

export async function updateScalingConfig(config: Partial<AutoScalerConfig>): Promise<any> {
  const { data } = await api.post('/scaling/config', config)
  return data
}

export async function fetchScalingStatus(): Promise<ScalingStatus> {
  const { data } = await api.get<ScalingStatus>('/scaling/status')
  return data
}
