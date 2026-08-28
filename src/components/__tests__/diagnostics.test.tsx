import { diagnoseDetents, diagnoseLayout } from '../diagnostics'

describe('development diagnostics', () => {
  afterEach(() => jest.restoreAllMocks())

  it('accepts portable layout and detent inputs silently', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    diagnoseLayout('Dialog', {
      width: '90%',
      maxWidth: 560,
      horizontalPadding: 16,
    })
    diagnoseDetents(['content', '66%', 'full'], 1)
    expect(warn).not.toHaveBeenCalled()
  })

  it('explains unsupported layout units and malformed detents', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    diagnoseLayout('Dialog', {
      width: 'calc(100% - 2rem)' as never,
      horizontalPadding: -1,
    })
    diagnoseDetents([0 as never, '120%' as never], -1)

    expect(warn.mock.calls.flat().join('\n')).toEqual(
      expect.stringContaining('layout.width'),
    )
    expect(warn.mock.calls.flat().join('\n')).toEqual(
      expect.stringContaining('horizontalPadding'),
    )
    expect(warn.mock.calls.flat().join('\n')).toEqual(
      expect.stringContaining('detents[0]'),
    )
    expect(warn.mock.calls.flat().join('\n')).toEqual(
      expect.stringContaining('initialDetent'),
    )
  })
})
