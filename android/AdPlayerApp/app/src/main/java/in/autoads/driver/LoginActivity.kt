package in.autoads.driver

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import in.autoads.driver.utils.FirebaseManager

class LoginActivity : AppCompatActivity() {
    private lateinit var firebaseManager: FirebaseManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        firebaseManager = FirebaseManager(this)

        val driverCodeInput = findViewById<EditText>(R.id.driverCodeInput)
        val passwordInput = findViewById<EditText>(R.id.passwordInput)
        val loginButton = findViewById<Button>(R.id.loginButton)

        // Check for existing login
        val prefs = getSharedPreferences("AutoAdsPrefs", Context.MODE_PRIVATE)
        val savedUid = prefs.getString("uid", null)
        if (savedUid != null) {
            startMainActivity()
            return
        }

        loginButton.setOnClickListener {
            val code = driverCodeInput.text.toString()
            val pass = passwordInput.text.toString()
            val currentDeviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)

            firebaseManager.verifyDriver(code, pass) { uid, deviceId ->
                if (uid != null) {
                    if (deviceId == null || deviceId == currentDeviceId) {
                        // Success or first time linking
                        prefs.edit().apply {
                            putString("uid", uid)
                            apply()
                        }
                        startMainActivity()
                    } else {
                        Toast.makeText(this, "Device mismatch. Account locked to another device.", Toast.LENGTH_LONG).show()
                    }
                } else {
                    Toast.makeText(this, "Invalid credentials.", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun startMainActivity() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
