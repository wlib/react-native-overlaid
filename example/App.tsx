import { StatusBar, StyleSheet, View } from 'react-native'
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'
import { OverlayGallery } from '../gallery'

// Native overlays render in their own OS windows, where SafeAreaView-style
// wrappers can't reach — so insets are read here as NUMBERS and passed down.
// The gallery pads its own list with them and forwards them to scenarios,
// which pass them to Drawer/Dialog/Sheet/Popover via their `insets` prop.
function Gallery() {
  const insets = useSafeAreaInsets()
  return <OverlayGallery insets={{ top: insets.top, bottom: insets.bottom }} />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <Gallery />
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
})
