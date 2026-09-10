import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileCode,
  Terminal,
  Workflow,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';

export function M365IntegrationView() {
  const [copiedId, setCopiedId] = useState(null);
  const [spStatus, setSpStatus] = useState(null);

  useEffect(() => {
    fetch('/api/sharepoint/status')
      .then(res => res.json())
      .then(data => setSpStatus(data))
      .catch(err => console.error('SharePoint status error:', err));
  }, []);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const powershellScript = `# =========================================================================
# Emergency Muster & Roll Call System - SharePoint Online Provisioning
# Requires: PnP.PowerShell module (Install-Module PnP.PowerShell -Scope CurrentUser)
# =========================================================================

$SiteUrl = "https://yourtenant.sharepoint.com/sites/EmergencySafety"
Connect-PnPOnline -Url $SiteUrl -Interactive

Write-Host "Creating Emergency Muster lists in SharePoint..." -ForegroundColor Cyan

# 1. Staff Directory (Or reuse existing HR list)
if (-not (Get-PnPList -Identity "Emergency_StaffDirectory" -ErrorAction SilentlyContinue)) {
    $list = New-PnPList -Title "Emergency_StaffDirectory" -Template GenericList
    Add-PnPField -List $list -DisplayName "Department" -InternalName "Department" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "RoleTitle" -InternalName "RoleTitle" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "OfficeLocation" -InternalName "OfficeLocation" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "MobileNumber" -InternalName "MobileNumber" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "IsWarden" -InternalName "IsWarden" -Type Boolean -AddToDefaultView
    Write-Host "Created Emergency_StaffDirectory" -ForegroundColor Green
}

# 2. Emergency Incidents List
if (-not (Get-PnPList -Identity "Emergency_Incidents" -ErrorAction SilentlyContinue)) {
    $list = New-PnPList -Title "Emergency_Incidents" -Template GenericList
    Add-PnPField -List $list -DisplayName "IncidentType" -InternalName "IncidentType" -Type Choice -Choices "Fire Evacuation","Active Security Threat","Hazardous Gas Leak","Severe Weather","Evacuation Drill" -AddToDefaultView
    Add-PnPField -List $list -DisplayName "IncidentStatus" -InternalName "IncidentStatus" -Type Choice -Choices "ACTIVE","CLOSED" -AddToDefaultView
    Add-PnPField -List $list -DisplayName "DeclaredAt" -InternalName "DeclaredAt" -Type DateTime -AddToDefaultView
    Add-PnPField -List $list -DisplayName "AllClearAt" -InternalName "AllClearAt" -Type DateTime -AddToDefaultView
    Add-PnPField -List $list -DisplayName "DeclaredBy" -InternalName "DeclaredBy" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "DurationSeconds" -InternalName "DurationSeconds" -Type Number -AddToDefaultView
    Add-PnPField -List $list -DisplayName "TotalStaff" -InternalName "TotalStaff" -Type Number -AddToDefaultView
    Add-PnPField -List $list -DisplayName "AccountedCount" -InternalName "AccountedCount" -Type Number -AddToDefaultView
    Write-Host "Created Emergency_Incidents" -ForegroundColor Green
}

# 3. Emergency CheckIns List
if (-not (Get-PnPList -Identity "Emergency_CheckIns" -ErrorAction SilentlyContinue)) {
    $list = New-PnPList -Title "Emergency_CheckIns" -Template GenericList
    Add-PnPField -List $list -DisplayName "IncidentID" -InternalName "IncidentID" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "StaffName" -InternalName "StaffName" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "StaffEmail" -InternalName "StaffEmail" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "MusterPoint" -InternalName "MusterPoint" -Type Text -AddToDefaultView
    Add-PnPField -List $list -DisplayName "CheckInStatus" -InternalName "CheckInStatus" -Type Choice -Choices "SAFE","MANUAL_SIGHT_CONFIRMED","NEEDS_ASSISTANCE","UNACCOUNTED" -AddToDefaultView
    Add-PnPField -List $list -DisplayName "CheckInMethod" -InternalName "CheckInMethod" -Type Choice -Choices "SELF_APP","WARDEN_SIGHT","OFFLINE_SYNC" -AddToDefaultView
    Add-PnPField -List $list -DisplayName "CheckInTime" -InternalName "CheckInTime" -Type DateTime -AddToDefaultView
    Add-PnPField -List $list -DisplayName "GPSStatus" -InternalName "GPSStatus" -Type Text -AddToDefaultView
    Write-Host "Created Emergency_CheckIns" -ForegroundColor Green
}

Write-Host "SharePoint Online lists provisioning complete!" -ForegroundColor Green`;

  const powerAppsFormulas = `// -------------------------------------------------------------
// Power Apps Canvas App: Key Formulas & Power Fx Code
// -------------------------------------------------------------

// 1. One-Tap Check-In Button (OnSelect):
Patch(
    Emergency_CheckIns,
    Defaults(Emergency_CheckIns),
    {
        Title: CurrentUser.FullName & " - " & Text(Now(), "[$-en-US]yyyy-mm-dd hh:mm:ss"),
        IncidentID: varActiveIncident.ID,
        StaffName: User().FullName,
        StaffEmail: User().Email,
        MusterPoint: DropdownMusterPoints.Selected.Title,
        CheckInStatus: "SAFE",
        CheckInMethod: "SELF_APP",
        CheckInTime: Now(),
        GPSStatus: If(Location.Distance(varMusterLat, varMusterLong) <= 100, "VERIFIED_ON_SITE", "REMOTE_UNVERIFIED")
    }
);
Notify("Checked in safe! Your safety warden has been notified.", NotificationType.Success);

// 2. Warden Sight Confirmation (OnSelect in Gallery):
Patch(
    Emergency_CheckIns,
    Defaults(Emergency_CheckIns),
    {
        IncidentID: varActiveIncident.ID,
        StaffName: ThisItem.FullName,
        CheckInStatus: "MANUAL_SIGHT_CONFIRMED",
        CheckInMethod: "WARDEN_SIGHT",
        CheckInTime: Now(),
        MusterPoint: varWardenCurrentMusterPoint
    }
);

// 3. Color-Coded Gallery Status (Color / Fill):
Switch(
    LookUp(Emergency_CheckIns, IncidentID = varActiveIncident.ID && StaffName = ThisItem.FullName).CheckInStatus,
    "SAFE", RGBA(16, 185, 129, 0.2),                     // Green
    "MANUAL_SIGHT_CONFIRMED", RGBA(245, 158, 11, 0.2),   // Amber
    "NEEDS_ASSISTANCE", RGBA(220, 38, 38, 0.4),          // Pulsing Red
    RGBA(239, 68, 68, 0.15)                              // Default Unaccounted Red
);

// 4. Auto-Refresh Timer (Duration: 5000ms, Repeat: True, OnTimerEnd):
Refresh(Emergency_CheckIns);
UpdateContext({
    varAccountedCount: CountRows(Filter(Emergency_CheckIns, IncidentID = varActiveIncident.ID && (CheckInStatus = "SAFE" || CheckInStatus = "MANUAL_SIGHT_CONFIRMED"))),
    varTotalCount: CountRows(Emergency_StaffDirectory)
});`;

  const powerAutomateFlowGuide = `// Power Automate Cloud Flow Recipes:

1. Flow: "Emergency Declaration - Org-Wide Push & SMS Broadcast"
   Trigger: When an item is created in SharePoint list 'Emergency_Incidents' (Condition: IncidentStatus == 'ACTIVE')
   Action 1: Send Teams Broadcast Channel Message to all staff / Emergency Safety Team.
   Action 2: Send Push Notification (Power Apps mobile) to all users: "EMERGENCY: Evacuate immediately to your assigned muster point."
   Action 3: Trigger Twilio / SMS connector for staff with emergency mobile numbers.

2. Flow: "5-Minute Escalation Delayed Alert"
   Trigger: When an item is created in 'Emergency_Incidents'
   Action 1: Delay: 5 Minutes (Configurable threshold)
   Action 2: Get items from 'Emergency_StaffDirectory'
   Action 3: Get items from 'Emergency_CheckIns' where IncidentID == TriggerBody?['ID']
   Action 4: Filter unaccounted personnel (Staff NOT in CheckIns)
   Action 5: If Unaccounted Count > 0:
             -> Send High-Priority Email + SMS to Security Desk & On-Duty Fire Responders with the Missing Persons Manifest!

3. Flow: "All-Clear Incident Compliance Report Generator"
   Trigger: When an item is modified in 'Emergency_Incidents' (Condition: IncidentStatus == 'CLOSED')
   Action 1: Execute SharePoint HTTP Request / Power Automate Word/PDF template to generate formal audit PDF.
   Action 2: Email PDF report to Head of Safety, HR Director, and Facilities Manager.`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Layers className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Microsoft 365, SharePoint & Power Apps Stack
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Architecture blueprints, schema provisioning scripts, and Power Automate recipes to connect or deploy inside your tenant.
            </p>
          </div>
        </div>

        {spStatus && (
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Server className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Mode:</span>
            <span className="font-bold text-slate-200">{spStatus.syncMode}</span>
          </div>
        )}
      </div>

      {/* Grid of Sections */}
      <div className="space-y-6">
        {/* Section 1: SharePoint Online Lists Provisioning Script */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Automated PnP PowerShell Provisioning Script
              </h2>
            </div>
            <button
              onClick={() => handleCopy('ps', powershellScript)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copiedId === 'ps' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'ps' ? 'Copied' : 'Copy PowerShell'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Run this script in PowerShell to automatically create the 3 SharePoint lists (`Emergency_StaffDirectory`, `Emergency_Incidents`, `Emergency_CheckIns`) with all required columns, data types, and choices.
          </p>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-blue-300 overflow-x-auto border border-slate-800/80 max-h-72">
            {powershellScript}
          </pre>
        </div>

        {/* Section 2: Power Apps Formulas */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Power Apps Canvas App Formulas (Power Fx)
              </h2>
            </div>
            <button
              onClick={() => handleCopy('pfx', powerAppsFormulas)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copiedId === 'pfx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'pfx' ? 'Copied' : 'Copy Power Fx'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Copy-paste formulas for your Power Apps Canvas App buttons, gallery conditional colors, auto-refresh timers, and GPS distance checks.
          </p>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-purple-300 overflow-x-auto border border-slate-800/80 max-h-72">
            {powerAppsFormulas}
          </pre>
        </div>

        {/* Section 3: Power Automate Cloud Flows */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                3. Power Automate Cloud Flow Blueprints
              </h2>
            </div>
            <button
              onClick={() => handleCopy('flows', powerAutomateFlowGuide)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copiedId === 'flows' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'flows' ? 'Copied' : 'Copy Flows Guide'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Triggers and action recipes for instant SMS/Teams broadcast, 5-minute escalation delay timers, and automated compliance report emails.
          </p>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800/80 max-h-72">
            {powerAutomateFlowGuide}
          </pre>
        </div>
      </div>
    </div>
  );
}
