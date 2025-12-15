#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AdhanAudioPlayer, RCTEventEmitter)

// Play Adhan (avec URI au lieu de soundName)
RCT_EXTERN_METHOD(playAdhanWithURI:(NSString *)uri
                  prayer:(NSString *)prayer
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Stop Adhan
RCT_EXTERN_METHOD(stopAdhan)

// Get Status
RCT_EXTERN_METHOD(getStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

