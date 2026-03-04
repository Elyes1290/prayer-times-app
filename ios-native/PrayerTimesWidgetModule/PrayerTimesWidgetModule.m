#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PrayerTimesWidgetModule, NSObject)

RCT_EXTERN_METHOD(
  updatePrayerTimes:(NSString *)fajr
  sunrise:(NSString *)sunrise
  dhuhr:(NSString *)dhuhr
  asr:(NSString *)asr
  maghrib:(NSString *)maghrib
  isha:(NSString *)isha
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getPrayerTimes:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  isWidgetAvailable:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  forceWidgetRefresh:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
