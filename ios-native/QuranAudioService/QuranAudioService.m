#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(QuranAudioServiceModule, RCTEventEmitter)

// Service Lifecycle
RCT_EXTERN_METHOD(startAudioService:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopAudioService:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Audio Loading
RCT_EXTERN_METHOD(loadAudioInService:(NSString *)audioPath
                  surah:(NSString *)surah
                  reciter:(NSString *)reciter
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(loadSurahByNumber:(NSInteger)surahNumber
                  autoPlay:(BOOL)autoPlay
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Playback Control
RCT_EXTERN_METHOD(playAudio:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(pauseAudio:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopAudio:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(seekToPosition:(NSInteger)position
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Premium & Auth
RCT_EXTERN_METHOD(updatePremiumStatus:(BOOL)isPremiumUser
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(syncAuthToken:(NSString *)token)

// State Management
RCT_EXTERN_METHOD(getCurrentState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Navigation
RCT_EXTERN_METHOD(navigateToNextSurah:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(navigateToPreviousSurah:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Auto Advance & Loop
RCT_EXTERN_METHOD(setAutoAdvanceEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setLoopEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAutoAdvanceEnabled:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(isLoopEnabled:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Downloaded Surahs
RCT_EXTERN_METHOD(getDownloadedSurahs:(NSString *)reciter
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isSurahDownloaded:(NSString *)reciter
                  surahNumber:(NSInteger)surahNumber
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Widget Sync
RCT_EXTERN_METHOD(getCurrentWidgetSurah:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(syncWithWidgetSurah:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
