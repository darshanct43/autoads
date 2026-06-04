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