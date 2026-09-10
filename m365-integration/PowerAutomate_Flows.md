# Power Automate Cloud Flow Recipes

This guide provides the exact configuration, trigger conditions, and step-by-step actions to build automated Power Automate flows connecting your SharePoint lists with Microsoft Teams, SMS, and Executive Email alerts.

---

## Flow 1: Organization-Wide Emergency Push & SMS Broadcast

**Objective**: When an emergency evacuation session is declared in SharePoint, immediately notify all staff via Microsoft Teams and SMS.

* **Trigger**: SharePoint - `When an item is created`
  * **Site Address**: `https://yourcompany.sharepoint.com/sites/EmergencySafety`
  * **List Name**: `Emergency_Incidents`
* **Condition**:
  * `@equals(triggerOutputs()?['body/IncidentStatus/Value'], 'ACTIVE')`
* **Actions**:
  1. **Post message in a chat or channel (Microsoft Teams)**:
     * **Post in**: Channel (`General` or dedicated `Emergency Alerts` channel)
     * **Message Body (Adaptive Card or Urgent HTML)**:
       ```html
       🚨 <strong style="color:red;">EMERGENCY EVACUATION IN PROGRESS</strong><br/>
       <strong>Threat Type:</strong> @{triggerOutputs()?['body/IncidentType/Value']}<br/>
       <strong>Declared By:</strong> @{triggerOutputs()?['body/DeclaredBy']}<br/>
       <strong>Action Required:</strong> Evacuate the building immediately via emergency stairs. 
       Do not use elevators. Proceed to your designated muster point and tap 'I am Safe' in the Emergency Roll Call App.<br/>
       <a href="https://muster.yourcompany.com">OPEN EMERGENCY CHECK-IN PORTAL</a>
       ```
  2. **Send Push Notification (Power Apps Notification connector)**:
     * **App**: `Emergency Roll Call`
     * **Message**: `EMERGENCY: @{triggerOutputs()?['body/IncidentType/Value']} declared. Evacuate immediately and check in at your muster station.`
  3. **Send SMS via Twilio Connector (Optional for mobile push fallback)**:
     * Sends SMS to staff listed in `Emergency_StaffDirectory` who have registered mobile numbers.

---

## Flow 2: 5-Minute Escalation Delayed Alert to First Responders

**Objective**: Wait 5 minutes after incident declaration. Check who is still unaccounted for, and automatically dispatch a high-priority manifest email and SMS to Security & Emergency Services.

* **Trigger**: SharePoint - `When an item is created` (`Emergency_Incidents`)
* **Actions**:
  1. **Delay**:
     * **Count**: 5
     * **Unit**: `Minute`
  2. **Get item (SharePoint)**:
     * Check if the incident is still `ACTIVE` (has not been closed by an All-Clear within the 5 minutes).
  3. **Condition**:
     * `@equals(body('Get_item')?['IncidentStatus/Value'], 'ACTIVE')`
  4. **If True (Still Active)**:
     * **Get items (SharePoint)**: `Emergency_StaffDirectory`
     * **Get items (SharePoint)**: `Emergency_CheckIns` where `IncidentID eq '@{triggerOutputs()?['body/Title']}'`
     * **Filter Array**: Filter staff where staff name or email is NOT present in the CheckIns result.
     * **Create HTML Table**: Generate table of unaccounted personnel (Name, Department, Primary Floor, Mobile Number).
     * **Send an email (V2 - Office 365 Outlook)**:
       * **To**: `security-dispatch@yourcompany.com; facilities@yourcompany.com`
       * **Importance**: `High`
       * **Subject**: `🚨 CRITICAL ESCALATION: Unaccounted Personnel Manifest - @{triggerOutputs()?['body/Title']}`
       * **Body**:
         ```html
         <h2 style="color: red;">CRITICAL SAFETY ESCALATION - 5 MINUTES ELAPSED</h2>
         <p>An emergency evacuation has been active for 5 minutes. The following personnel have NOT checked in safe:</p>
         @{body('Create_HTML_table')}
         <p>Please provide this manifest immediately to the Fire Department / First Responders on scene.</p>
         ```

---

## Flow 3: Post-Incident HSE Compliance Audit Report Generation

**Objective**: When an incident is marked `CLOSED` (All-Clear), generate an official PDF report and archive it in SharePoint and email it to Executive Safety Officers.

* **Trigger**: SharePoint - `When an item is created or modified` (`Emergency_Incidents`)
* **Condition**:
  * `@and(equals(triggerOutputs()?['body/IncidentStatus/Value'], 'CLOSED'), not(empty(triggerOutputs()?['body/AllClearAt'])))`
* **Actions**:
  1. **Get items (SharePoint)**: Retrieve all `Emergency_CheckIns` for this incident.
  2. **Calculate Metrics**:
     * Total Headcount
     * Safe Count
     * Unaccounted Count
     * Total Duration = `div(sub(ticks(triggerOutputs()?['body/AllClearAt']), ticks(triggerOutputs()?['body/DeclaredAt'])), 10000000)` (Seconds)
  3. **Generate PDF Document (OneDrive / Word Online Connector)**:
     * Fills compliance template with roll call results.
  4. **Create file (SharePoint)**: Save PDF to `Safety Documents/Evacuation Reports/2026/`.
  5. **Send an email (V2)**: Email final PDF to safety stakeholders.
