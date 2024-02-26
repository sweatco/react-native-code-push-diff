import React

@objc(CodePushDiff)
class CodePushDiff: NSObject {
  @objc var bundleManager: RCTBundleManager!

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func constantsToExport() -> [String: Any]! {
    let bundlePath = Bundle.main.bundlePath

    return [
      "mainBundlePath": bundlePath,
    ]
  }
}
