package in.autoads.driver.utils

import android.content.Context
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import java.io.File

class FirebaseManager(private val context: Context) {
    private val db = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()

    fun verifyDriver(driverCode: String, password: String, onResult: (String?, String?) -> Unit) {
        db.collection("drivers")
            .whereEqualTo("driverCode", driverCode)
            .whereEqualTo("password", password)
            .get()
            .addOnSuccessListener { documents ->
                if (!documents.isEmpty) {
                    val doc = documents.first()
                    onResult(doc.id, doc.getString("deviceId"))
                } else {
                    onResult(null, null)
                }
            }
            .addOnFailureListener {
                onResult(null, null)
            }
    }

    fun fetchCampaigns(driverId: String, onResult: (List<Map<String, Any>>) -> Unit) {
        db.collection("campaignAssignments")
            .whereEqualTo("driverId", driverId)
            .whereEqualTo("status", "approved")
            .get()
            .addOnSuccessListener { documents ->
                val campaigns = mutableListOf<Map<String, Any>>()
                for (doc in documents) {
                    campaigns.add(doc.data)
                }
                onResult(campaigns)
            }
    }

    fun downloadMedia(url: String, fileName: String, onComplete: (File?) -> Unit) {
        val storageRef = storage.getReferenceFromUrl(url)
        val localFile = File(context.filesDir, "media/$fileName")
        
        if (localFile.exists()) {
            onComplete(localFile)
            return
        }

        localFile.parentFile?.mkdirs()
        storageRef.getFile(localFile)
            .addOnSuccessListener {
                onComplete(localFile)
            }
            .addOnFailureListener {
                onComplete(null)
            }
    }
}
