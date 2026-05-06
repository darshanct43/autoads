/**
 * AUTO AD PRO - TASK & ASSIGNMENT MANAGEMENT (KOTLIN)
 * Simplified for drivers: No campaign budgets or ad content visibility.
 */

package com.autoads.campaigns

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import java.util.*

/**
 * DATA MODELS
 */
// Internal/Admin only representation
data class Campaign(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val imageUrl: String = "",
    val videoUrl: String = "",
    val budget: Double = 0.0,
    val status: String = "active"
)

// Driver's perspective: A "Task"
data class DriverTask(
    val id: String = "",
    val driverId: String = "",
    val status: String = "assigned", // "assigned", "running", "completed"
    val earnings: Double = 0.0,      // Driver's personal earnings only
    val createdAt: Date? = null
)

/**
 * TASK MANAGER SERVICE
 */
object TaskManager {
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    /**
     * ADMIN: Silent Assignment (No permission asked from driver)
     */
    fun assignTaskToDriver(driverId: String, campaignId: String, driverEarnings: Double) {
        val assignmentId = UUID.randomUUID().toString()
        val task = hashMapOf(
            "id" to assignmentId,
            "driverId" to driverId,
            "campaignId" to campaignId, // ID link kept for backend, not shown in UI
            "status" to "assigned",
            "earnings" to driverEarnings,
            "createdAt" to FieldValue.serverTimestamp()
        )

        db.collection("driverAssignments")
            .document(assignmentId)
            .set(task)
    }

    /**
     * DRIVER: Get My "Tasks" (Filtered view)
     * Driver doesn't see campaign titles or budgets.
     */
    fun getMyTasks(status: String? = null): Query {
        val uid = auth.currentUser?.uid ?: ""
        var query = db.collection("driverAssignments")
            .whereEqualTo("driverId", uid)
        
        if (status != null) {
            query = query.whereEqualTo("status", status)
        }
        
        return query.orderBy("createdAt", Query.Direction.DESCENDING)
    }

    /**
     * DRIVER: Update My Progress
     */
    fun updateTaskProgress(taskId: String, newStatus: String, earnings: Double) {
        val uid = auth.currentUser?.uid ?: return
        
        db.collection("driverAssignments").document(taskId)
            .update("status", newStatus)
            .addOnSuccessListener {
                if (newStatus == "completed") {
                    finalizeEarnings(uid, taskId, earnings)
                }
            }
    }

    private fun finalizeEarnings(driverId: String, taskId: String, amount: Double) {
        val payment = hashMapOf(
            "driverId" to driverId,
            "taskId" to taskId,
            "amount" to amount,
            "status" to "success",
            "type" to "earning",
            "createdAt" to FieldValue.serverTimestamp()
        )

        db.collection("driverPayments").add(payment)
    }
}
