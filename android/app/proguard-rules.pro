# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Prayer Times App - Keep our custom classes
-keep class com.drogbinho.prayertimesapp2.** { *; }

# Notifications and Services
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver
-keep class * extends android.app.IntentService

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keep class expo.modules.** { *; }
-keepclassmembers class * {
    @expo.modules.core.interfaces.Method *;
}

# AdhanModule (notre module natif)
-keep class com.drogbinho.prayertimesapp2.AdhanModule { *; }
-keep class com.drogbinho.prayertimesapp2.AdhanModule$* { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Location services
-keep class com.google.android.gms.location.** { *; }

# Optimizations
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
