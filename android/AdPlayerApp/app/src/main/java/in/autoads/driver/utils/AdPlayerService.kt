package in.autoads.driver.services

import android.app.Service
import android.content.Intent
import android.os.IBinder
import in.autoads.driver.MainActivity

class AdPlayerService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Ensure the activity is running or restart it
        val activityIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(activityIntent)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
