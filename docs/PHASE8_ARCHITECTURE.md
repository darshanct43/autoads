# Phase 8 Architecture: AutoAds HQ Monitoring & Operations Center

## SECTION 1: HQ DASHBOARD LAYOUT

### 1. Executive Overview
- **Purpose**: High-level system-wide health and revenue trajectory for leadership.
- **KPIs**: Overall Revenue, Active Franchises, Total Active Drivers, Settlement Success Rate.
- **Data Source**: Global materialized view (`globalMetrics`).
- **Refresh Strategy**: Real-time snapshot stream (`onSnapshot`).

### 2. Territory Monitoring
- **Purpose**: Operational health check across all registered territories.
- **KPIs**: Health Status distribution, Open Tickets by territory, Active campaigns/drivers per territory.
- **Data Source**: `territoryMetrics`.
- **Refresh Strategy**: Real-time snapshot stream.

### 3. Franchise Monitoring
- **Purpose**: Manage and oversee franchise partner performance and compliance.
- **KPIs**: Active Franchises, Suspended, Terminated, Revenue Leaderboard, Backlogs.
- **Data Source**: `franchiseMetrics`, `franchises`.
- **Refresh Strategy**: Real-time snapshot stream.

### 4. Driver Operations
- **Purpose**: Drill-down into the driver workforce layer.
- **KPIs**: Total Drivers, Active, Inactive, Pending Approval, Device Assignment states.
- **Data Source**: `driverMetrics`.
- **Refresh Strategy**: Real-time snapshot stream.

### 5. Campaign Operations
- **Purpose**: Oversee advertiser campaigns globally.
- **KPIs**: Draft, Pending Approval, Active, Completed, Rejected, Expired.
- **Data Source**: `campaignMetrics`.
- **Refresh Strategy**: Real-time snapshot stream.

### 6. Settlement Monitoring
- **Purpose**: Financial clearance performance and backlog tracking.
- **KPIs**: Pending, Processing, Settled, Failed amounts and counts.
- **Data Source**: `settlementMetrics`.
- **Refresh Strategy**: Real-time snapshot stream.

### 7. Revenue Monitoring
- **Purpose**: Granular financial breakdowns.
- **KPIs**: Gross Revenue, HQ Share, Franchise Share, Revenue Growth.
- **Data Source**: `globalMetrics` and `territoryMetrics`.
- **Refresh Strategy**: Daily aggregation / real-time for current period.

### 8. Support Monitoring
- **Purpose**: Tracking operational overhead and customer/driver support SLAs.
- **KPIs**: Open Tickets, Resolved, Escalated, SLA Breaches.
- **Data Source**: `supportMetrics`.
- **Refresh Strategy**: Real-time snapshot stream.

### 9. Device Monitoring
- **Purpose**: Hardware status tracking across the fleet.
- **KPIs**: Online, Offline, Provisioning Failures, Heartbeat Failures.
- **Data Source**: `deviceMetrics`.
- **Refresh Strategy**: Polling / Real-time snapshot stream.

### 10. System Health
- **Purpose**: Infrastructure and backend tracking.
- **KPIs**: API Error rates, Backend function health, Webhook failures.
- **Data Source**: Stackdriver/GCP Cloud Monitoring integrations (external to Firestore UI).
- **Refresh Strategy**: 1m polling.

---

## SECTION 2: KPI DEFINITIONS

- **Active Driver Rate**: `(Active Drivers / Total Registered Drivers) * 100`. Source: `driverMetrics`. Refresh: Real-time.
- **Driver Approval Rate**: `(Drivers Approved / Total Applications Processed in Period) * 100`. Source: `driverMetrics`. Refresh: Daily.
- **Campaign Completion Rate**: `(Completed Campaigns / Total Started Campaigns) * 100`. Source: `campaignMetrics`. Refresh: Real-time.
- **Settlement Success Rate**: `(Settled Payouts / (Settled + Failed)) * 100`. Source: `settlementMetrics`. Refresh: Real-time.
- **Territory Health Score**: Weighted aggregate of SLA Compliance, Active Driver performance, and operational blocks. Source: `territoryMetrics`. Refresh: Hourly backend cron.
- **Franchise Growth Rate**: `(Current Month Revenue - Last Month Revenue) / Last Month Revenue * 100`. Source: `franchiseMetrics`. Refresh: Monthly.
- **Revenue Growth Rate**: `(Current Month Revenue - Last Month Revenue) / Last Month Revenue * 100`. Source: `globalMetrics`. Refresh: Daily.
- **Support SLA Compliance**: `(Tickets Resolved within SLA / Total Tickets) * 100`. Source: `supportMetrics`. Refresh: Real-time.
- **Device Uptime %**: `(Online Devices / Total Provisioned Devices) * 100`. Source: `deviceMetrics`. Refresh: 5m polling.

---

## SECTION 3: TERRITORY COMMAND CENTER

**Territory Overview Grid**
Displays a card or table layout with the following columns:
- `territoryId`
- `territoryName`
- `franchiseId` (or 'HQ')
- `healthStatus`
- `driversActive`
- `campaignsActive`
- `openTickets`
- `monthlyRevenue`
- `pendingSettlements`

**Classification Rules (`healthStatus`):**
- **HEALTHY**: `openTickets < 10` AND `Active Driver Rate > 70%` AND `Offline Devices < 5%`.
- **AT_RISK**: `openTickets >= 10` OR `Active Driver Rate <= 50%` OR `Offline Devices >= 5%`.
- **CRITICAL**: `openTickets > 50` OR `Active Driver Rate < 30%` OR `Failed Settlements > 0` OR `Offline Devices > 15%`.

---

## SECTION 4: FRANCHISE MONITORING

**Dashboard widgets:**
- Total Franchises, Active Franchises, Suspended Franchises, Terminated Franchises.
- Revenue Leaderboard (Top performing franchises by Gross Revenue).
- Settlement Backlog (Sum of Pending settlements).
- Support Backlog (Open tickets assigned to franchise).

**Aggregation Strategy**: Listen to `franchiseMetrics`. Triggers update global `franchiseMetrics` whenever a franchise changes state or hits revenue/support milestones.

---

## SECTION 5: DRIVER OPERATIONS

**Widgets**:
- Total Drivers, Active Drivers, Inactive Drivers, Pending Approval.
- Device Assigned, No Device Assigned.

**Required drilldowns**: Click on "Pending Approval" to view list of `drivers` filtered by `status == 'PENDING'`. Click "No Device Assigned" to view drivers without active device linkages. Limit drilldown queries to avoid high read costs.

---

## SECTION 6: CAMPAIGN OPERATIONS

**Widgets**:
- Draft, Pending Approval, Active, Completed, Rejected, Expired.
- Revenue generated (Total Gross for actively completing campaigns).
- Campaign performance metrics (CPM averages, daily impressions).

---

## SECTION 7: SETTLEMENT MONITORING

**Widgets**:
- Counters for Pending, Processing, Settled, Failed.
- Settlement Success Rate (%).
- Settlement Aging Report (Number of days pending).
- Revenue awaiting payout.

---

## SECTION 8: SUPPORT OPERATIONS

**Widgets**:
- Open Tickets, Resolved Tickets, Escalated Tickets, SLA Breaches.
- Support workload by territory (Bar chart).

---

## SECTION 9: DEVICE MONITORING

**Widgets**:
- Online Devices, Offline Devices.
- Provisioning Failures, Heartbeat Failures.
- **Device Health Score Formula**: `((Online Devices - Heartbeat Failures) / Total Provisioned Devices) * 100`.

---

## SECTION 10: MATERIALIZED VIEW STRATEGY

**Design**: Dashboards MUST rely on strictly typed, backend-aggregated metadata documents.

### 1. territoryMetrics
```typescript
interface TerritoryMetrics {
  territoryId: string;
  territoryName: string;
  franchiseId: string | null;
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  drivers: {
    total: number;
    active: number;
    inactive: number;
    pendingApproval: number;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    rejected: number;
  };
  settlements: {
    pending: number;
    processing: number;
    settled: number;
    failed: number;
  };
  support: {
    open: number;
    resolved: number;
    escalated: number;
  };
  revenue: {
    gross: number;
    hqShare: number;
    franchiseShare: number;
  };
  devices: {
    online: number;
    offline: number;
  };
  updatedAt: string;
}
```
- **Primary key**: `territoryId`
- **Update triggers**: Document write operations on `drivers`, `campaigns`, `settlements`, `supportTickets`, `devices` scoped to the specific `territoryId`.
- **Aggregation source**: Raw localized collections.
- **Refresh strategy**: Real-time increment via Cloud Functions, paired with a nightly absolute-count reconciliation cron.

### 2. franchiseMetrics
```typescript
interface FranchiseMetrics {
  franchiseId: string;
  franchiseName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  territoriesAssigned: number;
  drivers: {
    total: number;
    active: number;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
  };
  revenue: {
    gross: number;
    pending: number;
    settled: number;
  };
  support: {
    openTickets: number;
  };
  healthScore: number;
  updatedAt: string;
}
```
- **Primary key**: `franchiseId`
- **Update triggers**: Aggregated roll-ups from assigned `territoryMetrics`.
- **Aggregation source**: `territoryMetrics` mapping to the `franchiseId`.
- **Refresh strategy**: Triggered when a child `territoryMetrics` document updates.

### 3. driverMetrics
```typescript
interface DriverMetrics {
  territoryId: string; // or 'global'
  totalDrivers: number;
  activeDrivers: number;
  inactiveDrivers: number;
  pendingApproval: number;
  deviceAssigned: number;
  deviceUnassigned: number;
  driverApprovalRate: number;
  activeDriverRate: number;
  updatedAt: string;
}
```
- **Primary key**: `territoryId` (or single `global` document)
- **Update triggers**: Create/Update/Delete operations on the `drivers` collection.
- **Aggregation source**: `drivers` collection.
- **Refresh strategy**: Real-time via Cloud Function triggers (increment/decrement), hourly rate calculation.

### 4. campaignMetrics
```typescript
interface CampaignMetrics {
  territoryId: string; // or 'global'
  draft: number;
  pendingApproval: number;
  active: number;
  completed: number;
  rejected: number;
  expired: number;
  grossRevenue: number;
  averageCPM: number;
  totalImpressions: number;
  campaignCompletionRate: number;
  updatedAt: string;
}
```
- **Primary key**: `territoryId` (or single `global` document)
- **Update triggers**: Create/Update/Delete operations on the `campaigns` collection.
- **Aggregation source**: `campaigns` collection.
- **Refresh strategy**: Real-time via Cloud Function triggers, nightly average calculations.

### 5. settlementMetrics
```typescript
interface SettlementMetrics {
  territoryId: string; // or 'global'
  pending: number;
  processing: number;
  settled: number;
  failed: number;
  pendingRevenue: number;
  settledRevenue: number;
  settlementSuccessRate: number;
  oldestPendingSettlementAgeDays: number;
  updatedAt: string;
}
```
- **Primary key**: `territoryId` (or single `global` document)
- **Update triggers**: State changes on `settlements` documents.
- **Aggregation source**: `settlements` collection.
- **Refresh strategy**: Real-time increment via triggers, combined with nightly aging checks.

### 6. deviceMetrics
```typescript
interface DeviceMetrics {
  territoryId: string; // or 'global'
  totalDevices: number;
  online: number;
  offline: number;
  heartbeatFailures: number;
  provisioningFailures: number;
  deviceHealthScore: number;
  updatedAt: string;
}
```
- **Primary key**: `territoryId` (or single `global` document)
- **Update triggers**: IoT Hub/Device Registry status changes and error logs.
- **Aggregation source**: `devices` state.
- **Refresh strategy**: 5-minute polling updates due to high-frequency heartbeat noise.

---

## SECTION 11: READ COST ANALYSIS

**Why dashboards must never query raw collections directly**:
- If HQ wants to view total drivers across an entire environment, querying `drivers` retrieves every document, charging 1 Read per driver. 100,000 drivers = 100,000 reads on every page load. Dashboards must aggregate to survive at scale.

**Estimates (Querying raw vs Materialized View)**:
- **10 territories (Assume 1k docs/territory)**: Raw: 10,000 reads. View: 10 reads.
- **100 territories (Assume 1k docs/territory)**: Raw: 100,000 reads. View: 100 reads.
- **1000 territories (Assume 1k docs/territory)**: Raw: 1,000,000 reads. View: 1,000 reads.

**Mitigation strategy**:
Dashboards MUST exclusively query single documents from `-Metrics` collections. Drill-down queries to raw collections are strictly paginated with `limit()` constraints.

---

## SECTION 12: ALERT SYSTEM

**Alerts for**:
- Offline Devices
- Failed Settlements
- High Support Backlog
- Revenue Drop
- Campaign Failures
- Driver Churn

**Severity Levels**:
- **INFO**: Campaign Completed, Settlement Scheduled.
- **WARNING**: Revenue Drop (>10% WoW), Offline Devices spike, SLA approaching breach.
- **CRITICAL**: Failed Settlements, High Support Backlog (>100 open in territory), Heartbeat cascade failure.

---

## SECTION 13: SECURITY AUDIT

**Verification**:
- `SUPER_ADMIN` access: Full access globally.
- `HQ_ADMIN` access: Full access globally (restrict destructive).
- `HQ_SUPPORT` access: Access restricted to Support, limited Driver Operations, and read-only Territory metrics.
- No franchise cross-access: Security rules prevent Franchise A from querying Franchise B's metrics.
- No customer access: Explictly blocked from HQ panels and metrics.
- No driver access: Explictly blocked from HQ panels and metrics.

---

## SECTION 14: RISK ASSESSMENT

- **Read Cost Explosion**: Mitigated by enforcing Materialized Views for all dashboard counts.
- **Aggregation Drift**: Mitigated by a nightly reconciliation cron job that runs a full count to resync `FieldValue.increment()` discrepancies.
- **Alert Spam**: Mitigated by alert batching, debouncing, and rate-limiting critical notifications.
- **Metric Corruption**: Mitigated by securing all `*Metrics` collections with `allow write: if false` to prevent client-side tampering. Only backend admin SDKs can update them.
- **Dashboard Abuse**: Mitigated by pagination limits on raw drill-down queries.

---

## FINAL CLASSIFICATION

- SECTION 1 HQ DASHBOARD LAYOUT: APPROVED
- SECTION 2 KPI DEFINITIONS: APPROVED
- SECTION 3 TERRITORY COMMAND CENTER: APPROVED
- SECTION 4 FRANCHISE MONITORING: APPROVED
- SECTION 5 DRIVER OPERATIONS: APPROVED
- SECTION 6 CAMPAIGN OPERATIONS: APPROVED
- SECTION 7 SETTLEMENT MONITORING: APPROVED
- SECTION 8 SUPPORT OPERATIONS: APPROVED
- SECTION 9 DEVICE MONITORING: APPROVED
- SECTION 10 MATERIALIZED VIEW STRATEGY: APPROVED
- SECTION 11 READ COST ANALYSIS: APPROVED
- SECTION 12 ALERT SYSTEM: APPROVED
- SECTION 13 SECURITY AUDIT: APPROVED
- SECTION 14 RISK ASSESSMENT: APPROVED
