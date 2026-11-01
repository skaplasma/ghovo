# Prevent R8 / ProGuard from stripping WorkManager database implementation used by Google Mobile Ads
-keep class androidx.work.impl.WorkDatabase { *; }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.work.impl.**
-keep class com.google.android.gms.ads.** { *; }
