# Phase 7 Architecture: Security & Isolation Design

## 1. Role Matrix
- **SUPER_ADMIN**: Full system access, bypasses all typical constraints.
- **HQ_ADMIN**: Operations at HQ level. Can view and manage all territories and franchises.
- **HQ_SUPPORT**: Support desk at HQ. Can view cross-territory support tickets and provide generalized support.
- **FRANCHISE_OWNER**: Owns a franchise entity. Can manage assigned territories, view their own revenue/settlements, and manage their staff/drivers.
- **FRANCHISE_STAFF**: Operations team for a specific franchise. Read/write within assigned franchise operations only.
- **DRIVER**: Independent contractor. Can only access their own driver profile, assigned campaigns, and earnings.
- **CUSTOMER**: Campaign advertiser. Can only access their own profile, payment history, and own campaigns.

## 2. Collection Access Matrix
*(Permissions: Read [R], Create [C], Update [U], Delete [D])*

| Collection | SUPER_ADMIN / HQ_ADMIN | HQ_SUPPORT | FRANCHISE_OWNER | FRANCHISE_STAFF | DRIVER | CUSTOMER |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **territories** | R, C, U, D | R | R (Assigned) | R (Assigned) | R (Assigned) | None |
| **franchises** | R, C, U, D | R | R, U (Own) | R (Own) | None | None |
| **franchiseTerritories**| R, C, U, D | R | R (Own) | R (Own) | None | None |
| **territoryHistory** | R, C, U, D | R | None | None | None | None |
| **territoryMetrics** | R, C, U, D | R | R (Own) | R (Own) | None | None |
| **drivers** | R, C, U, D | R | R, U (Assigned) | R, U (Assigned) | R, U (Own) | None |
| **customers** | R, C, U, D | R | R (Assigned) | R (Assigned) | None | R, U (Own) |
| **workers** | R, C, U, D | R | R, C, U, D (Own) | R (Own) | None | None |
| **campaigns** | R, C, U, D | R | R, U (Assigned) | R, U (Assigned) | R (Assigned) | R, C, U (Own)|
| **payments** | R, C, U, D | R | R (Assigned) | R (Assigned) | None | R (Own) |
| **driverPayments** | R, C, U, D | R | R (Assigned) | R (Assigned) | R (Own) | None |
| **payouts** | R, C, U, D | R | R (Own) | None | None | None |
| **settlements** | R, C, U, D | R | R (Own) | R (Own) | None | None |
| **supportTickets** | R, C, U, D | R, U | R, C, U (Assigned) | R, C, U (Assigned) | R, C, U (Own)| R, C, U (Own)|
| **supportRooms** | R, C, U, D | R, U | R, C, U (Assigned) | R, C, U (Assigned) | R, C, U (Own)| R, C, U (Own)|
| **relayMessages**| R, C, U, D | R, C | R, C (Assigned) | R, C (Assigned) | R, C (Own) | R, C (Own) |
| **auditLogs** | R | R | None | None | None | None |
| **mediaAssets** | R, C, U, D | R | R, C, U, D (Own) | R, C, U (Own) | R, C (Own) | R, C, U (Own)|
| **exports** | R, C, U, D | R | R (Own) | R (Own) | None | None |
*Note: Create/Delete actions on core collections are strictly reserved for Cloud Functions / Admin interfaces where appropriate.*

## 3. Query Isolation Matrix
Database queries are strictly scoped based on access limits:
- **SUPER_ADMIN / HQ_ADMIN**: No filters required. Can query all records.
- **HQ_SUPPORT**: Read-only queries scoped globally across all territories.
- **FRANCHISE_OWNER / FRANCHISE_STAFF**: Queries MUST include `where("franchiseId", "==", own franchiseId)` or match `territoryId` mapped in their assigned territories list.
- **DRIVER**: Queries MUST include `where("uid", "==", own uid)` or `where("driverId", "==", own uid)`.
- **CUSTOMER**: Queries MUST include `where("uid", "==", own uid)` or `where("customerId", "==", own uid)`.

## 4. Settlement Security Matrix
- **Who creates settlements**: Backend Scheduled Tasks / Webhooks ONLY (No manual creation).
- **Who processes settlements**: SUPER_ADMIN, HQ_ADMIN.
- **Who marks settled**: SUPER_ADMIN, HQ_ADMIN.
- **Who views all settlements**: SUPER_ADMIN, HQ_ADMIN.
- **Who views own settlements**: FRANCHISE_OWNER, FRANCHISE_STAFF (filtered by `franchiseId`).
- **Who views revenue reports**: HQ_ADMIN & FRANCHISE_OWNER (filtered by `franchiseId`).

## 5. Audit Log Security Matrix
Audit logs are strictly immutable:
- **Read**: SUPER_ADMIN, HQ_ADMIN.
- **Create**: Automated systems and Cloud Functions ONLY (No client writes allowed).
- **Update**: NO ONE (0% access).
- **Delete**: NO ONE (0% access).

## 6. Media Security Matrix
Path-based isolation on AWS S3, accessed through Pre-signed URLs:
- **HQ**: `territories/*`
- **Franchise**: `franchises/{franchiseId}/*`
- **Driver**: `drivers/{driverId}/*`
*Protections*:
- Prevent cross-franchise access by verifying Custom Auth Claims (`franchiseId` or `driverId`) match the requested AWS S3 prefix before minting the token.
- Prevent path traversal by explicitly dropping occurrences of `../` in requested asset names.

## 7. Firestore Rule Blueprint
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Core Role Checks
    function isAdmin() { return request.auth.token.role in ['SUPER_ADMIN', 'HQ_ADMIN']; }
    function isFranchise() { return request.auth.token.role in ['FRANCHISE_OWNER', 'FRANCHISE_STAFF']; }
    function currentUserFranchiseId() { return request.auth.token.franchiseId; }

    // Settlements Rule Example
    match /settlements/{settlementId} {
      allow read: if isAdmin() || (isFranchise() && resource.data.franchiseId == currentUserFranchiseId());
      allow update: if isAdmin();
      allow create, delete: if false; // System generated
    }

    // Drivers Rule Example
    match /drivers/{driverId} {
      allow read, update: if isAdmin() 
        || (isFranchise() && resource.data.franchiseId == currentUserFranchiseId()) 
        || request.auth.uid == driverId;
      allow create, delete: if isAdmin(); // Signup handles creation via system
    }

    // Audit Logs Rule Example
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow create, update, delete: if false; // Strictly backend written
    }
  }
}
```

## 8. Risk Assessment
- **Privilege Escalation**: Mitigated. Roles are enforced via verifiable Custom Auth Claims minted by HQ. They are not stored in standard documents writable by clients.
- **Cross-franchise Leakage**: Mitigated. Access explicitly checks `resource.data.franchiseId == currentUserFranchiseId()` preventing a franchise from querying or writing outside their boundary.
- **Settlement Fraud**: Mitigated. Client-side creation and deletion of settlements are entirely disabled.
- **Revenue Leakage**: Mitigated. Revenue aggregations are derived server-side via scheduled tasks, prohibiting users from artificially bloating `territoryMetrics`.
- **Audit Log Tampering**: Assured. Audit documents enforce an unconditional `allow update: if false; allow delete: if false;`.
- **Media Abuse**: Mitigated. Presigned S3 URLs enforce path logic (`franchises/{id}/`) server-side, preventing token generation for unauthorized scopes.
