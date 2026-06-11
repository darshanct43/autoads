# Phase 5 Architecture: Franchise Revenue Sharing Engine

## 1. Settlement Workflow & Lifecycle
The settlement workflow defines the lifecycle of clearing revenue from closed campaigns or settlement periods between HQ and Franchise partners.

Required states:
- **PENDING**: Settlement generated but payout not initiated.
- **PROCESSING**: Payout initiated.
- **SETTLED**: Payout completed successfully.
- **FAILED**: Payout failed, reversed, rejected, or expired.

## 2. Revenue Calculation Workflow
1. **Advertiser Payment**: Advertiser pays for a campaign. A `payment` document is created.
2. **Campaign Execution & Completion**: The campaign runs in a specific territory. Upon completion, the revenue is locked.
3. **Split Calculation Formula**:
   - `grossRevenue = total advertiser payment`
   - `franchiseShare = floor(grossRevenue * franchisePercentage / 100)`
   - `hqShare = grossRevenue - franchiseShare`
   
   Validation constraint: `franchiseShare + hqShare` must equal `grossRevenue`.
   **Important:** Use minimum currency units only. Never use floating-point arithmetic.
4. **Allocation**: The split amounts are added to the `territoryMetrics`.

## 3. Settlement Schema
```typescript
interface Settlement {
  settlementId: string;
  territoryId: string;
  franchiseId: string | null;
  grossRevenue: number;
  franchiseShare: number;
  hqShare: number;
  status: 'PENDING' | 'PROCESSING' | 'SETTLED' | 'FAILED';
  settlementPeriodStart: string;
  settlementPeriodEnd: string;
  paymentReferenceIds: string[];
  createdAt: string;
  processedAt?: string;
  settledAt?: string;
  failedAt?: string;
  failureReason?: string;
}
```

## 4. Firestore Collections Used
- `payments`: Source of truth for gross revenue influx.
- `campaigns`: Defines the origin of the revenue and its territory association.
- `territories`: Determines the management type (HQ vs. Franchise).
- `franchises`: Holds the specific revenue split configuration (`franchisePercentage`, `hqPercentage`).
- `settlements`: The core document generated to orchestrate payouts.

## 5. Required Indexes
- `status` (ASC), `territoryId` (ASC)
- `status` (ASC), `franchiseId` (ASC)
- `settlementPeriodStart` (ASC), `settlementPeriodEnd` (ASC)
- `territoryId` (ASC), `settlementPeriodEnd` (DESC)

*Additionally for operational dashboards/automation:*
- `payments`: `campaignId` (ASC), `status` (ASC)
- `campaigns`: `targetTerritoryId` (ASC), `status` (ASC)

## 6. Automation & Verification Rules
**Trigger Strategy:** Settlement Cycle Closed (Monthly/Weekly/Scheduled) is chosen because per-campaign settlements result in too many micro-transactions and high friction for accounting. Batch closures scale much better.

**Every settlement generation MUST verify:**
- `territoryId` exists
- Percentage totals = 100
- `grossRevenue >= 0`
- Settlement not already generated
- Campaign not already settled

## 7. Fraud Prevention & Risk Controls
- **Duplicate Payout Protection**: 
  - Required fields: `payoutId`, `settlementId`, `payoutReference`
  - Rules: One settlement → One payout only. 
  - Unique Index Logic: `settlementId` + `payoutReference`. If payout already exists, reject execution.
- **Negative Revenue Protection**: Assured by the explicit `grossRevenue >= 0` verification check.
- **Manual Settlement Modification**: Blocked by security rules; `Settlement` fields must be read-only to clients.
- **Settlement Replay Attacks**: Prevented by transactional checks indicating `campaign not already settled` and `settlement not already generated` (using idempotency keys).

## 8. Dashboard Requirements
**HQ Dashboard Required Metrics:**
- Pending Settlements
- Processing Settlements
- Failed Settlements
- Settled Revenue
- HQ Revenue
- Settlement Success Rate

**Franchise Dashboard Required Metrics:**
- Territory Revenue
- Pending Revenue
- Settlement History

