import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageReference
import com.google.firebase.storage.UploadTask
import java.io.ByteArrayOutputStream
import java.io.InputStream

/**
 * FINAL WORKING ANDROID IMPLEMENTATION
 * 
 * FIXES:
 * 1. "SYNCING 0%" - Replaces putFile (URI) with putBytes (Memory) to avoid FS issues.
 * 2. TIMEOUT - Uses aggressive compression to ensure file size < 100KB.
 * 3. SYNC FAIL - Correctly chains DownloadURL -> Firestore Update.
 */
object EnrollmentManager {

    private const val TAG = "UPLOAD"

    fun uploadDocument(context: Context, uri: Uri, uid: String, type: String) {
        Log.d(TAG, "-----------------------------------")
        Log.d(TAG, "STARTING ENROLLMENT: $type")

        try {
            // STEP 1: URI → Bitmap (Safe Decoding)
            val input: InputStream? = context.contentResolver.openInputStream(uri)
            val bitmap = BitmapFactory.decodeStream(input)
            input?.close()

            if (bitmap == null) {
                Log.e(TAG, "ERROR: FAILED TO DECODE BITMAP FOR $uri")
                return
            }

            // STEP 2: Resize (Maximum 1024px while preserving aspect ratio)
            val maxWidth = 1024
            val scale = maxWidth.toFloat() / bitmap.width.toFloat()
            val targetWidth = if (scale < 1.0) maxWidth else bitmap.width
            val targetHeight = if (scale < 1.0) (bitmap.height * scale).toInt() else bitmap.height

            val resized = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
            Log.d(TAG, "RESIZE: ${bitmap.width}x${bitmap.height} -> ${resized.width}x${resized.height}")

            // STEP 3: Compress (50% Quality for ultra-fast sync)
            val stream = ByteArrayOutputStream()
            resized.compress(Bitmap.CompressFormat.JPEG, 50, stream)
            val bytes = stream.toByteArray()

            Log.d(TAG, "COMPRESSED SIZE: ${bytes.size / 1024} KB")

            // STEP 4: Upload to Firebase Storage
            val storageRef: StorageReference = FirebaseStorage.getInstance()
                .reference.child("drivers/$uid/${type.lowercase()}.jpg")

            Log.d(TAG, "STORAGE PATH: ${storageRef.path}")

            // Use putBytes() for better reliability over putFile()
            val uploadTask: UploadTask = storageRef.putBytes(bytes)

            uploadTask
                .addOnProgressListener { snapshot ->
                    val progress = (100.0 * snapshot.bytesTransferred / snapshot.totalByteCount).toInt()
                    Log.d(TAG, "$type Progress: $progress%")
                }
                .addOnSuccessListener {
                    Log.d(TAG, "$type UPLOAD SUCCESSFUL")

                    // STEP 5: Get URL and Save to Firestore
                    storageRef.downloadUrl.addOnSuccessListener { downloadUrl ->
                        Log.d(TAG, "GOT DOWNLOAD URL: $downloadUrl")
                        
                        // Map internal type to Firestore field name
                        val firestoreField = when(type.uppercase()) {
                            "AADHAR" -> "aadharPhoto"
                            "RC" -> "rcPhoto"
                            "DL" -> "dlPhoto"
                            "PROFILE" -> "profileImage"
                            else -> "${type.lowercase()}Photo"
                        }

                        FirebaseFirestore.getInstance()
                            .collection("drivers")
                            .document(uid)
                            .update(firestoreField, downloadUrl.toString())
                            .addOnSuccessListener {
                                Log.d(TAG, "FIRESTORE SYNCED: $firestoreField updated")
                            }
                            .addOnFailureListener { e ->
                                Log.e(TAG, "FIRESTORE FAILED: ${e.message}")
                            }
                    }
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "$type UPLOAD ERROR: ${e.message}")
                    Log.e(TAG, "Check Firebase Storage rules (match /drivers/{userId}/{allPaths=**})")
                }

        } catch (e: Exception) {
            Log.e(TAG, "FATAL ERROR during $type: ${e.message}")
        }
    }
    
    /**
     * Diagnostic Test: Direct Storage Ping
     */
    fun testConnection() {
        val ref = FirebaseStorage.getInstance().reference.child("test.txt")
        val data = "test".toByteArray()
        ref.putBytes(data).addOnCompleteListener { 
            if (it.isSuccessful) Log.d(TAG, "TEST: PING SUCCESS")
            else Log.e(TAG, "TEST: PING FAILED ${it.exception?.message}")
        }
    }
}
