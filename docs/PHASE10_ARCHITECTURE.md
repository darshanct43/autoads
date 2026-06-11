# Phase 10 Architecture: Advertiser Analytics & Business Intelligence Platform

## OBJECTIVE
Design the AutoAds Advertiser Analytics & Business Intelligence Platform to allow advertisers, franchises, and HQ to measure campaign performance, ROI, reach, impressions, revenue, engagement, and territory effectiveness.

---

## SECTION 1: ANALYTICS DATA MODEL

```typescript
interface CampaignAnalytics {
  campaignId: string;
  advertiserId: string;
  territoryIds: string[];
  impressions: number;
  reach: number;
  spend: number;
  cpi: number; // Cost Per Impression
  effectiveCpm: number;
  utilizationRate: number;
  uptimeRate: number;
  completionRate: number;
  roiPercentage: number;
  updatedAt: string;
}

interface TerritoryAnalytics {
  territoryId: string;
  franchiseId: string | null;
  totalRevenue: number;
  totalImpressions: number;
  totalReach: number;
  campaignCount: number;
  activeDrivers: number;
  deviceUtilization: number;
  settlementVolume: number;
  growthRate: number;
  updatedAt: string;
}

interface AdvertiserAnalytics {
  advertiserId: string;
  activeCampaigns: number;
  completedCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  averageRoi: number;
  bestPerformingTerritoryId: string;
  updatedAt: string;
}

interface DeviceAnalytics {
  deviceId: string;
  territoryId: string;
  impressionsDelivered: number;
  campaignDeliveryRate: number;
  deviceUptime: number;
  contentDeliveryFailures: number;
  revenueContribution: number;
  updatedAt: string;
}

interface RevenueAnalytics {
  periodId: string; // e.g., 'YYYY-MM'
  territoryId: string | 'global';
  grossRevenue: number;
  hqShare: number;
  franchiseShare: number;
  pendingSettlements: number;
  settledRevenue: number;
  revenueGrowthRate: number;
  updatedAt: string;
}
```

---

## SECTION 2: CAMPAIGN KPIs

- **Impressions**: Total number of times the ad was rendered and verified on a device screen.
- **Reach**: `Impressions * PopulationDensityMultiplier` (Estimated uniquely exposed individuals).
- **Average Daily Impressions**: `Total Impressions / Campaign Active Days`.
- **Completion Rate**: `(Days Campaign Was Active / Planned Campaign Duration) * 100`.
- **Campaign Utilization**: `(Active Deployments / Requested Fleet Size) * 100`.
- **Campaign Uptime**: `(Uptime of targeted devices playing the ad / Total expected playback time) * 100`.
- **Cost Per Impression (CPI)**: `Total Campaign Spend / Total Impressions`.
- **Effective CPM**: `(Total Campaign Spend / Total Impressions) * 1000`.
- **Revenue Per Campaign**: `Total Advertiser Spend for the campaign`.
- **ROI %**: `((Estimated Value Generated - Total Spend) / Total Spend) * 100` (Value generated typically supplied by advertiser attribution integration).

---

## SECTION 3: ADVERTISER DASHBOARD

**Widgets:**
- **Active Campaigns**: Count of currently running campaigns.
- **Completed Campaigns**: Historical count.
- **Total Impressions**: Global rolling sum of verified views.
- **Estimated Reach**: Unique audience estimated size.
- **Spend**: Total localized currency spend.
- **ROI**: Computed metric on performance return.
- **Top Territories**: Bar chart mapping impressions/clicks by geography.
- **Best Performing Campaigns**: List sorting campaigns by lowest Effective CPM.
- **Trend Graphs**: Line chart showing daily impressions vs spend.

---

## SECTION 4: HQ ANALYTICS DASHBOARD

**Widgets:**
- **Revenue Trends**: Gross revenue month-over-month.
- **Campaign Trends**: Volume of campaigns created and completed.
- **Territory Performance**: Matrix of territories sorted by revenue and uptime.
- **Franchise Performance**: Matrix of franchises sorted by fleet health and sales.
- **Advertiser Retention**: Percentage of advertisers launching >1 campaign.
- **Campaign Success Rate**: Percentage of campaigns completing without early termination or major SLAs breaches.

---

## SECTION 5: TERRITORY ANALYTICS

**Metrics:**
- **Revenue**: Gross ad revenue generated entirely within the boundary.
- **Impressions**: Localized screen render counts.
- **Reach**: Audience penetration.
- **Campaign Count**: Volume of overlapping ad buys.
- **Active Drivers**: Telemetry pinging workforce.
- **Device Utilization**: `(Active Devices / Total Deployed Hardware) * 100`.
- **Settlement Volume**: Currency transferred.
- **Growth Rate**: Month-over-month localized revenue expansion.

---

## SECTION 6: FRANCHISE ANALYTICS

**Metrics:**
- **Revenue**: Derived HQ vs Franchise share cuts.
- **Campaign Performance**: Viewability and SLA stats inside the franchise domain.
- **Driver Performance**: Shift length and uptime averages.
- **Settlement Performance**: Turnaround time and failure rates for payouts.
- **Support Burden**: Ticket count per $1000 earned.
- **Growth Trends**: Trajectory modeling for future quarter projections.

---

## SECTION 7: DEVICE ANALYTICS

**Metrics:**
- **Impressions Per Device**: Average output of a single hardware unit.
- **Campaign Delivery Rate**: Success coefficient for ad payload syncs.
- **Device Uptime**: Hardware online vs offline %.
- **Content Delivery Failures**: Count of downloaded/rendered media errors.
- **Device Revenue Contribution**: `Gross Revenue / Active Devices` (yield per hardware).

---

## SECTION 8: ATTRIBUTION MODEL

- **How impressions are counted**: 1 verified media playback completion telemetry event = 1 impression. Telemetry must be digitally signed by the device.
- **How reach is estimated**: Base impressions are divided by an empirical duplication factor and multiplied by the average vehicle occupancy + pedestrian peripheral view coefficients.
- **How duplicate viewers are handled**: Stochastic decay model applied per square kilometer using time-decay adjustments to prevent over-counting stationary vehicles.
- **How offline devices affect analytics**: Hard zero-trust policy. Blackout periods yield exactly 0 impressions. No extrapolation or synthetic estimating is permitted while hardware is offline.

---

## SECTION 9: MATERIALIZED VIEW STRATEGY

### 1. `campaignAnalytics`
- **Primary Key**: `campaignId`
- **Aggregation Sources**: `deploymentAudit`, `deviceTelemetry`, `campaigns`
- **Update Triggers**: Ingested valid screen telemetry events.
- **Refresh Strategy**: Micro-batch streaming updates (every 5 mins). Nightly hard aggregation.

### 2. `territoryAnalytics`
- **Primary Key**: `territoryId`
- **Aggregation Sources**: `campaignAnalytics`, `settlements`, `devices`
- **Update Triggers**: Updates on underlying child analytics.
- **Refresh Strategy**: Real-time bounded increment. Nightly full recalculation.

### 3. `advertiserAnalytics`
- **Primary Key**: `advertiserId`
- **Aggregation Sources**: `campaignAnalytics`, `campaigns`
- **Update Triggers**: Campaign completion, Daily telemetry rollups.
- **Refresh Strategy**: Daily asynchronous cron.

### 4. `deviceAnalytics`
- **Primary Key**: `deviceId`
- **Aggregation Sources**: `deploymentAudit`, `deviceTelemetry`, `hardwareLogs`
- **Update Triggers**: Fired upon every batch upload from the physical hardware.
- **Refresh Strategy**: Continuous insertion logic. Nightly index tuning.

### 5. `revenueAnalytics`
- **Primary Key**: `periodId` + `territoryId`
- **Aggregation Sources**: `settlements`, `payouts`, `campaigns`
- **Update Triggers**: Campaign completion financial locks, Settlement generations.
- **Refresh Strategy**: Real-time upon state change in the core financial records.

---

## SECTION 10: REPORTING SYSTEM

**Support:**
- **Daily Reports**: Auto-generated performance summaries available in the dashboard cache.
- **Weekly Reports**: Automated email digests for advertisers and franchisees.
- **Monthly Reports**: Full financial reconciliation statements aligned with settlement cycles.
- **Quarterly Reports**: Macro-trends and territory expansion PDFs for HQ.
- **CSV Export**: Unpaginated raw tabular data export accessible via secure signed URL.
- **Excel Export**: Formatted spreadsheets with embedded macro pivot tables.
- **Scheduled Reports**: User-configurable crons generating any chart view and emailing it out.

---

## SECTION 11: SECURITY AUDIT

- **Advertisers**: Enforced rule `resource.data.advertiserId == request.auth.uid`. Purely restricted to own campaigns and own analytics.
- **Franchises**: Enforced rule `resource.data.franchiseId == request.auth.token.franchiseId`. Restricted exclusively to assigned territories.
- **HQ**: `SUPER_ADMIN` and `HQ_ADMIN` provided global analytics keys.
- **Prevent Cross-Advertiser Leakage**: All analytic queries require hard `advertiserId` indexing to guarantee tenant isolation.

---

## SECTION 12: RISK AUDIT

- **Metric Inflation**: *Risk* - Device faking telemetry. *Mitigation* - Hardware cryptographic signing and strict payload schema validation before ingestion.
- **Duplicate Impressions**: *Risk* - Resending the same batch. *Mitigation* - Idempotent telemetry ingestion using UUID deduplication layers.
- **Revenue Misreporting**: *Risk* - Analytic drift affecting payouts. *Mitigation* - Strict separation of `*Analytics` from core financial `payments` & `settlements` which utilize exact integer math.
- **Analytics Drift**: *Risk* - Incremental counter drift. *Mitigation* - Absolute nightly reconciliation.
- **Cross-Tenant Leakage**: *Risk* - Bad queries exposing competitors. *Mitigation* - Hardcoded Firestore security rules denying reads without tenant identity matches.
- **Report Abuse**: *Risk* - Costly massive exports crashing DB. *Mitigation* - Offline BigQuery extraction routing for CSVs. Dashboard rate limits.

---

## FINAL RESULT

- SECTION 1 ANALYTICS DATA MODEL: APPROVED
- SECTION 2 CAMPAIGN KPIs: APPROVED
- SECTION 3 ADVERTISER DASHBOARD: APPROVED
- SECTION 4 HQ ANALYTICS DASHBOARD: APPROVED
- SECTION 5 TERRITORY ANALYTICS: APPROVED
- SECTION 6 FRANCHISE ANALYTICS: APPROVED
- SECTION 7 DEVICE ANALYTICS: APPROVED
- SECTION 8 ATTRIBUTION MODEL: APPROVED
- SECTION 9 MATERIALIZED VIEW STRATEGY: APPROVED
- SECTION 10 REPORTING SYSTEM: APPROVED
- SECTION 11 SECURITY AUDIT: APPROVED
- SECTION 12 RISK AUDIT: APPROVED
