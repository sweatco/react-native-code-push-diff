import * as fs from 'fs'
import * as path from 'path'
import * as semver from 'semver'
import type { VersionSearchParams } from '../bundle/types'

function isValidVersion(version: string): boolean {
  return !!semver.valid(version) || /^\d+\.\d+$/.test(version)
}

export function getReactNativeProjectAppVersion(command: VersionSearchParams, projectName?: string): Promise<string> {
  if (command.platform === 'ios') {
    return getIosAppVersion(command, projectName)
  }
  if (command.platform === 'android') {
    return getAndroidAppVersion(command)
  }

  throw new Error(`Unsupported platform: ${command.platform}`)
}

function getAndroidAppVersion(command: VersionSearchParams) {
  let buildGradlePath: string = path.join('android', 'app')
  if (command.gradleFile) {
    buildGradlePath = command.gradleFile
  }
  if (fs.lstatSync(buildGradlePath).isDirectory()) {
    buildGradlePath = path.join(buildGradlePath, 'build.gradle')
  }

  if (fileDoesNotExistOrIsDirectory(buildGradlePath)) {
    throw new Error(`Unable to find gradle file "${buildGradlePath}".`)
  }

  const g2js = require('gradle-to-js/lib/parser')
  return g2js
    .parseFile(buildGradlePath)
    .catch(() => {
      throw new Error(`Unable to parse the "${buildGradlePath}" file. Please ensure it is a well-formed Gradle file.`)
    })
    .then((buildGradle: any) => {
      let versionName: string | null = null

      // First 'if' statement was implemented as workaround for case
      // when 'build.gradle' file contains several 'android' nodes.
      // In this case 'buildGradle.android' prop represents array instead of object
      // due to parsing issue in 'g2js.parseFile' method.
      if (buildGradle.android instanceof Array) {
        for (let i = 0; i < buildGradle.android.length; i++) {
          const gradlePart = buildGradle.android[i]
          if (gradlePart.defaultConfig && gradlePart.defaultConfig.versionName) {
            versionName = gradlePart.defaultConfig.versionName
            break
          }
        }
      } else if (
        buildGradle.android &&
        buildGradle.android.defaultConfig &&
        buildGradle.android.defaultConfig.versionName
      ) {
        versionName = buildGradle.android.defaultConfig.versionName
      } else {
        throw new Error(
          `The "${buildGradlePath}" file doesn't specify a value for the "android.defaultConfig.versionName" property.`
        )
      }

      if (typeof versionName !== 'string') {
        throw new Error(
          `The "android.defaultConfig.versionName" property value in "${buildGradlePath}" is not a valid string. If this is expected, consider using the --targetBinaryVersion option to specify the value manually.`
        )
      }

      let appVersion: string = versionName.replace(/"/g, '').trim()

      if (isValidVersion(appVersion)) {
        // The versionName property is a valid semver string,
        // so we can safely use that and move on.
        console.log(`Using the target binary version value "${appVersion}" from "${buildGradlePath}".\n`)
        return appVersion
      } else if (/^\d.*/.test(appVersion)) {
        // The versionName property isn't a valid semver string,
        // but it starts with a number, and therefore, it can't
        // be a valid Gradle property reference.
        throw new Error(
          `The "android.defaultConfig.versionName" property in the "${buildGradlePath}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`
        )
      }

      // The version property isn't a valid semver string
      // so we assume it is a reference to a property variable.
      const propertyName = appVersion.replace('project.', '')
      const propertiesFileName = 'gradle.properties'

      const knownLocations = [path.join('android', 'app', propertiesFileName), path.join('android', propertiesFileName)]

      // Search for gradle properties across all `gradle.properties` files
      let propertiesFile: string | undefined
      for (let i = 0; i < knownLocations.length; i++) {
        propertiesFile = knownLocations[i]
        if (fileExists(propertiesFile)) {
          const propertiesContent: string = fs.readFileSync(propertiesFile).toString()
          try {
            const properties = require('properties')
            const parsedProperties: any = properties.parse(propertiesContent)
            appVersion = parsedProperties[propertyName]
            if (appVersion) {
              break
            }
          } catch (e) {
            throw new Error(`Unable to parse "${propertiesFile}". Please ensure it is a well-formed properties file.`)
          }
        }
      }

      if (!appVersion) {
        throw new Error(`No property named "${propertyName}" exists in the "${propertiesFile}" file.`)
      }

      if (!isValidVersion(appVersion)) {
        throw new Error(
          `The "${propertyName}" property in the "${propertiesFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`
        )
      }

      console.log(
        `Using the target binary version value "${appVersion}" from the "${propertyName}" key in the "${propertiesFile}" file.\n`
      )
      return appVersion.toString()
    })
}

function getIosAppVersion(command: VersionSearchParams, projectName?: string) {
  const projectPackageJson: any = require(path.join(process.cwd(), 'package.json'))
  if (!projectName && projectPackageJson) {
    projectName = projectPackageJson.name
  }
  let resolvedPlistFile = command.plistFile
  if (resolvedPlistFile) {
    // If a plist file path is explicitly provided, then we don't
    // need to attempt to "resolve" it within the well-known locations.
    if (!fileExists(resolvedPlistFile)) {
      throw new Error("The specified plist file doesn't exist. Please check that the provided path is correct.")
    }
  } else {
    // Allow the plist prefix to be specified with or without a trailing
    // separator character, but prescribe the use of a hyphen when omitted,
    // since this is the most commonly used convetion for plist files.
    if (command.plistFilePrefix && /.+[^-.]$/.test(command.plistFilePrefix)) {
      command.plistFilePrefix += '-'
    }

    const iOSDirectory: string = 'ios'
    const plistFileName = `${command.plistFilePrefix || ''}Info.plist`

    const knownLocations = [path.join(iOSDirectory, plistFileName)]
    if (projectName) {
      knownLocations.push(path.join(iOSDirectory, projectName, plistFileName))
    }

    resolvedPlistFile = (<any>knownLocations).find(fileExists)

    if (!resolvedPlistFile) {
      throw new Error(
        `Unable to find either of the following plist files in order to infer your app's binary version: "${knownLocations.join(
          '", "'
        )}". If your plist has a different name, or is located in a different directory, consider using either the "--plistFile" or "--plistFilePrefix" parameters to help inform the CLI how to find it.`
      )
    }
  }

  const plistContents = fs.readFileSync(resolvedPlistFile).toString()

  let parsedPlist

  try {
    const plist = require('plist')
    parsedPlist = plist.parse(plistContents)
  } catch (e) {
    throw new Error(`Unable to parse "${resolvedPlistFile}". Please ensure it is a well-formed plist file.`)
  }

  if (parsedPlist && parsedPlist.CFBundleShortVersionString) {
    if (isValidVersion(parsedPlist.CFBundleShortVersionString)) {
      console.log(
        `Using the target binary version value "${parsedPlist.CFBundleShortVersionString}" from "${resolvedPlistFile}".\n`
      )
      return parsedPlist.CFBundleShortVersionString
    } else {
      if (parsedPlist.CFBundleShortVersionString !== '$(MARKETING_VERSION)') {
        throw new Error(
          `The "CFBundleShortVersionString" key in the "${resolvedPlistFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`
        )
      }

      return getAppVersionFromXcodeProject(command, projectName)
    }
  } else {
    throw new Error(`The "CFBundleShortVersionString" key doesn't exist within the "${resolvedPlistFile}" file.`)
  }
}

function getAppVersionFromXcodeProject(command: VersionSearchParams, projectName?: string): Promise<string> {
  const pbxprojFileName = 'project.pbxproj'
  let resolvedPbxprojFile = command.xcodeProjectFile
  if (resolvedPbxprojFile) {
    // If the xcode project file path is explicitly provided, then we don't
    // need to attempt to "resolve" it within the well-known locations.
    if (!resolvedPbxprojFile.endsWith(pbxprojFileName)) {
      // Specify path to pbxproj file if the provided file path is an Xcode project file.
      resolvedPbxprojFile = path.join(resolvedPbxprojFile, pbxprojFileName)
    }
    if (!fileExists(resolvedPbxprojFile)) {
      throw new Error("The specified pbx project file doesn't exist. Please check that the provided path is correct.")
    }
  } else {
    const iOSDirectory = 'ios'
    const pbxprojKnownLocations = [path.join(iOSDirectory, pbxprojFileName)]
    if (projectName) {
      pbxprojKnownLocations.push(path.join(iOSDirectory, `${projectName}.xcodeproj`, pbxprojFileName))
    }
    resolvedPbxprojFile = pbxprojKnownLocations.find(fileExists)

    if (!resolvedPbxprojFile) {
      throw new Error(
        `Unable to find either of the following pbxproj files in order to infer your app's binary version: "${pbxprojKnownLocations.join(
          '", "'
        )}".`
      )
    }
  }

  const xcode = require('xcode')
  const xcodeProj = xcode.project(resolvedPbxprojFile).parseSync()
  const marketingVersion = xcodeProj.getBuildProperty(
    'MARKETING_VERSION',
    command.buildConfigurationName,
    command.xcodeTargetName
  )
  if (!isValidVersion(marketingVersion)) {
    throw new Error(
      `The "MARKETING_VERSION" key in the "${resolvedPbxprojFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`
    )
  }
  console.log(`Using the target binary version value "${marketingVersion}" from "${resolvedPbxprojFile}".\n`)

  return marketingVersion
}

function isDirectory(file: string): boolean {
  return fs.statSync(file).isDirectory()
}

function fileDoesNotExistOrIsDirectory(file: string): boolean {
  try {
    return isDirectory(file)
  } catch (error) {
    return true
  }
}

function fileExists(file: string | undefined): file is string {
  if (!file) {
    return false
  }
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    return false
  }
}
