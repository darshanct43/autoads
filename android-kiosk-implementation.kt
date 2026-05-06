/**
 * AutoAd Pro: Android Kiosk & Lockdown System (Full Implementation)
 * 
 * SETUP INSTRUCTIONS:
 * 1. AndroidManifest.xml: 
 *    - Add RECEIVE_BOOT_COMPLETED permission.
 *    - Declare AdminReceiver as <receiver> with BIND_DEVICE_ADMIN.
 *    - Declare BootReceiver as <receiver> with BOOT_COMPLETED.
 *    - Set Activity screenOrientation="landscape".
 * 2. Device Owner Activation (via ADB):
 *    adb shell dpm set-device-owner com.autoads.player/.AdminReceiver
 */

package com.autoads.player

import android.app.*
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.*
import android.os.*
import android.view.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationCompat

// --- 1. DEVICE ADMIN RECEIVER ---
class AdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "Kiosk Mode: Device Owner Enabled", Toast.LENGTH_SHORT).show()
    }
}

// --- 2. BOOT COMPLETED RECEIVER ---
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Intent.ACTION_BOOT_COMPLETED == intent.action) {
            val i = Intent(context, KioskActivity::class.java)
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(i)
        }
    }
}

// --- 3. FOREGROUND MONITORING SERVICE ---
class KioskService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val channelId = "KioskServiceChannel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Kiosk Guard", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Ad Player Active")
            .setContentText("Kiosk Protection Running")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .build()

        startForeground(1, notification)
        
        // Monitor app focus and restart if needed
        return START_STICKY
    }

    override fun onBind(intent: Intent?) = null
}

// --- 4. MAIN KIOSK ACTIVITY ---
class KioskActivity : AppCompatActivity() {
    private lateinit var dpm: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private var exitPressStartTime: Long = 0
    private val EXIT_PIN = "1234" // Secret Admin PIN

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_kiosk)

        dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, AdminReceiver::class.java)

        setupLockdown()
        startAdEngine()
        startKioskService()
    }

    private fun setupLockdown() {
        // 1. Force Landscape
        requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE

        // 2. Immersive Fullscreen
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)

        // 3. Lock Task Mode (Device Owner required for true lockdown)
        if (dpm.isDeviceOwnerApp(packageName)) {
            val activePackages = arrayOf(packageName)
            dpm.setLockTaskPackages(adminComponent, activePackages)
            startLockTask()
        } else {
            // Fallback for non-managed devices
            Toast.makeText(this, "Please enable Device Owner for Full Kiosk", Toast.LENGTH_LONG).show()
            startLockTask() 
        }

        // 4. Stay Awake
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun startAdEngine() {
        // Trigger the playback engine from previous implementation
        // Auto-starts infinite loop of images/videos
    }

    private fun startKioskService() {
        val serviceIntent = Intent(this, KioskService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    // --- 5. FAILSAFE: BLOCK SYSTEM KEYS ---
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Disable Volume buttons
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onBackPressed() {
        // Disable Back Button
    }

    // --- 6. HIDDEN ADMIN EXIT ---
    // Trigger: Long press top-left corner for 5 seconds
    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                if (event.x < 100 && event.y < 100) {
                    exitPressStartTime = System.currentTimeMillis()
                }
            }
            MotionEvent.ACTION_UP -> {
                val duration = System.currentTimeMillis() - exitPressStartTime
                if (duration > 5000 && event.x < 100 && event.y < 100) {
                    showAdminLogin()
                }
            }
        }
        return super.onTouchEvent(event)
    }

    private fun showAdminLogin() {
        val input = android.widget.EditText(this)
        input.inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
        
        AlertDialog.Builder(this)
            .setTitle("Admin Access")
            .setMessage("Enter PIN to exit Kiosk")
            .setView(input)
            .setPositiveButton("Unlock") { _, _ ->
                if (input.text.toString() == EXIT_PIN) {
                    stopLockTask()
                    finish()
                } else {
                    Toast.makeText(this, "X - Access Denied", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
