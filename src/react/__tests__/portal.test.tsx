import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Portal, PortalHost, PortalScope } from '../portal'

function tree(hosts: readonly string[], label = 'content') {
  return (
    <PortalScope>
      <Portal hostName="target">
        <Text>{label}</Text>
      </Portal>
      {hosts.map((key) => (
        <PortalHost key={key} name="target" />
      ))}
    </PortalScope>
  )
}

describe('registry portal', () => {
  it('buffers content until a host mounts', () => {
    const screen = render(tree([]))
    expect(screen.queryByText('content')).toBeNull()
    screen.rerender(tree(['host']))
    expect(screen.getByText('content')).toBeTruthy()
  })

  it('uses one active host and restores an older overlapping host', () => {
    const screen = render(tree(['old']))
    screen.rerender(tree(['old', 'replacement']))
    expect(screen.getAllByText('content')).toHaveLength(1)

    // A replacement can disappear before the older host unmounts. Content
    // must return to the still-live older host, not vanish from the registry.
    screen.rerender(tree(['old'], 'fresh'))
    expect(screen.getByText('fresh')).toBeTruthy()
  })

  it('removes independently keyed portal content', () => {
    const screen = render(
      <PortalScope>
        <Portal hostName="target">
          <Text>first</Text>
        </Portal>
        <Portal hostName="target">
          <Text>second</Text>
        </Portal>
        <PortalHost name="target" />
      </PortalScope>,
    )
    expect(screen.getByText('first')).toBeTruthy()
    expect(screen.getByText('second')).toBeTruthy()
    screen.rerender(tree(['host'], 'second'))
    expect(screen.queryByText('first')).toBeNull()
    expect(screen.getByText('second')).toBeTruthy()
  })
})
