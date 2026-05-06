package in.autoads.driver

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.os.Looper
import android.util.Log
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.*
import org.json.JSONArray
import org.json.JSONObject
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.OnMapReadyCallback
import org.maplibre.android.maps.Style
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.annotations.Marker
import java.io.File
import java.io.FileOutputStream

/**
 * LiveTrackingActivity provides a full-screen OpenStreetMap view using MapLibre.
 * It tracks device GPS location in real-time and logs data locally.
 */
class LiveTrackingActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var mapView: MapView
    private var mapLibreMap: MapLibreMap? = null
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var currentLocationMarker: Marker? = null
    
    private lateinit var tvCoords: TextView
    private lateinit var tvSpeed: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize MapLibre before layout inflation
        MapLibre.getInstance(this)
        
        setContentView(R.layout.activity_live_tracking)
        
        mapView = findViewById(R.id.mapView)
        tvCoords = findViewById(R.id.tvCoords)
        tvSpeed = findViewById(R.id.tvSpeed)
        
        mapView.onCreate(savedInstanceState)
        mapView.getMapAsync(this)
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        checkPermissions()
    }

    override fun onMapReady(map: MapLibreMap) {
        mapLibreMap = map
        
        // Load OpenStreetMap tiles style
        map.setStyle(Style.getPredefinedStyle("Streets")) { style ->
            Log.i("LiveTracking", "Maplibre Style Loaded Successfully")
            
            // Move to last known location quickly on start
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    location?.let {
                        val latLng = LatLng(it.latitude, it.longitude)
                        map.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, 14.0))
                        updateTrackingState(it)
                    }
                }
            }
            
            startLocationUpdates()
        }
        
        // Minimal UI for kiosk feel but ensuring gestures are active
        map.uiSettings.isAttributionEnabled = false
        map.uiSettings.isLogoEnabled = false
        map.uiSettings.isCompassEnabled = true
        map.uiSettings.isZoomGesturesEnabled = true
        map.uiSettings.isScrollGesturesEnabled = true
        map.uiSettings.isRotateGesturesEnabled = true
        map.uiSettings.isTiltGesturesEnabled = true
    }

    private fun checkPermissions() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION, 
                Manifest.permission.ACCESS_COARSE_LOCATION
            ), 1001)
        }
    }

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(locationResult: LocationResult) {
            for (location in locationResult.locations) {
                updateTrackingState(location)
                logLocationLocally(location)
            }
        }
    }

    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000)
            .setMinUpdateIntervalMillis(2000)
            .build()

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        }
    }

    private fun updateTrackingState(location: Location) {
        val latLng = LatLng(location.latitude, location.longitude)
        
        // Update Stats UI
        tvCoords.text = String.format("Lat: %.5f, Lng: %.5f", location.latitude, location.longitude)
        tvSpeed.text = String.format("Speed: %.1f km/h", location.speed * 3.6) // m/s to km/h

        mapLibreMap?.let { map ->
            if (currentLocationMarker == null) {
                // Initial placement
                currentLocationMarker = map.addMarker(MarkerOptions()
                    .position(latLng)
                    .title("Vehicle"))
                
                map.animateCamera(CameraUpdateFactory.newCameraPosition(
                    CameraPosition.Builder()
                        .target(latLng)
                        .zoom(15.0)
                        .build()
                ), 1500)
            } else {
                // Move marker (MapLibre marker position update is immediate, camera is animated)
                currentLocationMarker?.position = latLng
                map.animateCamera(CameraUpdateFactory.newLatLng(latLng), 800)
            }
        }
    }

    /**
     * Store movement locally in JSON format as requested.
     * Path: /data/user/0/in.autoads.driver/files/location_logs.json
     */
    private fun logLocationLocally(location: Location) {
        try {
            val logFile = File(filesDir, "location_logs.json")
            val existingData = if (logFile.exists()) logFile.readText() else "[]"
            val jsonArray = JSONArray(existingData)
            
            val entry = JSONObject()
            entry.put("lat", location.latitude)
            entry.put("lng", location.longitude)
            entry.put("time", System.currentTimeMillis() / 1000)
            
            jsonArray.put(entry)
            
            // Limit log size to prevent storage issues (keep last 500 points)
            if (jsonArray.length() > 500) {
                val optimizedArray = JSONArray()
                for (i in jsonArray.length() - 500 until jsonArray.length()) {
                    optimizedArray.put(jsonArray.get(i))
                }
                logFile.writeText(optimizedArray.toString())
            } else {
                logFile.writeText(jsonArray.toString())
            }
            
        } catch (e: Exception) {
            Log.e("LiveTracking", "Logging failed: ${e.message}")
        }
    }

    override fun onStart() { super.onStart(); mapView.onStart() }
    override fun onResume() { super.onResume(); mapView.onResume() }
    override fun onPause() { super.onPause(); mapView.onPause() }
    override fun onStop() { super.onStop(); mapView.onStop() }
    override fun onLowMemory() { super.onLowMemory(); mapView.onLowMemory() }
    
    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        mapView.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        mapView.onSaveInstanceState(outState)
    }
}
