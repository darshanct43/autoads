package in.autoads.driver.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import in.autoads.driver.LoginActivity

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Intent.ACTION_BOOT_COMPLETED == intent.action) {
            val loginIntent = Intent(context, LoginActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(loginIntent)
        }
    }
}
