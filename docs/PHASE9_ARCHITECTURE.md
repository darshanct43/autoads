# Phase 9 Architecture: Device & Fleet Operations System

## SECTION 1: DEVICE SCHEMA

```typescript
interface Device {
  deviceId: string;
  serialNumber: string;
  imei: string;
  simNumber: string;
  firmwareVersion: string;
  
  status: 'IN_STOCK' | 'ASSIGNED' | 'ACTIVE' | 'OFFLINE' | 'MAINTENANCE' | 'RETIRED';
  
  territoryId: string | null;
  franchiseId: string | null;
  
  vehicleId: string | null;
  driverId: string | null;
  
  lastHeartbeat: string | null; // ISO Timestamp
  healthScore: number;
  
  createdAt: string;
  updatedAt: string;
}
```

## SECTION 2: VEHICLE SCHEMA

```typescript
interface Vehicle {
  vehicleId: string;
  registrationNumber: string;
  
  vehicleType: string; // e.g., 'AUTO_RICKSHAW'
  
  ownerName: string;
  ownerPhone: string;
  
  territoryId: string | null;
  franchiseId: string | null;
  
  assignedDriverId: string | null;
  assignedDeviceId: string | null;
  
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
  
  createdAt: string;
  updatedAt: string;
}
```

## SECTION 3: DEVICE LIFECYCLE

**Transitions:**
- `IN_STOCK` → `ASSIGNED`: Device mapped to a Vehicle and Driver, awaiting physical installation/first boot.
- `ASSIGNED` → `ACTIVE`: Device completes first successful boot and network heartbeat.
- `ACTIVE` → `OFFLINE`: Device misses required heartbeat interval threshold.
- `OFFLINE` → `MAINTENANCE`: Device pulled from field for repair.
- `ACTIVE` → `MAINTENANCE`: Device flagged for preventative maintenance or physical damage.
- `MAINTENANCE` → `ACTIVE`: Device repaired and reinstalled successfully.
- `MAINTENANCE` / `OFFLINE` / `IN_STOCK` → `RETIRED`: Device permanently decommissioned.

**Validation Rules:**
- Only `IN_STOCK` or `MAINTENANCE` devices can be marked `ASSIGNED`.
- Devices must send a valid payload to transition from `ASSIGNED` to `ACTIVE`.
- `RETIRED` is an immutable terminal state.

## SECTION 4: ASSIGNMENT ENGINE

**Rules**:
- **1 Device → 1 Vehicle**: A device can only be bound to a single vehicle at a time.
- **1 Vehicle → 1 Device**: A vehicle can only host a single active device at a time.
- **1 Driver → Active Device**: A driver must be linked to the device to receive campaign tracking payouts.

**Duplicate Prevention**:
- Transactional writes: When updating `assignedDeviceId` on a Vehicle, the system transactionally verifies the Device `vehicleId` is currently `null` or matches the target. Unique constraints on `assignedDeviceId` across the fleet.

**Transfer Handling**:
- If a device is moved to a new vehicle, it must first be unassigned (state transitions `ACTIVE` → `IN_STOCK` / `MAINTENANCE` → `ASSIGNED` to new vehicle). Hard unlinking strips `driverId` and `vehicleId` simultaneously to prevent ghost bindings.

## SECTION 5: HEARTBEAT SYSTEM

- **Heartbeat Interval**: 5 minutes (standard active ping rate).
- **Offline Threshold**: 15 minutes (3 missed pings) → Triggers status switch to `OFFLINE`.
- **Critical Threshold**: 24 hours without ping → Triggers investigative maintenance ticket.
- **Health Score Formula**: `(Successful Pings in last 24h / Expected Pings in 24h) * 100`. (e.g., 288 expected pings. 280 success = 97.2%).

## SECTION 6: CAMPAIGN DEPLOYMENT

**Deployment Flow**:
1. Campaign targets `territoryId`.
2. Engine queries `vehicles`/`devices` bound to `territoryId` where status is `ACTIVE`.
3. Campaign payload deployed to active devices via MQTT/IoT messaging.

**Tracking**:
- **Deployment Tracking**: Tracks which devices acknowledged the ad payload.
- **Success Tracking**: Tracks successful render telemetry per device.
- **Failure Tracking**: Tracks memory/download/render errors returned by the device.
- **Retry Strategy**: Exponential backoff. If download fails, retry after 5m, 15m, 30m, up to 3 times before flagging the device for poor connectivity/maintenance.

**Deployment Audit Logs**:
```typescript
interface DeploymentAudit {
  deploymentId: string;
  campaignId: string;
  territoryId: string;
  deviceId: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRY';
  failureReason?: string;
  deployedAt: Timestamp;
}
```
- **Audit retention policy**: 90 Days.
- **Retry tracking**: Appended incrementing event per retry.
- **Failure history**: Logged to identify systematic hardware failures.

## SECTION 7: DEVICE INVENTORY

**Inventory Tracking**:
Tracks all overarching counts of devices based on state:
- In Stock (Warehouse/HQ/Franchise reserve)
- Assigned (Pending install)
- Active (In the field, pinging)
- Offline (In the field, unresponsive)
- Maintenance (Undergoing repair)
- Retired (E-Waste)

**Inventory Dashboard**: HQ and Franchise views showing hardware flow, burn rate, and available stock levels.

**Inventory Reconciliation**:
- **Daily reconciliation job**: A scheduled cron runs an absolute count.
- **Compare**: Reads absolute values from the `devices` collection and compares against counters in the `deviceMetrics` collection.
- **Report**: Returns alerts for missing devices, duplicate assignments, inventory drift, and the final reconciliation status logging if numbers were repaired.

## SECTION 8: MAINTENANCE SYSTEM

- **Maintenance Ticket**: Auto-generated on `Critical Threshold` heartbeat failure or manual driver/franchise report.
- **Repair Workflow**: Ticket Open → Diagnosed → Parts Replaced / Software Flashed → Tested → Ticket Closed.
- **Replacement Workflow**: If unrepairable, device marked `RETIRED`. `Vehicle` requires new assignment from `IN_STOCK` inventory.
- **Audit Logging**: Every maintenance action appended to hardware lifecycle log (immutable track of serial numbers and replacement parts).

**Maintenance History Schema**:
```typescript
interface MaintenanceHistory {
  maintenanceId: string;
  deviceId: string;
  territoryId: string;
  issueType: string;
  actionTaken: string;
  technicianId: string;
  openedAt: Timestamp;
  closedAt?: Timestamp;
}
```
- **Retention policy**: Infinite (immutable log).
- **Audit requirements**: Each status change tracks timestamp and technician acting upon it.

## SECTION 9: FLEET MONITORING

**Key Metrics**:
- Active Vehicles (Total with an active, pinging device).
- Active Devices (Total devices online).
- Offline Devices (Total dark hardware requiring intervention).
- Fleet Health (Average Health Score of all active assigned devices).
- Deployment Success Rate (Percentage of active fleet successfully playing the current campaign).

**Fleet Health Formula**:
`FleetHealthScore = (ActiveDevices + OfflineDevices - HeartbeatFailures) / TotalDevices * 100`

**Thresholds**:
- **HEALTHY**: >95%
- **AT_RISK**: 85% to 95%
- **CRITICAL**: <85%

## SECTION 10: MATERIALIZED VIEWS

### `deviceMetrics`
```typescript
interface DeviceMetrics {
  territoryId: string;
  totalInventory: number;
  inStock: number;
  assigned: number;
  active: number;
  offline: number;
  maintenance: number;
  retired: number;
  averageHealthScore: number;
  updatedAt: string;
}
```
**Primary Key**:
`territoryId`

**Aggregation Sources**:
`devices`
`maintenanceHistory`

**Update Triggers**:
Device creation, Device assignment, Device status change.

**Refresh Strategy**:
Real-time increment + nightly absolute reconciliation.

### `fleetMetrics`
```typescript
interface FleetMetrics {
  territoryId: string;
  totalVehicles: number;
  activeVehicles: number; // Linked to an ACTIVE device
  inactiveVehicles: number; // Unlinked or linked to OFFLINE device
  updatedAt: string;
}
```
**Primary Key**:
`territoryId`

**Aggregation Sources**:
`vehicles`

**Update Triggers**:
Vehicle creation, Vehicle assignment change, Device status change.

**Refresh Strategy**:
Real-time increment + nightly absolute reconciliation.

### `deploymentMetrics`
```typescript
interface DeploymentMetrics {
  campaignId: string;
  territoryId: string;
  devicesTargeted: number;
  deploymentsSuccessful: number;
  deploymentsFailed: number;
  averageRenderRate: number;
  updatedAt: string;
}
```
**Primary Key**:
`campaignId` + `territoryId`

**Aggregation Sources**:
`deploymentAudit`
`devices`

**Update Triggers**:
Deployment deployment audit events (SUCCESS, FAILED).

**Refresh Strategy**:
Real-time increment + nightly absolute reconciliation.

## SECTION 11: SECURITY AUDIT

- **SUPER_ADMIN**: Full read/write over fleet configuration and hard assignments.
- **HQ_ADMIN**: Full operational control, inventory transferring.
- **HQ_SUPPORT**: Read-only tracking, ability to generate Maintenance Tickets.
- **FRANCHISE_OWNER**: Control over fleet mapping/assignments within their isolated assigned territories.
- **FRANCHISE_STAFF**: Operational control over maintenance ticket logging within assigned territories.

- **No driver device reassignment**: Drivers cannot manually change device IDs within their app. Hardware binding is strictly HQ/Franchise controlled.
- **No customer access**: Customers cannot query device status, only the abstracted campaign metrics.

**Cross-Franchise Protection**:
A franchise may only read or mutate records where:
`resource.data.franchiseId == request.auth.token.franchiseId`

Any cross-franchise access must be denied. This rule applies explicitly to:
- `devices`
- `vehicles`
- `maintenance tickets`
- `deployment logs`
- `fleet metrics`

## SECTION 12: RISK AUDIT

- **Duplicate assignments**: Database transactions and strict security rules enforcing `null` checks previous to linking mitigate 1:N ghost bindings.
- **Ghost devices**: Fixed via heartbeat timeouts actively stripping `ACTIVE` status after 15m constraint.
- **Offline abuse**: Mitigated by stopping campaign revenue generation/settlement allocation to devices actively marked `OFFLINE`.
- **Inventory mismatch**: Strict state machines on IoT inventory ensure a device cannot be `ACTIVE` if it was supposedly marked `RETIRED`.
- **Deployment failures**: Exponential backoff strategy handles intermittent 4G/LTE drops cleanly. 
- **Fleet drift**: Reconciliations occur daily to ensure the `fleetMetrics` exactly line up with raw fleet query totals.

## FINAL CLASSIFICATION

- SECTION 1 DEVICE SCHEMA: APPROVED
- SECTION 2 VEHICLE SCHEMA: APPROVED
- SECTION 3 DEVICE LIFECYCLE: APPROVED
- SECTION 4 ASSIGNMENT ENGINE: APPROVED
- SECTION 5 HEARTBEAT SYSTEM: APPROVED
- SECTION 6 CAMPAIGN DEPLOYMENT: APPROVED
- SECTION 7 DEVICE INVENTORY: APPROVED
- SECTION 8 MAINTENANCE SYSTEM: APPROVED
- SECTION 9 FLEET MONITORING: APPROVED
- SECTION 10 MATERIALIZED VIEWS: APPROVED
- SECTION 11 SECURITY AUDIT: APPROVED
- SECTION 12 RISK AUDIT: APPROVED
