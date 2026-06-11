import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

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

  const { accessToken, provider = 'google', fileName = 'autoads_app.env' } = req.body;

  if (!accessToken) {
    return res.status(400).json({
      success: false,
      error: "Access token is required for authentication with your cloud drive provider.",
    });
  }

  try {
    // 1. Read the server-side .env file safely
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      return res.status(404).json({
        success: false,
        error: "Active configuration (.env) file was not found on the server workspace.",
      });
    }

    const envContent = fs.readFileSync(envPath, "utf-8");

    if (provider === 'google') {
      console.log(`[BACKUP_ENV] Initiating secure Google Drive .env file upload to '${fileName}'`);
      
      const folderName = 'Mayaan AutoAds Backups';
      const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      
      // Step A: Find or create the backups folder
      let folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!folderRes.ok) {
        const errorText = await folderRes.text();
        throw new Error(`Google Drive API auth verification failed. Response: ${errorText}`);
      }
      
      let folderData = await folderRes.json();
      let folderId = '';

      if (folderData.files && folderData.files.length > 0) {
        folderId = folderData.files[0].id;
      } else {
        // Create folder
        const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          })
        });

        if (!createFolderRes.ok) {
          throw new Error('Could not create backup folder in Google Drive.');
        }
        const folderObj = await createFolderRes.json();
        folderId = folderObj.id;
      }

      // Step B: Check if previous .env backup file exists inside the folder
      const fileQ = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;
      const searchFileRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQ)}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const fileSearchData = await searchFileRes.json();
      let fileId = '';

      if (fileSearchData.files && fileSearchData.files.length > 0) {
        // File exists, overwrite the contents
        fileId = fileSearchData.files[0].id;
        console.log(`[BACKUP_ENV] Updating existing .env file ID: ${fileId} in Google Drive`);
        
        const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'text/plain'
          },
          body: envContent
        });
        
        if (!updateRes.ok) {
          throw new Error('Failed to overwrite campaigns backup details.');
        }
      } else {
        // File does not exist, create it in 2 steps
        // 1. Create file metadata
        const createMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fileName,
            parents: [folderId],
            mimeType: 'text/plain'
          })
        });
        
        if (!createMetaRes.ok) {
          throw new Error('Failed to create campaigns backup file template.');
        }
        const metaObj = await createMetaRes.json();
        fileId = metaObj.id;

        // 2. Upload the actual .env content media
        const uploadContentRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'text/plain'
          },
          body: envContent
        });
        
        if (!uploadContentRes.ok) {
          throw new Error('Failed to upload campaigns backup payload.');
        }
      }

      return res.status(200).json({
        success: true,
        provider: 'google',
        fileName,
        id: fileId,
        message: `.env configuration successfully backed up to Google Drive! File ID: ${fileId}`
      });

    } else if (provider === 'onedrive') {
      console.log(`[BACKUP_ENV] Initiating secure OneDrive (OneDrive) .env file upload to '${fileName}'`);
      
      // Upload using Microsoft Graph API direct PUT request
      const putUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/Mayaan AutoAds Backups/${fileName}:/content`;
      
      const onedriveRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'text/plain'
        },
        body: envContent
      });

      if (!onedriveRes.ok) {
        const errData = await onedriveRes.text();
        throw new Error(`Microsoft OneDrive upload failed: ${errData}`);
      }

      const resData = await onedriveRes.json();
      const fileId = resData.id || 'onedrive_file';

      return res.status(200).json({
        success: true,
        provider: 'onedrive',
        fileName,
        id: fileId,
        message: `.env configuration successfully backed up to Microsoft OneDrive! ID: ${fileId}`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported backup provider: "${provider}". Only 'google' or 'onedrive' are supported.`,
      });
    }

  } catch (error: any) {
    console.error(`[BACKUP_ENV_ERROR] Backup process failed:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "An exception occurred during the .env backup pipeline.",
    });
  }
}
