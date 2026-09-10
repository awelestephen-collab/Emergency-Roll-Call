# Emergency Muster & Evacuation Roll Call System

An enterprise-grade, mobile-accessible Emergency Muster and Roll-Call application engineered for actual high-stress evacuations (fire, active threat, hazardous gas leak, structural emergency). The system ensures real-time accountability under adverse conditions, works across multiple muster points, supports offline queueing during cellular network disruption, enables zero-friction staff check-ins without login delays, and empowers Wardens and First Responders with instant visual triage and automated escalation.

---

## Key Features

1. **Zero-Friction One-Tap Staff Check-In**:
   - No login or password friction required during an active emergency.
   - Staff can open the app via emergency SMS link, push notification, or muster point QR code.
   - Big, high-visibility green **"I AM SAFE / PRESENT"** button.
   - Secondary urgent distress button: **"I Need Assistance / Injured / Trapped Inside"**.
   - Background geolocation capture with geofence proximity calculation against assigned muster station coordinates.
   - Automatically remembers the employee on their personal device for future drills and incidents.

2. **Incident Command Center (Warden Dashboard)**:
   - Live color-coded roster:
     - 🟢 **Green**: Checked in safe (self mobile tap or sight confirmed)
     - 🔴 **Red**: Unaccounted for / missing
     - 🟡 **Amber**: Manually confirmed present by warden sight inspection
     - 🚨 **Red/Amber Pulse**: Emergency distress signal / assistance requested
   - **Live Evacuation Clock**: Tracks elapsed evacuation time from the exact second the alarm sounded.
   - **2-Stage Escalation Countdown**:
     - *0 to 3 minutes*: Rapid self check-in phase.
     - *3 to 5 minutes*: Warning alert prompting wardens to conduct physical sight sweeps.
     - *> 5 minutes*: **Critical Escalation State** automatically highlighting unaccounted personnel and triggering the First Responder Handover Manifest.
   - **Multi-Muster Point Switcher**: Filter live rosters and headcounts by Muster Point A (North Car Park), Muster Point B (South Lawn), or Muster Point C (Assembly Area).
   - **Warden Sight Confirmations**: Allows safety wardens to visually verify personnel without phones in a single tap.
   - **Direct Call**: One-tap phone icon to dial an unaccounted employee's mobile number immediately.
   - **Sound Synthesizer**: Web Audio API-powered siren alarm, warning beeps, and safe check-in chimes (no external audio files required).

3. **Offline Resilience**:
   - Operates on weak or disrupted Wi-Fi/cellular networks.
   - Offline check-ins are securely queued in local storage.
   - Automatically detects restored network connectivity and pushes batch sync to the server.

4. **Safety & HSE Compliance Audits**:
   - Generates official PDF Evacuation Reports with timestamped logs, accountability rates, and incident commander sign-off blocks.
   - Exports complete Excel audit spreadsheets (`.xlsx`) with roster, GPS verification details, and event timelines.
   - Historical archive of past evacuations and drills for compliance reviews (OSHA, Fire Safety, Insurance).

5. **Microsoft 365, SharePoint & Power Apps Stack**:
   - Ready-to-use SharePoint Online List schemas (`Emergency_StaffDirectory`, `Emergency_Incidents`, `Emergency_CheckIns`, `Emergency_MusterPoints`).
   - Automated PnP PowerShell provisioning script (`Provision_SharePoint_Lists.ps1`).
   - Power Automate Flow recipes for instant Teams/SMS broadcasts and 5-minute delayed escalation alerts.
   - Power Apps Canvas App formulas (Power Fx) for native M365 deployment.

6. **Physical Fire Alarm & Access Control Webhook**:
   - `POST /api/incidents/trigger-alarm` accepts inbound webhooks from building management systems (BMS), physical fire alarm panels, or badge access control systems (Lenel, Honeywell, Gallagher).

---

## Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Application
```bash
# Starts both Express backend (Port 3001) and Vite frontend (Port 5173 with proxy)
npm run dev
```
Or to run the single unified full-stack server (serves both API and production client build on Port 3001):
```bash
npm run build
npm run server
```

Open your browser at:
- **Development**: `http://localhost:5173`
- **Production Server**: `http://localhost:3001`

### 3. Run Automated Tests
```bash
npm run test:api
```

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | System health check and active incident status |
| `/api/incidents/active` | `GET` | Current active evacuation and live roster summary |
| `/api/incidents/declare` | `POST` | Declare emergency evacuation (Fire, Threat, Gas Leak, Drill) |
| `/api/incidents/all-clear` | `POST` | Close evacuation session and generate audit records |
| `/api/incidents/trigger-alarm` | `POST` | Inbound webhook for physical fire alarm panel relays |
| `/api/incidents/history` | `GET` | Historical archive of completed drills and incidents |
| `/api/incidents/staff` | `GET` | Retrieve staff directory |
| `/api/incidents/muster-points` | `GET` | Retrieve designated assembly points with geofences |
| `/api/checkin` | `POST` | One-tap staff check-in with GPS metadata |
| `/api/checkin/warden-override` | `POST` | Warden sight verification or distress flag |
| `/api/checkin/batch-sync` | `POST` | Replay queued offline check-ins |
| `/api/reports/:id/pdf` | `GET` | Download official HSE compliance PDF report |
| `/api/reports/:id/excel` | `GET` | Download Excel audit spreadsheet |
| `/api/sharepoint/status` | `GET` | SharePoint & Graph API connection status |

---

## Microsoft 365 Deployment

To deploy or integrate with your organization's Microsoft 365 environment:

1. Review [`m365-integration/SharePoint_Lists_Schema.json`](./m365-integration/SharePoint_Lists_Schema.json).
2. Run [`m365-integration/Provision_SharePoint_Lists.ps1`](./m365-integration/Provision_SharePoint_Lists.ps1) with your SharePoint Site URL.
3. Review [`m365-integration/PowerAutomate_Flows.md`](./m365-integration/PowerAutomate_Flows.md) to enable automatic Teams/SMS alerts and escalation timers.
4. Review [`m365-integration/PowerApps_Formulas.md`](./m365-integration/PowerApps_Formulas.md) for Power Apps Canvas App formulas.
