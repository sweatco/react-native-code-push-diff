const path = require('path')
const { ROOT } = require('./utils')

function projectConfig() {
  try {
    return require(`${ROOT}/metro.config.js`)
  } catch (error) {
    return require(`${ROOT}/metro.config.json`)
  }
}

function assetPlugin() {
  return path.join(__dirname, 'assetPluginGetter.js')
}

const config = projectConfig()

config.transformer.assetPlugins.push(assetPlugin())

module.exports = config
