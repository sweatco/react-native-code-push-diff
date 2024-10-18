import React, { useState, useEffect } from 'react'
import CodePush, { type LocalPackage } from 'react-native-code-push'

import { StyleSheet, View, Image, Text, Platform } from 'react-native'

const useGetCodePushVersion = () => {
  const [version, setVersion] = useState<LocalPackage | null>(null)
  useEffect(() => {
    CodePush.getUpdateMetadata().then(setVersion)
  }, [])
  return version
}

const useInstallCodePushUpdate = () => {
  useEffect(() => {
    CodePush.sync({
      deploymentKey: Platform.select({
        ios: process.env.CODEPUSH_DEPLOYMENT_KEY_IOS,
        android: process.env.CODEPUSH_DEPLOYMENT_KEY_ANDROID,
      }),
      installMode: CodePush.InstallMode.IMMEDIATE,
    })
  }, [])
}

export default function App() {
  useInstallCodePushUpdate()
  const version = useGetCodePushVersion()

  const imageUri = Image.resolveAssetSource(require('./image.png')).uri

  return (
    <View style={styles.container}>
      <Text>CodePush Version: {version?.label ?? 'N/A'}</Text>
      <Text>Image URI: {imageUri}</Text>
      <Image source={require('./image.png')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
})
