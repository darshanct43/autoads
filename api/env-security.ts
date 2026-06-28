import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";
import { dbAdm } from "../lib/firebase-admin.js";
import admin from "firebase-admin";

const REQUIRED_PASSWORD = "Hospital.Env";

async function logAudit(
  userId: string,
  email: string,
  action: string,
  fileName: string,
  status: string
) {
  try {
    await dbAdm.collection("environmentAuditLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: userId || "unknown",
      email: email || "unknown",
      action,
      fileName,
      status,
    });
  } catch (err) {
    console.error("Failed to write to environmentAuditLogs collection:", err);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const {
    userId,
    email,
    activeRole,
    password,
    action,
    envContent,
  } = req.body;

  // 1. Check if ADMIN or HQ_ADMIN role
  const isAdmin = activeRole === "ADMIN" || activeRole === "HQ_ADMIN";
  if (!isAdmin) {
    await logAudit(
      userId,
      email,
      action || "UNKNOWN_ACTION",
      "multiple",
      "REJECTED_ROLE_RESTRICTED"
    );
    return res.status(403).json({
      success: false,
      error: "Access Denied: Environment Security Manager requires ADMIN status.",
    });
  }

  // 2. Check Password Confirmation
  if (password !== REQUIRED_PASSWORD) {
    await logAudit(
      userId,
      email,
      action || "UNKNOWN_ACTION",
      "multiple",
      "FAILED_PASSWORD_CONFIRMATION"
    );
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid Admin Confirmation Password.",
    });
  }

  const envPath = path.join(process.cwd(), ".env");
  const examplePath = path.join(process.cwd(), ".env.example");
  const backupPath = path.join(process.cwd(), ".env.backup");

  try {
    switch (action) {
      case "GET_FILES": {
        const envVal = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
        const exampleVal = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, "utf8") : "";
        const backupVal = fs.existsSync(backupPath) ? fs.readFileSync(backupPath, "utf8") : "";

        await logAudit(userId, email, "VIEW_CREDENTIALS", ".env/.env.example/.env.backup", "SUCCESS");

        return res.status(200).json({
          success: true,
          env: envVal,
          example: exampleVal,
          backup: backupVal,
        });
      }

      case "SAVE_ENV": {
        if (typeof envContent !== "string") {
          return res.status(400).json({ success: false, error: "Invalid envContent parameter." });
        }

        // Backup existing .env first if it exists
        if (fs.existsSync(envPath)) {
          fs.copyFileSync(envPath, backupPath);
        }

        fs.writeFileSync(envPath, envContent, "utf8");

        await logAudit(userId, email, "MODIFY_CREDENTIALS", ".env", "SUCCESS");

        return res.status(200).json({
          success: true,
          message: "Active environment variables modified successfully. Dev server restart may be required.",
        });
      }

      case "UPLOAD_ENV": {
        if (typeof envContent !== "string") {
          return res.status(400).json({ success: false, error: "Invalid envContent parameter." });
        }

        // Backup existing .env first if it exists
        if (fs.existsSync(envPath)) {
          fs.copyFileSync(envPath, backupPath);
        }

        fs.writeFileSync(envPath, envContent, "utf8");

        await logAudit(userId, email, "REPLACE_CREDENTIALS", ".env", "SUCCESS");

        return res.status(200).json({
          success: true,
          message: "Credential file uploaded and replace completed successfully.",
        });
      }

      case "RESTORE_BACKUP": {
        if (!fs.existsSync(backupPath)) {
          await logAudit(userId, email, "RESTORE_ENV_BACKUP", ".env.backup", "FAILED_BACKUP_NOT_FOUND");
          return res.status(404).json({
            success: false,
            error: "No active backup file (.env.backup) found on this workspace.",
          });
        }

        // Copy backup to active .env
        fs.copyFileSync(backupPath, envPath);

        await logAudit(userId, email, "RESTORE_ENV_BACKUP", ".env.backup", "SUCCESS");

        return res.status(200).json({
          success: true,
          message: "Active configuration restored successfully from the .env.backup backup point.",
        });
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported action: "${action}"`,
        });
    }
  } catch (err: any) {
    console.error("[ENV_SECURITY_ERROR] Operation failed:", err);
    await logAudit(userId, email, action || "UNKNOWN_ACTION", "multiple", `ERROR: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message || "An error occurred during the security pipeline.",
    });
  }
}
