/**
 * AUTO ADS PLATFORM - COMPLETE ANDROID INTEGRATION
 * Features: Firebase Auth, Firestore, Storage, Razorpay
 */

import android.app.Activity
import android.content.Context
import android.net.Uri
import android.widget.Toast
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.google.firebase.storage.FirebaseStorage
import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import org.json.JSONObject

/**
 * 1. FIREBASE MANAGER
 */
object FirebaseManager {
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val storage = FirebaseStorage.getInstance()

    fun getUid(): String? = auth.currentUser?.uid

    /**
     * 2. DRIVER PROFILE (Firestore)
     */
    data class Driver(
        val name: String,
        val phone: String,
        val email: String,
        val vehicleNumber: String,
        val rcNumber: String,
        val dlNumber: String,
        val profileImage: String? = null
    )

    fun saveOrUpdateDriver(context: Context, driver: Driver) {
        val uid = getUid() ?: return
        val data = hashMapOf(
            "uid" to uid,
            "name" to driver.name,
            "phone" to driver.phone,
            "email" to driver.email,
            "vehicleNumber" to driver.vehicleNumber,
            "rcNumber" to driver.rcNumber,
            "dlNumber" to driver.dlNumber,
            "status" to "active",
            "createdAt" to FieldValue.serverTimestamp()
        )
        driver.profileImage?.let { data["profileImage"] = it }

        db.collection("drivers")
            .document(uid)
            .set(data, SetOptions.merge())
            .addOnSuccessListener { Toast.makeText(context, "Profile Saved", Toast.LENGTH_SHORT).show() }
            .addOnFailureListener { e -> Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show() }
    }

    /**
     * 3. IMAGE UPLOAD (Storage)
     */
    fun uploadProfileImage(context: Context, imageUri: Uri, onComplete: (String) -> Unit) {
        val uid = getUid() ?: return
        val ref = storage.reference.child("drivers/$uid/profile.jpg")

        ref.putFile(imageUri)
            .continueWithTask { task ->
                if (!task.isSuccessful) task.exception?.let { throw it }
                ref.downloadUrl
            }
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val url = task.result.toString()
                    db.collection("drivers").document(uid).update("profileImage", url)
                    onComplete(url)
                } else {
                    Toast.makeText(context, "Upload Failed", Toast.LENGTH_SHORT).show()
                }
            }
    }

    /**
     * 4. SUPPORT TICKETS
     */
    fun createSupportTicket(context: Context, issue: String) {
        val uid = getUid() ?: return
        val ticket = hashMapOf(
            "driverId" to uid,
            "issue" to issue,
            "status" to "open",
            "createdAt" to FieldValue.serverTimestamp()
        )
        db.collection("supportTickets").add(ticket)
            .addOnSuccessListener { Toast.makeText(context, "Ticket Raised", Toast.LENGTH_SHORT).show() }
    }

    /**
     * 5. FETCH DATA
     */
    fun getPayouts(onResult: (List<Map<String, Any>>) -> Unit) {
        val uid = getUid() ?: return
        db.collection("payouts")
            .whereEqualTo("driverId", uid)
            .get()
            .addOnSuccessListener { snap -> onResult(snap.documents.map { it.data ?: emptyMap() }) }
    }
}

/**
 * 2. PAYMENT ACTIVITY (Razorpay Integration)
 */
class PaymentActivity : Activity(), PaymentResultListener {

    private val RAZORPAY_KEY = "rzp_test_SiVpzaXh4yvUwX"

    fun startPayment(amount: Double) {
        val checkout = Checkout()
        checkout.setKeyID(RAZORPAY_KEY)

        try {
            val options = JSONObject()
            options.put("name", "Auto Ads Platform")
            options.put("description", "Campaign/Subscription Payment")
            options.put("image", "https://s3.amazonaws.com/rzp-mobile/images/rzp.png")
            options.put("theme.color", "#FFBF00") // Amber
            options.put("currency", "INR")
            options.put("amount", (amount * 100).toInt()) // In paise

            val retryObj = JSONObject()
            retryObj.put("enabled", true)
            retryObj.put("max_count", 4)
            options.put("retry", retryObj)

            checkout.open(this, options)
        } catch (e: Exception) {
            Toast.makeText(this, "Payment Error: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    override fun onPaymentSuccess(razorpayPaymentId: String?) {
        val db = FirebaseFirestore.getInstance()
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: ""

        val paymentData = hashMapOf(
            "driverId" to uid,
            "amount" to 500, // Example
            "paymentId" to razorpayPaymentId,
            "provider" to "Razorpay",
            "status" to "success",
            "createdAt" to FieldValue.serverTimestamp()
        )

        db.collection("driverPayments").add(paymentData)
            .addOnSuccessListener { Toast.makeText(this, "Payment Recorded", Toast.LENGTH_SHORT).show() }
    }

    override fun onPaymentError(code: Int, response: String?) {
        Toast.makeText(this, "Payment Failed: $response", Toast.LENGTH_LONG).show()
    }
}
