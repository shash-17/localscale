import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import PolicyViolationsPanel from '../PolicyViolationsPanel'
import { fetchPolicyViolations } from '../../services/api'

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api')
  return {
    ...actual,
    fetchPolicyViolations: vi.fn(),
  }
})

const mockedFetchPolicyViolations = vi.mocked(fetchPolicyViolations)

describe('PolicyViolationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when there are no violations', async () => {
    mockedFetchPolicyViolations.mockResolvedValueOnce([])

    render(<PolicyViolationsPanel />)

    await waitFor(() => {
      expect(mockedFetchPolicyViolations).toHaveBeenCalledWith(20, undefined)
    })
    expect(screen.getByText('Policy Violations')).toBeInTheDocument()
    expect(screen.getByText(/No violations detected/i)).toBeInTheDocument()
  })

  it('renders violation entries from API', async () => {
    mockedFetchPolicyViolations.mockResolvedValueOnce([
      {
        id: 1,
        container_name: 'web-1',
        policy: 'Keep carbon under 0.01g per run in web',
        metric: 'carbon',
        threshold: 0.01,
        observed: 0.42,
        period: 'run',
        timestamp: '2026-04-19T10:00:00Z',
      },
    ])

    render(<PolicyViolationsPanel containerName="web" limit={25} />)

    await waitFor(() => {
      expect(mockedFetchPolicyViolations).toHaveBeenCalledWith(25, 'web')
    })
    expect(screen.getByText('web-1')).toBeInTheDocument()
    expect(screen.getByText(/Carbon \(g\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Keep carbon under 0.01g per run in web/i)).toBeInTheDocument()
  })
})
