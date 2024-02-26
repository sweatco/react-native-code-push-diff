const { bundle } = require('react-native-code-push-diff/bundle')
const { execSync } = require('child_process')

async function codepush() {
  const output = await bundle({
    entry: 'index.js',
    os: 'android',
    base: 'main',
    reinstallNodeModulesCommand: 'yarn install',
  })

  console.log(output)

  //execSync(`yarn appcenter codepush release -a ${app} -c ${content} -t ${version} -d Staging`)
}

codepush()
