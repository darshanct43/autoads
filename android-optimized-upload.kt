import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.MediaStore
import android.util.Log
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageReference
import com.google.firebase.storage.UploadTask
import java.io.ByteArrayOutputStream
import java.io.InputStream

/**
 * Senior Android Firebase Debugging Implementation
 * FIX: "SYNCING 0%" issue by ensuring proper Bitmap conversion and putBytes usage.
 */
object FirebaseDebugManager {

    private const val TAG = "UPLOAD_DEBUG"

    /**
     * STEP 1 — Convert & Compress Image (Improved for reliability)
     */
    fun getCompressedBytes(context: Context, uri: Uri): ByteArray {
        return try {
            Log.d(TAG, "COMPRESSION STARTED for URI: $uri")
            
            // Use try-with-resources for input stream
            val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream?.close()

            if (bitmap == null) {
                Log.e(TAG, "BITMAP DECODE FAILED")
                return ByteArray(0)
            }

            // Step 2: Resize (max 1024px width)
            val maxWidth = 1024
            val ratio = bitmap.height.toFloat() / bitmap.width.toFloat()
            val targetHeight = (maxWidth * ratio).toInt()
            
            val resized = Bitmap.createScaledBitmap(bitmap, maxWidth, targetHeight, true)
            Log.d(TAG, "RESIZED: ${bitmap.width}x${bitmap.height} -> ${resized.width}x${resized.height}")

            // Step 3: Compress (50% quality)
            val stream = ByteArrayOutputStream()
            resized.compress(Bitmap.CompressFormat.JPEG, 50, stream)
            val bytes = stream.toByteArray()
            
            Log.d(TAG, "COMPRESSION SUCCESS: ${bytes.size / 1024} KB")
            bytes
        } catch (e: Exception) {
            Log.e(TAG, "COMPRESSION ERROR: ${e.message}")
            ByteArray(0)
        }
    }

    /**
     * STEP 2 — Upload with FULL DEBUG
     * FIX: Replaced putFile() with putBytes() for immediate execution
     */
    fun uploadAadhar(context: Context, uri: Uri, uid: String) {
        Log.d(TAG, "-----------------------------------")
        Log.d(TAG, "[uploadAadhar] FUNCTION CALLED for $uid")

        val bytes = getCompressedBytes(context, uri)

        if (bytes.isEmpty()) {
            Log.e(TAG, "[uploadAadhar] ERROR: IMAGE BYTES EMPTY")
            return
        }

        // Initialize Firebase Storage
        val storage = FirebaseStorage.getInstance()
        val ref: StorageReference = storage.reference.child("drivers/$uid/aadhar.jpg")
        
        Log.d(TAG, "[uploadAadhar] STORAGE REF: ${ref.path}")

        // STEP 4: putBytes
        val uploadTask: UploadTask = ref.putBytes(bytes)

        uploadTask
            .addOnProgressListener { taskSnapshot ->
                val progress = (100.0 * taskSnapshot.bytesTransferred / taskSnapshot.totalByteCount).toInt()
                Log.d(TAG, "[uploadAadhar] Progress: $progress% (${taskSnapshot.bytesTransferred}/${taskSnapshot.totalByteCount})")
            }
            .addOnSuccessListener {
                Log.d(TAG, "[uploadAadhar] !!! UPLOAD SUCCESS !!!")
                
                // Get URL and update Firestore if needed
                ref.downloadUrl.addOnSuccessListener { downloadUrl ->
                    Log.d(TAG, "[uploadAadhar] URL: $downloadUrl")
                }
            }
            .addOnFailureListener { exception ->
                Log.e(TAG, "[uploadAadhar] !!! UPLOAD FAILED !!!")
                Log.e(TAG, "[uploadAadhar] CAUSE: ${exception.message}")
                Log.e(TAG, "[uploadAadhar] RAW ERROR: $exception")
            }
    }

    /**
     * STEP 3 — TEST FIREBASE CONNECTION
     * Essential to confirm if it's a Rule/Config issue or an Image issue.
     */
    fun testUpload() {
        Log.d(TAG, "[testUpload] STARTING PING TEST...")
        
        val ref = FirebaseStorage.getInstance().reference.child("test.txt")
        val data = "Firebase Connection Test: ${System.currentTimeMillis()}".toByteArray()

        ref.putBytes(data)
            .addOnSuccessListener {
                Log.d(TAG, "[testUpload] TEST SUCCESS - Storage connection is HEALTHY")
            }
            .addOnFailureListener {
                Log.e(TAG, "[testUpload] TEST FAIL - Check Firebase Rules or Config")
                Log.e(TAG, "[testUpload] ERROR: ${it.message}")
            }
    }
}

