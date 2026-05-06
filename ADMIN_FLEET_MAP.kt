/**
 * AUTO AD PRO - FLEET TRACKING MAP (KOTLIN + OSMDROID)
 * Real-time fleet visualization using OpenStreetMap.
 */

package com.autoads.admin

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.infowindow.BasicInfoWindow

/**
 * 1. DATA MODEL
 */
data class DriverLocation(
    val driverId: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val isOnline: Boolean = false,
    val speed: Double = 0.0,
    val heading: Float = 0f
)

/**
 * 2. ADMIN MAP ACTIVITY
 */
class AdminFleetMapActivity : AppCompatActivity() {

    private lateinit var map: MapView
    private val db = FirebaseFirestore.getInstance()
    private var fleetListener: ListenerRegistration? = null
    
    // Performance Cache: Map<DriverUID, MarkerObject>
    private val driverMarkers = mutableMapOf<String, Marker>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // OSMDroid configuration
        Configuration.getInstance().load(this, getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        
        // Mocking layout setup
        setContentView(View(this)) // In real app: setContentView(R.layout.activity_admin_map)
        
        initMap()
        listenToDriverLocations()
    }

    /**
     * INITIALIZE MAP
     */
    private fun initMap() {
        map = MapView(this) // In real app: findViewById(R.id.map)
        map.setTileSource(TileSourceFactory.MAPNIK)
        map.setMultiTouchControls(true)
        
        val mapController = map.controller
        mapController.setZoom(12.0)
        val startPoint = GeoPoint(13.01, 76.09) // Default center
        mapController.setCenter(startPoint)
    }

    /**
     * REAL-TIME FLEET LISTENER
     */
    private fun listenToDriverLocations() {
        fleetListener = db.collection("driverLocations")
            .addSnapshotListener { snapshot, e ->
                if (e != null) {
                    Log.e("FleetMap", "Listen failed", e)
                    showFallbackListView()
                    return@addSnapshotListener
                }

                snapshot?.documentChanges?.forEach { change ->
                    val loc = change.document.toObject(DriverLocation::class.java)
                    val driverId = change.document.id

                    when (change.type) {
                        com.google.firebase.firestore.DocumentChange.Type.ADDED,
                        com.google.firebase.firestore.DocumentChange.Type.MODIFIED -> {
                            updateMarker(driverId, loc)
                        }
                        com.google.firebase.firestore.DocumentChange.Type.REMOVED -> {
                            removeMarker(driverId)
                        }
                    }
                }
                map.invalidate() // Refresh map graphics
            }
    }

    /**
     * SMART MARKER UPDATE (No Re-creation)
     */
    private fun updateMarker(driverId: String, data: DriverLocation) {
        val entry = driverMarkers[driverId]
        val marker = if (entry == null) {
            // New Driver → Create Marker
            val newMarker = Marker(map)
            newMarker.id = driverId
            newMarker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            newMarker.infoWindow = BasicInfoWindow(org.osmdroid.library.R.layout.bonuspack_bubble, map)
            map.overlays.add(newMarker)
            driverMarkers[driverId] = newMarker
            newMarker
        } else {
            entry
        }

        // Update Position
        marker.position = GeoPoint(data.lat, data.lng)
        marker.rotation = 360f - data.heading // Correcting for map orientation
        
        // Update Visuals based on Status
        marker.title = "Driver: ${driverId.takeLast(4)}"
        marker.snippet = "Speed: ${data.speed.toInt()} km/h | Status: ${if(data.isOnline) "Live" else "Idle"}"
        
        // Color Logic (Simplified for code example)
        // In real app: marker.icon = getStatusIcon(data.isOnline)
        
        marker.closeInfoWindow() // Close if open to avoid stale data
    }

    private fun removeMarker(driverId: String) {
        driverMarkers[driverId]?.let {
            map.overlays.remove(it)
            driverMarkers.remove(driverId)
        }
    }

    private fun showFallbackListView() {
        Log.d("FleetMap", "Switching to List View Fallback")
        // Logic to hide map and show a RecyclerView
    }

    override fun onResume() {
        super.onResume()
        map.onResume()
    }

    override fun onPause() {
        super.onPause()
        map.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        fleetListener?.remove()
    }
}
