/**
 * AutoAd Pro: Real-Time GPS Tracking System (Android Implementation)
 * 
 * FEATURES:
 * 1. Background Foreground Service (Location)
 * 2. High-Accuracy GPS (FusedLocationProvider)
 * 3. Dual-Store Strategy (Latest + History Logs)
 * 4. Offline Persistence (Firestore Offline Persistence)
 */

package com.autoads.player

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.location.Location
import android.os.*
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue

// --- 1. TRACKING SERVICE ---
class LocationTrackingService : Service() {
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val db = FirebaseFirestore.getInstance()
    private var activeCampaignId: String? = "idle"

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        setupLocationCallback()
        startForeground(99, createNotification())
        requestLocationUpdates()
        
        // Listen for active campaign changes
        observeActiveCampaign()
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                val location = locationResult.lastLocation ?: return
                syncLocationToFirebase(location)
            }
        }
    }

    private fun syncLocationToFirebase(loc: Location) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        
        val data = hashMapOf(
            "driverId" to uid,
            "lat" to loc.latitude,
            "lng" to loc.longitude,
            "speed" to loc.speed * 3.6, // Convert to km/h
            "activeCampaignId" to activeCampaignId,
            "timestamp" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )

        // 1. Update Latest Position (For Admin Map)
        db.collection("driverLocations").document(uid).set(data)

        // 2. Log Entry (For Movement History/Analytics)
        db.collection("locationLogs").add(data)
    }

    private fun requestLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
            .setMinUpdateDistanceMeters(15f)
            .build()

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        }
    }

    private fun observeActiveCampaign() {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        db.collection("drivers").document(uid).addSnapshotListener { snap, _ ->
            activeCampaignId = snap?.getString("currentCampaignId") ?: "idle"
        }
    }

    private fun createNotification(): Notification {
        val channelId = "TrackingChannel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "GPS Tracking", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Real-Time Tracking Active")
            .setContentText("Monitoring ad visibility & movement")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

// --- 2. PERMISSION HANDLER & BOOT TRIGGER ---
class TrackingBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val serviceIntent = Intent(context, LocationTrackingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
