# Security Specification for Auto Ads platform

## 1. Data Invariants
- **Drivers**: A driver's UID must match their document ID. Role modification is restricted to Admins.
- **Campaigns**: Media and payments belong to specific campaigns. Access is controlled via campaign metadata.
- **Assignments**: Drivers can only read assignments where `driverId` matches their UID.
- **Payouts**: Drivers can only read their own payout history. Payout creation is restricted to Admins.
- **Support Tickets**: Drivers can create tickets and read their own tickets. Resolution is reserved for Admins.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

| Collection | Action | Malicious Intent | Expected Result |
|------------|--------|------------------|-----------------|
| `drivers`  | Update | Change `role` to 'ADMIN' | PERMISSION_DENIED |
| `drivers`  | Update | Change `uid` to another user's ID | PERMISSION_DENIED |
| `drivers`  | Create | Create profile for someone else | PERMISSION_DENIED |
| `campaigns`| Create | Set status to 'active' without approval | PERMISSION_DENIED (if enforced) |
| `driverPayouts` | Create | Self-assign a payout | PERMISSION_DENIED |
| `users`    | Update | Escalate own role | PERMISSION_DENIED |
| `supportTickets` | Update | Mark own ticket as 'resolved' | PERMISSION_DENIED |
| `campaigns` | Delete | Unauthorized deletion by client | PERMISSION_DENIED |
| `campaigns` | List | Scrape data using broad query | PERMISSION_DENIED (if listing not constrained) |
| `drivers` | Update | Large string injection in 'name' | PERMISSION_DENIED |
| `driverAssignments` | List | View other drivers' assignments | PERMISSION_DENIED |
| `payments` | Read | Scrape global payment data | PERMISSION_DENIED |

## 3. Test Runner (Conceptual logic)
- Verify `request.auth.uid` matches `resource.data.userId` or `resource.data.driverId`.
- Verify `isSignedIn()` is called before state changes.
- Verify `isAdmin()` checks are enforced for sensitive fields.
- Verify `affectedKeys().hasOnly()` during updates.
