# Agent Instructions and Project Rules

## Development Lock: Driver Portal

**Status**: LOCKED
**Lock Password**: driverhospital
**Development Status**: COMPLETE
**Production Status**: READY

**Verified Modules**:
- Registration
- Login
- Agreement Acceptance
- Aadhaar Upload
- Driving License Upload
- Selfie Capture
- Digital Signature
- Agreement Vault
- Agreement PDF Generation
- Embedded Selfie in PDF
- Embedded Signature in PDF
- Driver Verification Workflow
- Wallet System
- Credit Assignment
- Withdrawal Requests
- Payout Processing
- Driver Dashboard
- Verification Status System

**Lock Instructions**:
1. Freeze Driver Portal development.
2. No new features may be added to Driver Portal.
3. No UI redesigns may be performed on Driver Portal.
4. No Firestore schema modifications related to the Driver Portal.
5. No workflow changes.
6. No business logic changes on Driver Portal integrations.

**Allowed After Lock**:
- Security fixes
- Bug fixes
- Performance optimization
- Production incident fixes

*Any future modification request requires explicit unlock authorization using the lock password before changes are permitted.*

## Development Lock: Impact Module

**Status**: LOCKED
**Development Status**: COMPLETE
**Production Status**: READY

**Verification Passed**:
- Mobile playback
- Refresh persistence
- Logout/Login persistence
- AWS S3 media loading
- CloudFront delivery
- Production deployment test

**Root Cause Fixed**:
- Video source binding corrected
- CORS policy corrected
- MIME handling corrected
- Obsolete Firebase override removed

**Lock Instructions**:
1. Freeze Impact Module development.
2. No new features may be added.
3. No UI redesigns may be performed.
4. No business logic modifications.

**Allowed After Lock**:
- Security fixes
- Bug fixes
- Production incident fixes

*Any future modification request requires explicit unlock authorization before changes are permitted.*

## Development Lock: Support Portal

**Status**: LOCKED
**Development Status**: COMPLETE
**Production Status**: READY

**Verified Modules**:
- Transactions Registry Tab (Income tracker, Expense ledger, Live Firebase subscriptions)
- Real-time Payments synchronization (via HQ override)
- Robust IoT active-status time-processing (prevents wrong offline representations with safe millis timestamp parsing)
- Live Units count binding to actual online status metrics
- Support Operations Sidebar navigation integration

**Lock Instructions**:
1. Freeze Support Portal development.
2. No new views, buttons, or action triggers may be added.
3. No UI redesigns on support panels or metrics banners.
4. Keep the active-device duration criteria exactly at 60 seconds of sync heartbeat.

**Allowed After Lock**:
- Critical telemetry or security hotfixes.
- Production bug resolutions.

*Any future modification request requires explicit unlock authorization before changes are permitted.*

## Development Lock: Admin Portal

**Status**: LOCKED
**Development Status**: COMPLETE
**Production Status**: READY

**Verified Modules**:
- High-definition Operations Center Command Console
- Live Map Cluster Integration with Leaflet
- Revenue Hub & Financial Reconciliation
- Dynamic Permissions & Multi-role Management (Admin overview, Manager overview, Operator access)
- Interactive Campaign Control Room and Assignments
- Support Relay Command routing matrix

**Lock Instructions**:
1. Freeze Admin Portal visual elements, styles, and layouts.
2. No new action items, tabs, charts, or stats metrics to be added.
3. No configuration state or component mapping updates.

**Allowed After Lock**:
- Core security, privilege isolation, or authentication patch fixes.
- Performance and render optimizations.

*Any future modification request requires explicit unlock authorization before changes are permitted.*

## Development Lock: Terminal Hub Tab

**Status**: LOCKED
**Development Status**: COMPLETE
**Production Status**: READY

**Verified Modules**:
- Persistent IOT active-status representation with resilient, multi-format timestamp parser (`getDeviceMillis`)
- Live sync heartbeat telemetry mapping at exactly 60 seconds
- Active/Inactive and Online/Offline state calculation matching live status records
- Terminal list overview list with fast ID search filters
- Device diagnostic drawer showing historical sync sessions and asset logs

**Lock Instructions**:
1. Freeze Terminal Hub Tab code logic.
2. Maintain `getDeviceMillis` as the standard timestamp mapper for safe parsing of firestore/native dates.
3. Keep the 60,000ms (60 seconds) active status heartbeat check logic.

**Allowed After Lock**:
- Live API compatibility fixes.
- Critical telemetry field mapping adjustments.

*Any future modification request requires explicit unlock authorization before changes are permitted.*