import { flattenToCss } from '../flattenStyle'

describe('flattenToCss', () => {
  it('expands RN-only shorthands into CSS pairs', () => {
    expect(
      flattenToCss({ paddingHorizontal: 12, paddingVertical: 8 } as never),
    ).toEqual({
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 8,
      paddingBottom: 8,
    })
    expect(
      flattenToCss({ marginHorizontal: 4, marginStart: 2 } as never),
    ).toEqual({ marginLeft: 4, marginRight: 4, marginInlineStart: 2 })
  })

  it('lets explicit long-hands win over expanded shorthands', () => {
    expect(
      flattenToCss({ paddingHorizontal: 12, paddingLeft: 0 } as never),
    ).toEqual({ paddingLeft: 0, paddingRight: 12 })
  })

  it('flattens arrays and passes plain CSS-safe objects through', () => {
    expect(
      flattenToCss([{ padding: 4 }, { paddingVertical: 8 }] as never),
    ).toEqual({ padding: 4, paddingTop: 8, paddingBottom: 8 })
    const plain = { padding: 4, color: 'red' }
    expect(flattenToCss(plain as never)).toEqual(plain)
  })
})
