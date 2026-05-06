package in.autoads.driver

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.VideoView
import androidx.appcompat.app.AppCompatActivity
import in.autoads.driver.utils.FirebaseManager
import java.io.File
import java.util.*

class MainActivity : AppCompatActivity() {
    private lateinit var videoView: VideoView
    private lateinit var firebaseManager: FirebaseManager
    private var playlist = mutableListOf<File>()
    private var currentIndex = 0
    private lateinit var uid: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN 
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION 
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)

        videoView = findViewById(R.id.adVideoView)
        firebaseManager = FirebaseManager(this)

        val prefs = getSharedPreferences("AutoAdsPrefs", Context.MODE_PRIVATE)
        uid = prefs.getString("uid", "") ?: ""

        if (uid.isEmpty()) {
            finish()
            return
        }

        videoView.setOnCompletionListener {
            playNext()
        }

        refreshCampaigns()
        
        // Polling for updates every 5 minutes
        Timer().scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                runOnUiThread { refreshCampaigns() }
            }
        }, 300000, 300000)
    }

    private fun refreshCampaigns() {
        firebaseManager.fetchCampaigns(uid) { campaigns ->
            for (campaign in campaigns) {
                val url = campaign["videoUrl"] as? String ?: campaign["imageUrl"] as? String
                if (url != null) {
                    val fileName = url.substringAfterLast("/")
                    firebaseManager.downloadMedia(url, fileName) { file ->
                        if (file != null && !playlist.contains(file)) {
                            playlist.add(file)
                            if (!videoView.isPlaying) {
                                playNext()
                            }
                        }
                    }
                }
            }
        }
    }

    private fun playNext() {
        if (playlist.isEmpty()) return
        
        if (currentIndex >= playlist.size) {
            currentIndex = 0
        }

        val file = playlist[currentIndex]
        videoView.setVideoPath(file.absolutePath)
        videoView.start()
        currentIndex++
    }
}
