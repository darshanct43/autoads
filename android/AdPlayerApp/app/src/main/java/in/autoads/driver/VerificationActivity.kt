package in.autoads.driver

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.google.firebase.storage.FirebaseStorage
import java.util.*

class VerificationActivity : AppCompatActivity() {

    private lateinit var rcNumberInput: EditText
    private lateinit var dlNumberInput: EditText
    private var rcImageUri: Uri? = null
    private var dlImageUri: Uri? = null

    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()

    private val pickRcImage = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            rcImageUri = result.data?.data
            Toast.makeText(this, "RC Image selected", Toast.LENGTH_SHORT).show()
        }
    }

    private val pickDlImage = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            dlImageUri = result.data?.data
            Toast.makeText(this, "DL Image selected", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_verification)

        rcNumberInput = findViewById(R.id.rcNumberInput)
        dlNumberInput = findViewById(R.id.dlNumberInput)

        findViewById<Button>(R.id.pickRcImageButton).setOnClickListener {
            val intent = Intent(Intent.ACTION_PICK).apply { type = "image/*" }
            pickRcImage.launch(intent)
        }

        findViewById<Button>(R.id.pickDlImageButton).setOnClickListener {
            val intent = Intent(Intent.ACTION_PICK).apply { type = "image/*" }
            pickDlImage.launch(intent)
        }

        findViewById<Button>(R.id.submitButton).setOnClickListener {
            orchestrateFullFlow()
        }

        // Trigger dummy test for verification
        runDummyTest()
    }

    fun runDummyTest() {
        val user = auth.currentUser
        if (user == null) {
            Log.e("TEST_LOG", "UID: null - User not logged in!")
            return
        }
        val uid = user.uid
        Log.d("TEST_LOG", "UID: $uid - Starting Dummy Test")

        val dummyRcNumber = "TEST_RC_123"
        val dummyDlNumber = "TEST_DL_456"
        
        // Use a system drawable as a dummy image
        val dummyUri = Uri.parse("android.resource://$packageName/${android.R.drawable.ic_menu_gallery}")
        
        Log.d("TEST_LOG", "Uploading RC test image...")
        val rcRef = storage.reference.child("drivers/$uid/rc_test.jpg")
        rcRef.putFile(dummyUri)
            .addOnSuccessListener {
                Log.d("TEST_LOG", "RC Upload Success")
                rcRef.downloadUrl.addOnSuccessListener { rcUrl ->
                    Log.d("TEST_LOG", "RC URL: $rcUrl")
                    
                    Log.d("TEST_LOG", "Uploading DL test image...")
                    val dlRef = storage.reference.child("drivers/$uid/dl_test.jpg")
                    dlRef.putFile(dummyUri)
                        .addOnSuccessListener {
                            Log.d("TEST_LOG", "DL Upload Success")
                            Toast.makeText(this, "Upload Success", Toast.LENGTH_SHORT).show()
                            
                            dlRef.downloadUrl.addOnSuccessListener { dlUrl ->
                                Log.d("TEST_LOG", "DL URL: $dlUrl")
                                
                                val data = hashMapOf(
                                    "rcNumber" to dummyRcNumber,
                                    "dlNumber" to dummyDlNumber,
                                    "rcImage" to rcUrl.toString(),
                                    "dlImage" to dlUrl.toString(),
                                    "testMode" to true,
                                    "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                )
                                
                                Log.d("TEST_LOG", "Writing to Firestore...")
                                db.collection("drivers").document(uid)
                                    .set(data, SetOptions.merge())
                                    .addOnSuccessListener {
                                        Log.d("TEST_LOG", "Firestore Success")
                                        Toast.makeText(this, "Firestore Success", Toast.LENGTH_SHORT).show()
                                    }
                                    .addOnFailureListener { e ->
                                        Log.e("TEST_LOG", "Firestore Failed: ${e.message}")
                                        Toast.makeText(this, "Firestore Failed", Toast.LENGTH_SHORT).show()
                                    }
                            }
                        }
                        .addOnFailureListener { e ->
                            Log.e("TEST_LOG", "DL Upload Failed: ${e.message}")
                            Toast.makeText(this, "Upload Failed", Toast.LENGTH_SHORT).show()
                        }
                }
            }
            .addOnFailureListener { e ->
                Log.e("TEST_LOG", "RC Upload Failed: ${e.message}")
                Toast.makeText(this, "Upload Failed", Toast.LENGTH_SHORT).show()
            }
    }

    private fun orchestrateFullFlow() {
        val rcNumber = rcNumberInput.text.toString().trim()
        val dlNumber = dlNumberInput.text.toString().trim()
        val user = auth.currentUser

        // 1) Validate inputs
        if (rcNumber.isEmpty() || dlNumber.isEmpty() || rcImageUri == null || dlImageUri == null) {
            Toast.makeText(this, "All fields and images are required", Toast.LENGTH_SHORT).show()
            Log.d("Verification", "Validation failed: Empty fields")
            return
        }

        // 2) Ensure user is logged in
        if (user == null) {
            Toast.makeText(this, "User not logged in!", Toast.LENGTH_SHORT).show()
            Log.d("Verification", "Error: uid is null")
            return
        }

        val uid = user.uid
        Log.d("Verification", "Starting flow for UID: $uid")
        Log.d("Verification", "RC: $rcNumber, DL: $dlNumber")

        // 3) Upload RC -> get rcUrl
        uploadFileWithRetry(rcImageUri!!, "drivers/$uid/rc.jpg", 0) { rcUrl ->
            if (rcUrl != null) {
                Log.d("Verification", "RC Upload Success: $rcUrl")
                
                // 4) Upload DL -> get dlUrl
                uploadFileWithRetry(dlImageUri!!, "drivers/$uid/dl.jpg", 0) { dlUrl ->
                    if (dlUrl != null) {
                        Log.d("Verification", "DL Upload Success: $dlUrl")
                        
                        // 5) Write to Firestore with both URLs
                        saveRcDlToFirestore(rcNumber, dlNumber, rcUrl, dlUrl)
                    } else {
                        Toast.makeText(this, "Failed to upload DL image", Toast.LENGTH_SHORT).show()
                        Log.d("Verification", "DL Upload Failed after retries")
                    }
                }
            } else {
                Toast.makeText(this, "Failed to upload RC image", Toast.LENGTH_SHORT).show()
                Log.d("Verification", "RC Upload Failed after retries")
            }
        }
    }

    private fun uploadFileWithRetry(uri: Uri, path: String, attempt: Int, onResult: (String?) -> Unit) {
        val ref = storage.reference.child(path)
        ref.putFile(uri)
            .continueWithTask { task ->
                if (!task.isSuccessful) {
                    task.exception?.let { throw it }
                }
                ref.downloadUrl
            }
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    onResult(task.result.toString())
                } else {
                    if (attempt < 1) { // Retry once on failure (6)
                        Log.d("Verification", "Upload failed for $path, retrying... (Attempt ${attempt + 1})")
                        uploadFileWithRetry(uri, path, attempt + 1, onResult)
                    } else {
                        onResult(null)
                    }
                }
            }
    }

    private fun saveRcDlToFirestore(rcNumber: String, dlNumber: String, rcUrl: String, dlUrl: String) {
        val uid = auth.currentUser?.uid ?: return
        val data = hashMapOf(
            "rcNumber" to rcNumber,
            "dlNumber" to dlNumber,
            "rcImage" to rcUrl,
            "dlImage" to dlUrl,
            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
        )

        db.collection("drivers").document(uid)
            .set(data, SetOptions.merge()) // 3) Use set(data, SetOptions.merge())
            .addOnSuccessListener {
                Log.d("Verification", "Firestore success for UID: $uid")
                Toast.makeText(this, "Verification data saved successfully!", Toast.LENGTH_LONG).show()
                finish()
            }
            .addOnFailureListener { e ->
                Log.d("Verification", "Firestore failure: ${e.message}")
                Toast.makeText(this, "Firestore error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }
}
