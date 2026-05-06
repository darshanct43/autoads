/**
 * AutoAd Pro: Remote Screen Monitoring & Snapshot System
 * 
 * SETUP:
 * 1. Requires MediaProjection permission (requested at runtime).
 * 2. Background service captures screen using ImageReader.
 * 3. Compresses and uploads to Firebase Storage & Firestore.
 */

package com.autoadads.player

import android.app.*
import android.content.*
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.*
import android.util.DisplayMetrics
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import java.io.ByteArrayOutputStream

class ScreenMonitorService : Service() {
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private lateinit var imageReader: ImageReader
    private val handler = Handler(Looper.getMainLooper())
    private val captureInterval = 30000L // 30 seconds

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val resultCode = intent?.getIntExtra("RESULT_CODE", Activity.RESULT_CANCELED) ?: Activity.RESULT_CANCELED
        val data = intent?.getParcelableExtra<Intent>("DATA")

        if (data != null) {
            val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjection = projectionManager.getMediaProjection(resultCode, data)
            startCaptureCycle()
        }

        startForeground(101, createNotification())
        return START_STICKY
    }

    private fun startCaptureCycle() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                captureAndUpload()
                handler.postDelayed(this, captureInterval)
            }
        }, 5000)
    }

    private fun captureAndUpload() {
        val metrics = resources.displayMetrics
        imageReader = ImageReader.newInstance(metrics.widthPixels, metrics.heightPixels, PixelFormat.RGBA_8888, 2)
        
        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "ScreenCapture",
            metrics.widthPixels, metrics.heightPixels, metrics.densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.surface, null, null
        )

        imageReader.setOnImageAvailableListener({ reader ->
            val image = reader.acquireLatestImage()
            if (image != null) {
                val planes = image.planes
                val buffer = planes[0].buffer
                val pixelStride = planes[0].pixelStride
                val rowStride = planes[0].rowStride
                val rowPadding = rowStride - pixelStride * metrics.widthPixels
                
                val bitmap = Bitmap.createBitmap(
                    metrics.widthPixels + rowPadding / pixelStride,
                    metrics.heightPixels, Bitmap.Config.ARGB_8888
                )
                bitmap.copyPixelsFromBuffer(buffer)
                image.close()
                virtualDisplay?.release()
                
                uploadSnapshot(bitmap)
            }
        }, handler)
    }

    private fun uploadSnapshot(bitmap: Bitmap) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val storageRef = FirebaseStorage.getInstance().reference.child("deviceScreens/$uid/latest.jpg")
        
        val baos = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 50, baos)
        val data = baos.toByteArray()

        storageRef.putBytes(data).addOnSuccessListener {
            storageRef.downloadUrl.addOnSuccessListener { uri ->
                updateFirestoreRecord(uri.toString())
            }
        }
    }

    private fun updateFirestoreRecord(url: String) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val db = FirebaseFirestore.getInstance()
        
        val record = hashMapOf(
            "driverId" to uid,
            "imageUrl" to url,
            "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
            "status" to "playing" // Logic to check if media is actually playing
        )
        
        db.collection("deviceScreens").document(uid).set(record)
    }

    private fun createNotification(): Notification {
        val channelId = "MonitorChannel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Compliance Guard", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        return Notification.Builder(this, channelId)
            .setContentTitle("Ad Compliance Active")
            .setContentText("Remote verification enabled")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .build()
    }

    override fun onBind(intent: Intent?) = null
}
