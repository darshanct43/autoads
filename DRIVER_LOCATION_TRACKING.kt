/**
 * AUTO AD PRO - DRIVER LIVE LOCATION TRACKING (KOTLIN)
 * Implementation for real-time background GPS tracking with Firestore.
 */

package com.autoads.tracking

import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions

/**
 * 1. LOCATION SERVICE (Foreground Service)
 * Handles background tracking and Firestore syncing.
 */
class DriverLocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    
    private val NOTIFICATION_ID = 1234
    private val CHANNEL_ID = "driver_location_channel"

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        createNotificationChannel()
        setupLocationCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("DriverLocation", "Service Started")
        startForeground(NOTIFICATION_ID, createNotification())
        startLocationUpdates()
        return START_STICKY
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    Log.d("DriverLocation", "Location Updated: ${location.latitude}, ${location.longitude}")
                    sendLocationToFirestore(location)
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.create().apply {
            interval = 10000 // 10 seconds
            fastestInterval = 5000 // 5 seconds
            priority = LocationRequest.PRIORITY_HIGH_ACCURACY
            smallestDisplacement = 10f // 10 meters optimization as requested
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
        
        // Update status to online
        updateOnlineStatus(true)
    }

    private fun sendLocationToFirestore(location: Location) {
        val uid = auth.currentUser?.uid ?: return
        
        val data = hashMapOf(
            "driverId" to uid,
            "lat" to location.latitude,
            "lng" to location.longitude,
            "speed" to (location.speed * 3.6), // Convert to km/h
            "heading" to location.bearing,
            "isOnline" to true,
            "updatedAt" to FieldValue.serverTimestamp()
        )

        // Using set() to overwrite the same document (One document per driver)
        db.collection("driverLocations")
            .document(uid)
            .set(data)
            .addOnFailureListener { e ->
                Log.e("DriverLocation", "Firestore Update Failed: ${e.message}")
            }
    }

    private fun updateOnlineStatus(online: Boolean) {
        val uid = auth.currentUser?.uid ?: return
        db.collection("driverLocations").document(uid)
            .update("isOnline", online, "updatedAt", FieldValue.serverTimestamp())
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        updateOnlineStatus(false)
        Log.d("DriverLocation", "Service Stopped")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * NOTIFICATION SUPPORT
     */
    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AutoAd Tracking Active")
            .setContentText("Your location is being shared with the platform.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Driver Location Updates",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}

/**
 * 2. HELPER TO START/STOP FROM UI
 */
object LocationTrackerHelper {
    
    fun startTracking(context: Context) {
        val intent = Intent(context, DriverLocationService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    fun stopTracking(context: Context) {
        val intent = Intent(context, DriverLocationService::class.java)
        context.stopService(intent)
    }
}
