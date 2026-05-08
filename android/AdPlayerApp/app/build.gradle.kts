plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "in.autoads.driver"
    compileSdk = 34

    defaultConfig {
        applicationId = "in.autoads.driver"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    dependencies {

    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.22")

    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    
implementation("com.google.firebase:firebase-storage-ktx")
implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")

    implementation("com.google.android.gms:play-services-location:21.0.1")
apply(plugin = "com.google.gms.google-services")
}

    // Tracking & Map
    implementation("org.maplibre.gl:android-sdk:10.2.0")
    implementation("com.google.android.gms:play-services-location:21.0.1")
}
