# Phase 6 Architecture: Franchise Operations System

## 1. Collection Definitions
- `franchises`: Contains the core identity, contact, and status information for each Franchise partner.
- `territories`: Used as the master record for a territory. Contains the current `franchiseId` (or null if managed by HQ).
- `territoryHistory`: Audit log collection tracking the complete chain of custody for every territory transfer or ownership change.

## 2. Schemas

### Franchise Schema
```typescript
interface Franchise {
  franchiseId: string;
  franchiseName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  assignedTerritories: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Territory History Schema
```typescript
interface TerritoryHistory {
  historyId: string;
  territoryId: string;
  oldOwnerId: string | 'HQ'; // franchiseId or 'HQ'
  newOwnerId: string | 'HQ'; // franchiseId or 'HQ'
  changedBy: string; // admin userId executing the transfer
  reason: string;
  timestamp: string; // ISO 8601
}
```

## 3. Territory Ownership Rules
- **Rule of Singularity**: A territory may belong to HQ OR exactly ONE franchise at any given time. Never multiple franchises.
- **Enforcement**: The `territories` collection document has a singular `franchiseId` field. If this field is `null`, it implies HQ ownership.
- **Validation**: When assigning a territory to a new franchise, the system must perform a transactional check to verify the territory is not currently assigned to another active franchise.

## 4. Territory Transfer Workflow
When transferring a territory from Franchise A to Franchise B (or back to HQ):
1. **Pre-flight Check**: Validate Franchise B is `ACTIVE`.
2. **Transactional Update**:
   - Update `territories` document: set `franchiseId` to Franchise B.
   - Update Franchise A's document: remove the territory from `assignedTerritories`.
   - Update Franchise B's document: add the territory to `assignedTerritories`.
3. **Audit Log Generation**: Create a document in `territoryHistory` logging `oldOwner`, `newOwner`, `changedBy`, `reason`, and `timestamp`.
4. **Preservation**: The territory ID remains the primary key on all drivers, campaigns, and historical payments. Historical settlements remain tied to Franchise A via the `franchiseId` on the settlement document. Future settlements will aggregate under Franchise B.

## 5. Suspension Workflow
When a franchise status becomes `SUSPENDED`:
- **Can Login?**: YES (to view historical data and communication from HQ).
- **Can Receive Settlements?**: NO. Settlement generation is paused/held in pending state. Payouts are blocked.
- **Can Create Campaigns?**: NO.
- **Can Manage Drivers?**: NO (read-only access to existing drivers).

## 6. Termination Workflow
When a franchise status becomes `TERMINATED`:
- **Territory Reassignment**: Territories are immediately and automatically transferred back to `HQ` ownership. A transfer audit is logged for each territory.
- **Settlement Handling**: Any pending settlements are calculated up to the termination timestamp. Final payouts are subject to manual HQ review and legal release. Future revenue accrues to HQ.
- **Driver Ownership Handling**: Drivers remain attached to their respective `territoryId`. Since the territory now belongs to HQ, management defaults to HQ.
- **Campaign Ownership Handling**: Active campaigns continue to run (advertisers paid for them). Revenue correctly attributes to HQ post-termination.

## 7. Admin Dashboard Architecture
HQ Franchise Management Dashboard Metrics:
- **Franchise Count**: Total number of franchise entities.
- **Active Franchises**: Count where status = `ACTIVE`.
- **Suspended Franchises**: Count where status = `SUSPENDED`.
- **Territories Assigned**: Number of territories managed by franchises.
- **Territories Available**: Number of territories managed by HQ (available for franchising).
- **Revenue By Franchise**: Leaderboard of franchises by generated gross revenue.
- **Settlement Status**: Aggregate pending, processing, and settled amounts across all franchises.

## 8. Risk Assessment
- **Ownership Conflicts & Duplicate Assignments**: Prevented by using the singular `franchiseId` field on the `territories` document as the single source of truth, updated transactionally.
- **Revenue Leakage**: Prevented by calculating revenue splits strictly based on the current `franchiseId` at the exact moment of settlement generation, referencing campaign completion timestamps against the `territoryHistory` if needed for mid-cycle transfers.
- **Settlement Leakage**: Addressed by the suspension workflow natively blocking payouts and enforcing manual review upon termination.
- **Transfer Fraud**: Mitigated by the immutable `territoryHistory` append-only audit trail. Only authorized HQ administrators can initiate a transfer.
