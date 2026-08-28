/**
 * Native smoke suite over the scenario registry (gallery/scenarios).
 *
 * Every non-webOnly scenario renders under an OverlayHost, and — when it
 * exposes a single obvious trigger (a Text whose content starts with
 * "Open ") — the trigger is pressed and something new must mount:
 * the scenario's `smokeText` when it declares one, otherwise any change to
 * the rendered tree. Scenarios without an "Open " trigger (toggles, hover
 * tooltips, multi-trigger displacement demos) are render-only here; their
 * interactions are covered by the Storybook play functions and the
 * per-component native tests.
 *
 * One it.each over the registry: every future scenario added to
 * gallery/scenarios/index.ts is automatically smoke-covered.
 */
import { act, fireEvent, render } from '@testing-library/react-native'
import { scenarios } from '../../../gallery/scenarios'
import { OverlayHost } from '../../react/OverlayHost'

const nativeScenarios = scenarios.filter((s) => !s.webOnly)

// Portal/lifecycle work lands after effect + timer passes; flush them.
const flush = () => act(() => jest.runOnlyPendingTimers())

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('scenario registry smoke (native)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('covers every registered scenario', () => {
    expect(nativeScenarios.length).toBeGreaterThan(0)
    expect(new Set(scenarios.map((s) => s.key)).size).toBe(scenarios.length)
  })

  it.each(nativeScenarios.map((s) => [`${s.family} › ${s.title}`, s] as const))(
    '%s renders and opens',
    (_label, scenario) => {
      const screen = render(
        <OverlayHost>
          <scenario.Component />
        </OverlayHost>,
      )
      flush()

      // Trigger discovery: exactly one Text starting with "Open " (the shared
      // helper Button convention). Note /^Open / — "Open," etc. don't count.
      const triggers = screen.queryAllByText(/^Open /)
      if (triggers.length !== 1) {
        // No unambiguous trigger — rendering without throwing is the contract.
        expect(screen.toJSON()).toBeTruthy()
        return
      }

      const before = JSON.stringify(screen.toJSON())
      fireEvent.press(triggers[0])
      flush()

      if (scenario.smokeText) {
        // Regex (not exact string) so JSX-collapsed multi-line text matches.
        const matches = screen.queryAllByText(
          new RegExp(escapeRegExp(scenario.smokeText)),
        )
        expect(matches.length).toBeGreaterThan(0)
      } else {
        expect(JSON.stringify(screen.toJSON())).not.toEqual(before)
      }
    },
  )
})
