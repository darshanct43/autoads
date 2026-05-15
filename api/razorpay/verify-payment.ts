import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import * as admin from "firebase-admin";
import { getAdmin } from "../_lib";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      campaignData,
      planData,
      uid,
    } = req.body;

    // Razorpay Secret
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        error: "RAZORPAY_KEY_SECRET missing",
      });
    }

    // Verify Signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const isAuthentic =
      expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed",
      });
    }

    // Firebase Admin
    const adminApp = getAdmin();

    if (!adminApp) {
      return res.status(500).json({
        success: false,
        error: "Firebase Admin not initialized",
      });
    }

    const db = adminApp.db;

    // Create Campaign
    const campaignRef = await db.collection("campaigns").add({
      ...campaignData,
      status: "PAID",
      paymentStatus: "PAID",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save Payment
    await db.collection("payments").add({
      campaignId: campaignRef.id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: planData?.amount || 0,
      customerId: uid || null,
      status: "SUCCESS",
      paymentMethod: "razorpay",
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      campaignId: campaignRef.id,
      paymentId: razorpay_payment_id,
    });

  } catch (error: any) {
    console.error("VERIFY ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Verification failed",
    });
  }
}