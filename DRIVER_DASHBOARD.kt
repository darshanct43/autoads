/**
 * AUTO AD PRO - DRIVER DASHBOARD (KOTLIN)
 * Real-time earnings, profile, and status management.
 */

package com.autoads.dashboard

import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

/**
 * 1. DATA MODELS
 */
data class DriverProfile(
    val name: String = "",
    val phone: String = "",
    val vehicleNumber: String = "",
    val status: String = "PENDING"
)

data class DriverPayment(
    val amount: Double = 0.0,
    val type: String = "", // "earning" or "withdrawal"
    val status: String = "" // "success", "pending"
)

/**
 * 2. DASHBOARD VIEWMODEL
 * Handles logic and real-time listeners.
 */
class DriverDashboardViewModel : ViewModel() {
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val uid = auth.currentUser?.uid ?: ""

    val profile = MutableLiveData<DriverProfile>()
    val totalEarnings = MutableLiveData<Double>(0.0)
    val availableBalance = MutableLiveData<Double>(0.0)
    val isOnline = MutableLiveData<Boolean>(false)
    val isLoading = MutableLiveData<Boolean>(true)

    init {
        if (uid.isNotEmpty()) {
            fetchDriverProfile()
            fetchDriverPayments()
        }
    }

    /**
     * FETCH PROFILE & STATUS
     */
    private fun fetchDriverProfile() {
        db.collection("drivers").document(uid)
            .addSnapshotListener { snapshot, e ->
                if (e != null) return@addSnapshotListener
                
                snapshot?.toObject(DriverProfile::class.java)?.let {
                    profile.value = it
                    isOnline.value = it.status == "ONLINE"
                    isLoading.value = false
                }
            }
    }

    /**
     * FETCH PAYMENTS & CALCULATE EARNINGS
     */
    private fun fetchDriverPayments() {
        db.collection("driverPayments")
            .whereEqualTo("driverId", uid)
            .addSnapshotListener { snapshot, e ->
                if (e != null) return@addSnapshotListener
                
                var total = 0.0
                var withdrawn = 0.0
                
                snapshot?.documents?.forEach { doc ->
                    val payment = doc.toObject(DriverPayment::class.java) ?: return@forEach
                    if (payment.status == "success" || payment.status == "SUCCESS") {
                        if (payment.type == "earning") {
                            total += payment.amount
                        } else if (payment.type == "withdrawal") {
                            withdrawn += payment.amount
                        }
                    }
                }
                
                totalEarnings.value = total
                availableBalance.value = (total - withdrawn)
            }
    }

    /**
     * TOGGLE STATUS (ONLINE/OFFLINE)
     */
    fun updateDriverStatus(online: Boolean) {
        val newStatus = if (online) "ONLINE" else "OFFLINE"
        db.collection("drivers").document(uid)
            .update("status", newStatus)
            .addOnSuccessListener {
                isOnline.value = online
                Log.d("Dashboard", "Status updated to $newStatus")
            }
    }
}

/**
 * 3. USAGE IN ACTIVITY/FRAGMENT
 * (Illustrative example of observing data)
 */
/*
val viewModel = ViewModelProvider(this).get(DriverDashboardViewModel::class.java)

viewModel.profile.observe(this) { p ->
    welcomeText.text = "Hello, ${p.name}"
    vehicleText.text = p.vehicleNumber
}

viewModel.totalEarnings.observe(this) { earnings ->
    earningsCardValue.text = "₹${earnings.toInt()}"
}

viewModel.availableBalance.observe(this) { balance ->
    balanceCardValue.text = "₹${balance.toInt()}"
}

statusSwitch.setOnCheckedChangeListener { _, isChecked ->
    viewModel.updateDriverStatus(isChecked)
}
*/
