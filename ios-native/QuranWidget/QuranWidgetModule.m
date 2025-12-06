#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(QuranWidgetModule, NSObject)

// Widget Audio Update
RCT_EXTERN_METHOD(updateWidgetAudio:(NSString *)surah
                  reciter:(NSString *)reciter
                  audioPath:(NSString *)audioPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Widget Playback State
RCT_EXTERN_METHOD(updateWidgetPlaybackState:(BOOL)isPlaying
                  position:(NSInteger)position
                  duration:(NSInteger)duration
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Widget Premium Status
RCT_EXTERN_METHOD(updateWidgetPremiumStatus:(BOOL)isPremium
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(forcePremiumStatus:(BOOL)isPremium
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPremiumStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(syncPremiumStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Widget Availability
RCT_EXTERN_METHOD(isWidgetAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Diagnostic
RCT_EXTERN_METHOD(runDiagnostic:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Audio Service Integration (Stubs)
RCT_EXTERN_METHOD(startAudioService)

RCT_EXTERN_METHOD(loadAudioInService:(NSString *)audioPath
                  surah:(NSString *)surah
                  reciter:(NSString *)reciter
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
