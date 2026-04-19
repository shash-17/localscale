import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from '../Dashboard'
import { fetchContainers } from '../../services/api'

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api')
  return {
    ...actual,
    fetchContainers: vi.fn(),
  }
})

vi.mock('../../components/MetricsChart', () => ({ default: () => <div>metrics-chart</div> }))
vi.mock('../../components/EconomicsPanel', () => ({ default: () => <div>economics-panel</div> }))
vi.mock('../../components/ControlPanel', () => ({ default: () => <div>control-panel</div> }))
vi.mock('../../components/PolicyPanel', () => ({ default: () => <div>policy-panel</div> }))
vi.mock('../../components/LogViewer', () => ({ default: () => <div>log-viewer</div> }))
vi.mock('../../components/AutoScalerPanel', () => ({ default: () => <div>autoscaler-panel</div> }))
vi.mock('../../components/PolicyViolationsPanel', () => ({
  default: ({ containerName }: { containerName?: string }) => (
    <div>{`violations-${containerName || 'global'}`}</div>
  ),
}))
vi.mock('../../components/ContainerList', () => ({
  default: ({ onViewDetails }: { onViewDetails?: (name: string) => void }) => (
    <button onClick={() => onViewDetails?.('web-1')}>open-details</button>
  ),
}))

const mockedFetchContainers = vi.mocked(fetchContainers)

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchContainers.mockResolvedValue([
      { id: '1', name: 'web-1', status: 'running', image: 'nginx:alpine', ports: [] },
    ])
  })

  it('shows global violations panel in autoscaler view and scoped panel in details view', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockedFetchContainers).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Auto-Scaler/i }))
    expect(await screen.findByText('violations-global')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Dashboard/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'open-details' }))

    expect(await screen.findByText('violations-web-1')).toBeInTheDocument()
  })
})
