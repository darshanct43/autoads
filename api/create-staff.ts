import { Request, Response } from 'express';
import { dbAdm, admin } from '../lib/firebase-admin.js';

export default async function createStaffHandler(req: Request, res: Response) {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. We skip trying to create the user in Identity Toolkit via Admin SDK.
    // because some deployed environments might not have it enabled for the backend service account.
    // Instead we just whitelist the user and provision their default record.
    
    // We will use the email as a placeholder UID until they register
    const tempUid = email.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 2. Create user record in Firestore
    await dbAdm.collection('users').doc(tempUid).set({
      uid: tempUid,
      email: email.toLowerCase(),
      role: role,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 3. Also add to whitelist if not already there
    await dbAdm.collection('staffWhitelist').doc(email.toLowerCase()).set({
      email: email.toLowerCase(),
      role,
      addedBy: 'ADMIN_API',
      createdAt: new Date().toISOString()
    });

    return res.json({ 
      success: true, 
      uid: tempUid,
      message: `Staff account whitelisted for ${email}` 
    });

  } catch (error: any) {
    console.error('Error creating staff account:', error);
    return res.status(500).json({ error: error.message || 'Failed to create staff account' });
  }
}
