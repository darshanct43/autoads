# Phase 4 Architecture: Territory Command Center

## 1. Firestore Collections Used
- \`territories\`: Core configuration for each territory.
- \`franchises\`: Franchise partner entity details and territory assignments.
- \`territoryMetrics\`: Aggregated roll-up documents containing real-time counters and stats per territory.
- \`settlements\`: Financial settlement states between HQ and Franchises.
- \`drivers\`: Read-only queries for drill-down views (metrics handled via \`territoryMetrics\`).
- \`campaigns\`: Read-only queries for campaign status per territory.
- \`supportTickets\`: Read-only drill-downs for issues.
- \`workers\`: Administrative and operational staff.

## 2. Required Indexes
To power the HQ dashboards efficiently, the following composite indexes will be required in \`firestore.indexes.json\`:
- \`territoryMetrics\`: \`territoryId\` (ASC), \`updatedAt\` (DESC)
- \`drivers\`: \`territoryId\` (ASC), \`status\` (ASC)
- \`campaigns\`: \`targetTerritoryId\` (ASC), \`status\` (ASC)
- \`supportTickets\`: \`territoryId\` (ASC), \`status\` (ASC)
- \`settlements\`: \`territoryId\` (ASC), \`status\` (ASC), \`createdAt\` (DESC)

## 3. TerritoryMetrics Schema Review
The \`territoryMetrics\` collection acts as a materialized view to prevent expensive COUNT() and SUM() operations.
\`\`\`typescript
interface TerritoryMetrics {
  territoryId: string; // Document ID (e.g., 'T-BENGALURU-URBAN')
  managedBy: 'HQ' | 'FRANCHISE';
  franchiseId: string | null;
  drivers: {
    total: number;
    active: number;
    inactive: number;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
  };
  revenue: {
    gross: number;
    hqShare: number;
    franchiseShare: number;
  };
  support: {
    openTickets: number;
    resolvedTickets: number;
  };
  workforce: {
    totalWorkers: number;
    supportStaff: number;
    operationsStaff: number;
  };
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  lastActivityAt: Timestamp;
  updatedAt: Timestamp;
}
\`\`\`

## 4. Aggregation Strategy
- **Event-Driven Rollups**: Use Cloud Functions triggers (onCreate, onUpdate, onDelete) on core collections (\`drivers\`, \`campaigns\`, \`payments\`, \`supportTickets\`) to atomically increment/decrement the corresponding fields in \`territoryMetrics\` using Firestore \`FieldValue.increment()\`.
- **Financial Immutability**: Revenue metrics should only increment upon finalized successful payments.
- **Batch Backfills**: A periodic scheduled background task will reconcile \`territoryMetrics\` once every 24h to fix any drift caused by missed triggers.

## 5. Real-Time Update Strategy
- **Frontend Subscriptions**: The Admin UI will subscribe strictly to the \`territoryMetrics\` collection using \`onSnapshot\`. This provides a live updating dashboard without querying thousands of raw \`drivers\` or \`campaigns\` documents.
- **Drill-down Queries**: When HQ clicks into a specific territory metric (e.g., "5 Open Tickets"), the UI will execute a direct query on the raw \`supportTickets\` collection filtered by \`territoryId\`.

## 6. Dashboard Card Structure
Located inside the existing Admin Portal (\`Admin/Dashboard\` or \`Admin/Territories\` route):
- **Global Overview Strip**: High-level aggregated HQ stats across all territories.
- **Territory Grid/Table View**: Sortable list of all territories showing Health, Managed By, and Franchise assignment.
- **Territory Detail View (Cards)**:
  - **Overview Card**: Territory ID, Manager, Status Pills.
  - **Workforce Card**: Drivers (Pie chart active/inactive), Workers.
  - **Campaigns Card**: Active vs. Completed timelines.
  - **Financial Card**: Revenue generation, Split ratios, Pending Settlements.
  - **Operational Card**: Open Support Tickets.

## 7. Risk Assessment
- **Write Contention**: High frequency updates (e.g., GPS pings, impressions) must NOT update \`territoryMetrics\`. Only state changes (driver verified, campaign launched) trigger updates to avoid reaching the 1 write/second limit on a single metric document.
- **Data Drift**: Cloud functions occasionally fail or retry out of order. Relying purely on increments is risky over long periods. *Mitigation: Provide a manual or nightly "Recalculate Metrics" sync script.*
- **Cost Accumulation**: Directly querying raw documents across all territories for a dashboard will result in massive read costs. *Mitigation: Strict adherence to the `territoryMetrics` aggregation pattern.*

## 8. Files Requiring Modification
- \`src/types.ts\`: Export new \`TerritoryMetrics\` schema interfaces.
- \`src/config/navigation.ts\` or equivalent: Add routes for the Command Center.
- \`src/pages/admin/TerritoryCommandCenter.tsx\`: Main dashboard view.
- \`src/pages/admin/components/MetricCard.tsx\`: Reusable UI components.
- \`src/pages/admin/components/TerritoryTable.tsx\`: Grid layout for territories.
- Cloud functions or API routes to handle metric aggregations (if using backend webhooks or Cloud Functions instead of client-side tallying).
