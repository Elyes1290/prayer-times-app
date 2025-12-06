#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AdhanModule, NSObject)

// Location Management
RCT_EXTERN_METHOD(setLocation:(double)lat lon:(double)lon)
RCT_EXTERN_METHOD(getSavedAutoLocation:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Notification Settings
RCT_EXTERN_METHOD(saveNotificationSettings:(NSDictionary *)settings)

// Adhan Sound & Volume
RCT_EXTERN_METHOD(setAdhanSound:(NSString *)adhanSound)
RCT_EXTERN_METHOD(setAdhanVolume:(float)volume)
RCT_EXTERN_METHOD(getAdhanVolume:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Prayer Times Calculation
RCT_EXTERN_METHOD(calculatePrayerTimes:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Adhan Scheduling
RCT_EXTERN_METHOD(scheduleAdhanAlarms:(NSDictionary *)prayerTimes adhanSound:(NSString *)adhanSound)
RCT_EXTERN_METHOD(schedulePrayerReminders:(NSArray *)reminders)
RCT_EXTERN_METHOD(cancelAllAdhanAlarms)
RCT_EXTERN_METHOD(cancelAllPrayerReminders)
RCT_EXTERN_METHOD(debugNotifications:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Debug
RCT_EXTERN_METHOD(debugLog:(NSString *)message)

// Widget Update (stubs for compatibility)
RCT_EXTERN_METHOD(forceUpdateWidgets)
RCT_EXTERN_METHOD(updateWidget)
RCT_EXTERN_METHOD(startDailyMaintenance)
RCT_EXTERN_METHOD(startWidgetUpdateScheduler)

// Dhikr Notifications (stubs for compatibility)
RCT_EXTERN_METHOD(scheduleDhikrNotifications:(NSArray *)dhikrNotifications)
RCT_EXTERN_METHOD(cancelAllDhikrNotifications)

// Prayer Times Storage
RCT_EXTERN_METHOD(saveTodayPrayerTimes:(NSDictionary *)prayerTimes)
RCT_EXTERN_METHOD(savePrayerTimesForTomorrow:(NSDictionary *)prayerTimes)

@end
