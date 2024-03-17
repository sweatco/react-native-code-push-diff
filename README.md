# react-native-code-push-diff

The primary objective of this library is to significantly decrease the size of codepush bundles, which comprise both the JavaScript bundle and its associated assets. This is achieved by utilizing a script that retains only the modified or newly added files within the bundle. As a result, this selective retention mechanism enables a drastic reduction in the overall bundle size, often decreasing it by several times. This optimization facilitates more efficient updates and faster distribution, enhancing the overall deployment process and user experience.

## Installation

```sh
yarn add react-native-code-push-diff
```

## Usage

1. Add `import 'react-native-code-push-diff/setup'` in the root file.

```diff
+import 'react-native-code-push-diff/setup'
import { AppRegistry } from 'react-native'
import App from './src/App'
import { name as appName } from './app.json'

AppRegistry.registerComponent(appName, () => App)
```

2. Run the `code-push-diff release-react --app {YOUR_APP_NAME} --base {BRANCH_OR_COMMIT}` if you need to create and release a codepush bundle.

## How does it work?
The `bundle` or `release-react` scripts initiate their process by generating bundles corresponding to the current active `git commit` and a specified `base` commit, which is provided as an argument. This step is crucial for identifying the exact changes in assets that have occurred between these two states. Following this, the scripts compute the differences in assets across the generated bundles to pinpoint which files have been modified or  added.

The `react-native-code-push-diff/setup` plays a key role by setting up a custom source transformer based on [the specified transformer mechanism](https://github.com/facebook/react-native/blob/v0.71.7/Libraries/Image/resolveAssetSource.js#L77) in React Native. It makes sure that this file is extracted from the codepush bundle and not the main bundle, otherwise the file will be extracted from the `main` bundle.

## Script Usage

### bundle

The `bundle` command is designed to generate a codepush bundle incorporating only the assets that have changed:
```sh
yarn code-push-diff bundle {appOrOs} --base {branchOrCommit}
```

- `appOrOs` - this parameter specifies the context in which the bundle is to be built. You can either input the name of an application as defined within your appcenter configuration or directly specify the platform for which you are building the bundle (`ios` or `android`).

- `branchOrCommit` - this argument determines the reference point for calculating asset differences. It should be the identifier of the branch or commit that served as the basis for your most recent application build. By specifying this, the script can accurately assess which assets have changed and need to be included in the codepush bundle, ensuring that your updates are both efficient and relevant.


For example:
`code-push-diff bundle i.kuchaev/AwesomeProject --base release-2.1`

Also the script apply all args for the [release-react](https://github.com/microsoft/code-push/tree/v3.0.1/cli#releasing-updates-react-native) command, like `plist-file`, `output-dir` etc.

For example:
`code-push-diff bundle i.kuchaev/AwesomeProject --base release-2.1 --plist-file ios/project/Info.plist`

### release-react
The `release-react` command leverages the code-push-diff bundle functionality to construct a bundle and then releases it to App Center:
```sh
code-push-diff release-react --app {appName} --base {branchOrCommit}
```

- `app` - This should be the exact name of your application as registered in App Center. It enables the script to correctly identify and target the application for the update release.

- `branchOrCommit` - Specify the branch or commit that will act as a reference point for identifying changes. Typically, you should use the commit or branch that corresponds to the last build of your released application. This comparison helps in determining which assets have changed and need to be included in the release.

This script also supports all the parameters available for the [release-react command](https://github.com/microsoft/code-push/tree/v3.0.1/cli#releasing-updates-react-native) used by CodePush, , like `plistFile`, `outputDir` etc.

```sh
code-push-diff release-react --app i.kuchaev/AwesomeProject --base release-2.1 --plist-file ios/project/Info.plist --rallout 50
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
