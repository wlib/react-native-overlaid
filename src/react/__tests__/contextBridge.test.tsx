import { render } from '@testing-library/react-native'
import { createContext, useContext } from 'react'
import { Text } from 'react-native'
import { useContextBridge } from '../contextBridge'
import { Portal, PortalHost, PortalScope } from '../portal'

const Theme = createContext('host-default')

function Value() {
  return <Text>{useContext(Theme)}</Text>
}

function Publisher() {
  const Bridge = useContextBridge(Theme)
  return (
    <Portal hostName="host">
      <Bridge>
        <Value />
      </Bridge>
    </Portal>
  )
}

function tree(value: string) {
  return (
    <PortalScope>
      <Theme.Provider value={value}>
        <Publisher />
      </Theme.Provider>
      <PortalHost name="host" />
    </PortalScope>
  )
}

describe('useContextBridge', () => {
  it('re-provides source context at the registry host and keeps it live', () => {
    const screen = render(tree('source-one'))
    expect(screen.getByText('source-one')).toBeTruthy()
    screen.rerender(tree('source-two'))
    expect(screen.getByText('source-two')).toBeTruthy()
    expect(screen.queryByText('host-default')).toBeNull()
  })
})
