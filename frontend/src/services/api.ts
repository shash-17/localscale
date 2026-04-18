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

export async function fetchHistory(limit = 100): Promise<MetricHistory[]> {
  const { data } = await api.get<MetricHistory[]>(`/metrics/history?limit=${limit}`)
  return data
}

export default api
