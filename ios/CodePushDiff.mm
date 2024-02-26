#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CodePushDiff, NSObject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
