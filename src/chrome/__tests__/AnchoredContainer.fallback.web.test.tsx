import { render } from '@testing-library/react'
import { AnchoredContainer } from '../AnchoredContainer'
import { setWebCapabilityOverrides } from '../webCapabilities'

const mockHostShown = jest.fn()
const mockLayoutReady = jest.fn()
const mockSurfaceRef = jest.fn()
const mockTriggerRef = { current: null as HTMLElement | null }
const mockContext = {
  state: {
    phase: 'presented',
    isMounted: true,
    isOpen: true,
    isPresented: true,
  },
  signals: {
    onHostShown: mockHostShown,
    onLayoutReady: mockLayoutReady,
  },
  actions: { requestDismiss: jest.fn() },
  panelId: 'test-popover',
  kind: 'popover',
  refs: {
    surface: mockSurfaceRef,
    trigger: mockTriggerRef,
    panel: { current: null },
  },
  behavior: 'auto',
  anchored: {
    isPositioned: true,
    panelStyle: { position: 'fixed', top: 10, left: 20 },
  },
  exitMs: 120,
}

jest.mock('../../react/overlayContext', () => ({
  useAnchoredOverlayContext: () => mockContext,
  useOverlayContext: () => mockContext,
}))
jest.mock('../../react/OverlayHost.web', () => ({
  OVERLAY_ROOT_ID: 'rno-overlay-root',
}))

// The capability registry (not prototype absence) pins the fallback branch.
beforeAll(() => setWebCapabilityOverrides({ popover: false }))
afterAll(() => setWebCapabilityOverrides(null))

beforeEach(() => {
  mockHostShown.mockReset()
  mockLayoutReady.mockReset()
  mockSurfaceRef.mockReset()
})

it('portals without a Popover API, reports both gates, and restores focus', () => {
  const portalRoot = document.createElement('div')
  portalRoot.id = 'rno-overlay-root'
  document.body.appendChild(portalRoot)
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  mockTriggerRef.current = trigger

  const screen = render(
    <AnchoredContainer role="dialog" accessibilityLabel="Actions">
      <button type="button">inside</button>
    </AnchoredContainer>,
  )

  const panel = portalRoot.querySelector('[data-overlaid-popover]')
  expect(panel?.getAttribute('popover')).toBeNull()
  expect(panel?.getAttribute('aria-label')).toBe('Actions')
  expect(mockHostShown).toHaveBeenCalled()
  expect(mockLayoutReady).toHaveBeenCalled()

  screen.getByRole('button', { name: 'inside' }).focus()
  screen.unmount()
  expect(document.activeElement).toBe(trigger)

  trigger.remove()
  portalRoot.remove()
})
