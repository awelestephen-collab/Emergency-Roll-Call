<#
.SYNOPSIS
    Automated SharePoint Online Provisioning Script for Emergency Muster & Roll Call System.
.DESCRIPTION
    Uses PnP PowerShell to automatically create:
    - Emergency_StaffDirectory
    - Emergency_Incidents
    - Emergency_CheckIns
    - Emergency_MusterPoints
.PARAMETER SiteUrl
    The SharePoint Online site URL where the lists should be created.
.EXAMPLE
    .\Provision_SharePoint_Lists.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/EmergencySafety"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl
)

# Verify PnP.PowerShell
if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
    Write-Warning "PnP.PowerShell module is not installed. Installing now..."
    Install-Module PnP.PowerShell -Scope CurrentUser -Force -AllowClobber
}

Import-Module PnP.PowerShell

Write-Host "Connecting to SharePoint Online at $SiteUrl..." -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

Write-Host "Connected successfully. Beginning list provisioning..." -ForegroundColor Green

# -------------------------------------------------------------
# 1. Emergency_StaffDirectory
# -------------------------------------------------------------
$list1 = "Emergency_StaffDirectory"
if (-not (Get-PnPList -Identity $list1 -ErrorAction SilentlyContinue)) {
    Write-Host "Creating list '$list1'..." -ForegroundColor Yellow
    $l = New-PnPList -Title $list1 -Template GenericList
    Add-PnPField -List $l -DisplayName "Email" -InternalName "StaffEmail" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "Department" -InternalName "Department" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "RoleTitle" -InternalName "RoleTitle" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "OfficeLocation" -InternalName "OfficeLocation" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "MobileNumber" -InternalName "MobileNumber" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "IsWarden" -InternalName "IsWarden" -Type Boolean -AddToDefaultView
    Write-Host "[OK] Created $list1" -ForegroundColor Green
} else {
    Write-Host "[INFO] List '$list1' already exists." -ForegroundColor Gray
}

# -------------------------------------------------------------
# 2. Emergency_Incidents
# -------------------------------------------------------------
$list2 = "Emergency_Incidents"
if (-not (Get-PnPList -Identity $list2 -ErrorAction SilentlyContinue)) {
    Write-Host "Creating list '$list2'..." -ForegroundColor Yellow
    $l = New-PnPList -Title $list2 -Template GenericList
    Add-PnPField -List $l -DisplayName "IncidentType" -InternalName "IncidentType" -Type Choice -Choices "Fire Evacuation","Active Security Threat","Hazardous Gas Leak","Severe Weather","Evacuation Drill" -AddToDefaultView
    Add-PnPField -List $l -DisplayName "IncidentStatus" -InternalName "IncidentStatus" -Type Choice -Choices "ACTIVE","CLOSED" -AddToDefaultView
    Add-PnPField -List $l -DisplayName "DeclaredAt" -InternalName "DeclaredAt" -Type DateTime -AddToDefaultView
    Add-PnPField -List $l -DisplayName "AllClearAt" -InternalName "AllClearAt" -Type DateTime -AddToDefaultView
    Add-PnPField -List $l -DisplayName "DeclaredBy" -InternalName "DeclaredBy" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "ClosedBy" -InternalName "ClosedBy" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "DurationSeconds" -InternalName "DurationSeconds" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "TotalStaff" -InternalName "TotalStaff" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "AccountedCount" -InternalName "AccountedCount" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "UnaccountedCount" -InternalName "UnaccountedCount" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "IsDrill" -InternalName "IsDrill" -Type Boolean -AddToDefaultView
    Add-PnPField -List $l -DisplayName "DebriefNotes" -InternalName "DebriefNotes" -Type Note -AddToDefaultView
    Write-Host "[OK] Created $list2" -ForegroundColor Green
} else {
    Write-Host "[INFO] List '$list2' already exists." -ForegroundColor Gray
}

# -------------------------------------------------------------
# 3. Emergency_CheckIns
# -------------------------------------------------------------
$list3 = "Emergency_CheckIns"
if (-not (Get-PnPList -Identity $list3 -ErrorAction SilentlyContinue)) {
    Write-Host "Creating list '$list3'..." -ForegroundColor Yellow
    $l = New-PnPList -Title $list3 -Template GenericList
    Add-PnPField -List $l -DisplayName "IncidentID" -InternalName "IncidentID" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "StaffName" -InternalName "StaffName" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "StaffEmail" -InternalName "StaffEmail" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "MusterPoint" -InternalName "MusterPoint" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "CheckInStatus" -InternalName "CheckInStatus" -Type Choice -Choices "SAFE","MANUAL_SIGHT_CONFIRMED","NEEDS_ASSISTANCE","UNACCOUNTED" -AddToDefaultView
    Add-PnPField -List $l -DisplayName "CheckInMethod" -InternalName "CheckInMethod" -Type Choice -Choices "SELF_APP","WARDEN_SIGHT","OFFLINE_SYNC" -AddToDefaultView
    Add-PnPField -List $l -DisplayName "CheckInTime" -InternalName "CheckInTime" -Type DateTime -AddToDefaultView
    Add-PnPField -List $l -DisplayName "GPSStatus" -InternalName "GPSStatus" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "DistanceMeters" -InternalName "DistanceMeters" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "VerifiedBy" -InternalName "VerifiedBy" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "DistressNotes" -InternalName "DistressNotes" -Type Note -AddToDefaultView
    Write-Host "[OK] Created $list3" -ForegroundColor Green
} else {
    Write-Host "[INFO] List '$list3' already exists." -ForegroundColor Gray
}

# -------------------------------------------------------------
# 4. Emergency_MusterPoints
# -------------------------------------------------------------
$list4 = "Emergency_MusterPoints"
if (-not (Get-PnPList -Identity $list4 -ErrorAction SilentlyContinue)) {
    Write-Host "Creating list '$list4'..." -ForegroundColor Yellow
    $l = New-PnPList -Title $list4 -Template GenericList
    Add-PnPField -List $l -DisplayName "PointName" -InternalName "PointName" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "Description" -InternalName "Description" -Type Text -AddToDefaultView
    Add-PnPField -List $l -DisplayName "Latitude" -InternalName "Latitude" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "Longitude" -InternalName "Longitude" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "RadiusMeters" -InternalName "RadiusMeters" -Type Number -AddToDefaultView
    Add-PnPField -List $l -DisplayName "AssignedWarden" -InternalName "AssignedWarden" -Type Text -AddToDefaultView
    Write-Host "[OK] Created $list4" -ForegroundColor Green
} else {
    Write-Host "[INFO] List '$list4' already exists." -ForegroundColor Gray
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "All 4 Emergency Muster SharePoint lists are ready!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
