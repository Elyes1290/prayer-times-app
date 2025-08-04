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

# CONSERVATION DES FICHIERS AUDIO RAW - CRITIQUE!
-keepclassmembers class **.R$raw {
    public static <fields>;
}
-keep class **.R$raw { *; }

# PROTECTION ABSOLUE DES RESSOURCES RAW CONTRE LE SHRINKING
-keep class **.R { *; }
-keep class **.R$* { *; }

# Empêcher la suppression de toutes les ressources raw
-keepclassmembers class **.R$raw {
    public static final int *;
}

# Règles spécifiques pour les fichiers audio Adhan
-keep class com.drogbinho.prayertimesapp2.R$raw { *; }
-keepclassmembers class com.drogbinho.prayertimesapp2.R$raw {
    public static final int mustafaozcan;
    public static final int adhamalsharqawe;
    public static final int adhanaljazaer;
    public static final int ahmadnafees;
    public static final int ahmedelkourdi;
    public static final int dubai;
    public static final int karljenkins;
    public static final int mansourzahrani;
    public static final int misharyrachid;
    public static final int masjidquba;
    public static final int islamsobhi;
    public static final int duaafteradhan;
}

# Optimizations
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification

# =====================================================
# RÈGLES STRIPE - CRITIQUE POUR LE BUILD RELEASE
# =====================================================

# Stripe SDK - Classes principales
-keep class com.stripe.android.** { *; }
-keep class com.stripe.android.core.** { *; }
-keep class com.stripe.android.model.** { *; }
-keep class com.stripe.android.view.** { *; }

# Stripe React Native SDK
-keep class com.reactnativestripesdk.** { *; }
-keep class com.reactnativestripesdk.pushprovisioning.** { *; }

# Classes Stripe manquantes spécifiquement
-keep class com.stripe.android.pushProvisioning.** { *; }
-keep class com.stripe.android.pushProvisioning.PushProvisioningActivity { *; }
-keep class com.stripe.android.pushProvisioning.PushProvisioningActivityStarter { *; }
-keep class com.stripe.android.pushProvisioning.PushProvisioningEphemeralKeyProvider { *; }

# Stripe Payment Methods
-keep class com.stripe.android.model.PaymentMethod { *; }
-keep class com.stripe.android.model.PaymentIntent { *; }
-keep class com.stripe.android.model.SetupIntent { *; }

# Stripe Customer et Subscription
-keep class com.stripe.android.model.Customer { *; }
-keep class com.stripe.android.model.Subscription { *; }

# Stripe Configuration
-keep class com.stripe.android.Stripe { *; }
-keep class com.stripe.android.PaymentConfiguration { *; }

# Empêcher l'obfuscation des classes Stripe
-dontwarn com.stripe.android.**
-dontwarn com.reactnativestripesdk.**