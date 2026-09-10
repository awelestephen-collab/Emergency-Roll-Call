# Power Apps Canvas App Formulas (Power Fx)

This document provides drop-in Power Fx formulas for building or customizing a Power Apps Canvas App directly on top of your SharePoint backend.

---

## 1. App `OnStart` Formula

Initialize active incident variables and fetch current user profile:

```powerfx
// Fetch active incident if any
Set(
    varActiveIncident,
    LookUp(
        Emergency_Incidents,
        IncidentStatus.Value = "ACTIVE"
    )
);

// Fetch current user details from staff directory
Set(
    varCurrentStaff,
    LookUp(
        Emergency_StaffDirectory,
        StaffEmail = User().Email
    )
);

// Check if user is a designated safety warden
Set(
    varIsWarden,
    Coalesce(varCurrentStaff.IsWarden, false)
);

// Cache Muster Points
ClearCollect(
    colMusterPoints,
    Emergency_MusterPoints
);
```

---

## 2. Staff Screen: One-Tap "I Am Safe" Button `OnSelect`

Zero-friction single tap check-in that records geolocation proximity:

```powerfx
If(
    IsBlank(varActiveIncident),
    Notify("No emergency evacuation is currently in progress.", NotificationType.Warning),
    
    // Calculate distance to selected muster point
    With(
        {
            locDistance: Location.Distance(
                ddMusterPoints.Selected.Latitude,
                ddMusterPoints.Selected.Longitude
            )
        },
        Patch(
            Emergency_CheckIns,
            Defaults(Emergency_CheckIns),
            {
                Title: Coalesce(varCurrentStaff.Title, User().FullName) & " - " & Text(Now(), "[$-en-US]yyyy-mm-dd hh:mm:ss"),
                IncidentID: Text(varActiveIncident.ID),
                StaffName: Coalesce(varCurrentStaff.Title, User().FullName),
                StaffEmail: User().Email,
                MusterPoint: ddMusterPoints.Selected.PointName,
                CheckInStatus: { Value: "SAFE" },
                CheckInMethod: { Value: "SELF_APP" },
                CheckInTime: Now(),
                GPSStatus: If(locDistance <= ddMusterPoints.Selected.RadiusMeters, "VERIFIED_ON_SITE", "REMOTE_UNVERIFIED"),
                DistanceMeters: Round(locDistance, 0),
                VerifiedBy: User().FullName
            }
        );
        Set(varHasCheckedIn, true);
        Notify("You have been checked in safe! Your safety warden has been notified.", NotificationType.Success);
    )
)
```

---

## 3. Staff Screen: "I Need Assistance / Trapped" Button `OnSelect`

Urgent distress signal:

```powerfx
Patch(
    Emergency_CheckIns,
    Defaults(Emergency_CheckIns),
    {
        Title: Coalesce(varCurrentStaff.Title, User().FullName) & " - SOS",
        IncidentID: Text(varActiveIncident.ID),
        StaffName: Coalesce(varCurrentStaff.Title, User().FullName),
        StaffEmail: User().Email,
        MusterPoint: ddMusterPoints.Selected.PointName,
        CheckInStatus: { Value: "NEEDS_ASSISTANCE" },
        CheckInMethod: { Value: "SELF_APP" },
        CheckInTime: Now(),
        DistressNotes: txtAssistanceDetails.Text,
        VerifiedBy: User().FullName
    }
);
Notify("DISTRESS ALERT TRANSMITTED TO INCIDENT COMMANDER!", NotificationType.Error);
```

---

## 4. Warden Screen: Gallery Conditional Card Fill

Color-code roster cards in real time:

```powerfx
// In Gallery.TemplateFill:
With(
    {
        chkRecord: LookUp(
            Emergency_CheckIns,
            IncidentID = Text(varActiveIncident.ID) && StaffName = ThisItem.Title
        )
    },
    Switch(
        chkRecord.CheckInStatus.Value,
        "SAFE", RGBA(16, 185, 129, 0.25),                   // Green
        "MANUAL_SIGHT_CONFIRMED", RGBA(245, 158, 11, 0.25), // Amber
        "NEEDS_ASSISTANCE", RGBA(220, 38, 38, 0.5),         // Pulsing Red
        RGBA(239, 68, 68, 0.15)                             // Default Unaccounted Red
    )
)
```

---

## 5. Warden Screen: "Confirm Safe by Sight" Button `OnSelect`

Allows wardens to visually verify staff without phones:

```powerfx
Patch(
    Emergency_CheckIns,
    Defaults(Emergency_CheckIns),
    {
        Title: ThisItem.Title & " - Sight Verified",
        IncidentID: Text(varActiveIncident.ID),
        StaffName: ThisItem.Title,
        StaffEmail: ThisItem.StaffEmail,
        MusterPoint: ddWardenMusterPoint.Selected.PointName,
        CheckInStatus: { Value: "MANUAL_SIGHT_CONFIRMED" },
        CheckInMethod: { Value: "WARDEN_SIGHT" },
        CheckInTime: Now(),
        VerifiedBy: User().FullName & " (Warden Sight Confirmation)"
    }
);
Notify(ThisItem.Title & " marked safe by sight.", NotificationType.Success);
```

---

## 6. Auto-Refresh Timer Control (`tmrAutoRefresh`)

Add a Timer control to the screen to poll for real-time check-ins:

* **Duration**: `4000` (4 seconds)
* **Repeat**: `true`
* **AutoStart**: `true`
* **OnTimerEnd**:
  ```powerfx
  Refresh(Emergency_CheckIns);
  Refresh(Emergency_Incidents);

  // Update KPI counters
  UpdateContext({
      varAccountedStaff: CountRows(
          Filter(
              Emergency_CheckIns,
              IncidentID = Text(varActiveIncident.ID) && (CheckInStatus.Value = "SAFE" || CheckInStatus.Value = "MANUAL_SIGHT_CONFIRMED")
          )
      ),
      varTotalStaff: CountRows(Emergency_StaffDirectory)
  });
  ```
