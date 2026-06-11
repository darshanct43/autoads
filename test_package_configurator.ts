
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- RUNNING E2E PACKAGE CONFIGURATOR TEST ---");
  try {
    // 1. Get a plan
    const plansSnap = await dbAdm.collection('plans').limit(1).get();
    if(plansSnap.empty) throw new Error("No plans found");
    const planId = plansSnap.docs[0].id;
    console.log(`Using plan: ${planId}`);

    // Create proposal (logic from AdminPortal.tsx onPushToNetwork)
    const proposalRef = await dbAdm.collection('planProposals').add({
      planId: planId,
      currentPrice: 100,
      proposedPrice: 150,
      reason: 'E2E Test',
      type: 'price',
      createdAt: new Date(),
      status: 'pending'
    });
    console.log(`Proposal created: ${proposalRef.id}`);

    // Approve proposal
    await dbAdm.collection('planProposals').doc(proposalRef.id).update({ status: 'approved' });
    await dbAdm.collection('plans').doc(planId).update({ price: 150 });
    console.log("Proposal approved and Plan updated.");

    // Verify
    const planDoc = await dbAdm.collection('plans').doc(planId).get();
    console.log(`Final plan price: ${planDoc.data()?.price}`);

  } catch (err: any) {
    console.error("Error in E2E test:", err.message);
  }
}

run();
