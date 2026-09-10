export const DEFAULT_STAFF = [
  {
    "id": "EMP-001",
    "name": "Sarah Jenkins",
    "email": "sarah.jenkins@acmecorp.com",
    "department": "Executive & Safety",
    "role": "Chief Safety Warden",
    "officeLocation": "Building 1 - Floor 4 (Room 402)",
    "phone": "+1 (555) 234-5678",
    "isWarden": true
  },
  {
    "id": "EMP-002",
    "name": "Marcus Vance",
    "email": "marcus.vance@acmecorp.com",
    "department": "Facilities & Engineering",
    "role": "Floor 3 Warden",
    "officeLocation": "Building 1 - Floor 3 (Room 315)",
    "phone": "+1 (555) 345-6789",
    "isWarden": true
  },
  {
    "id": "EMP-003",
    "name": "Elena Rostova",
    "email": "elena.rostova@acmecorp.com",
    "department": "Software Engineering",
    "role": "Lead Architect",
    "officeLocation": "Building 1 - Floor 3 (Open Bay 3B)",
    "phone": "+1 (555) 456-7890",
    "isWarden": false
  },
  {
    "id": "EMP-004",
    "name": "David Kim",
    "email": "david.kim@acmecorp.com",
    "department": "Software Engineering",
    "role": "Senior Full-Stack Dev",
    "officeLocation": "Building 1 - Floor 3 (Open Bay 3B)",
    "phone": "+1 (555) 567-8901",
    "isWarden": false
  },
  {
    "id": "EMP-005",
    "name": "Amina Al-Mansoor",
    "email": "amina.mansoor@acmecorp.com",
    "department": "Operations & Logistics",
    "role": "Floor 2 Warden",
    "officeLocation": "Building 1 - Floor 2 (Room 210)",
    "phone": "+1 (555) 678-9012",
    "isWarden": true
  },
  {
    "id": "EMP-006",
    "name": "Carlos Gomez",
    "email": "carlos.gomez@acmecorp.com",
    "department": "Operations & Logistics",
    "role": "Supply Chain Analyst",
    "officeLocation": "Building 1 - Floor 2 (Room 214)",
    "phone": "+1 (555) 789-0123",
    "isWarden": false
  },
  {
    "id": "EMP-007",
    "name": "Priya Sharma",
    "email": "priya.sharma@acmecorp.com",
    "department": "People & Culture (HR)",
    "role": "People Operations Lead",
    "officeLocation": "Building 1 - Floor 1 (Room 105)",
    "phone": "+1 (555) 890-1234",
    "isWarden": false
  },
  {
    "id": "EMP-008",
    "name": "James O'Connor",
    "email": "james.oconnor@acmecorp.com",
    "department": "Finance & Legal",
    "role": "Financial Controller",
    "officeLocation": "Building 1 - Floor 4 (Room 412)",
    "phone": "+1 (555) 901-2345",
    "isWarden": false
  },
  {
    "id": "EMP-009",
    "name": "Tariq Edwards",
    "email": "tariq.edwards@acmecorp.com",
    "department": "Security & Incident Response",
    "role": "Head of Physical Security",
    "officeLocation": "Building 1 - Ground Floor (Security Gate 1)",
    "phone": "+1 (555) 012-3456",
    "isWarden": true
  },
  {
    "id": "EMP-010",
    "name": "Chloe Dupont",
    "email": "chloe.dupont@acmecorp.com",
    "department": "Customer Experience",
    "role": "Support Manager",
    "officeLocation": "Building 1 - Floor 1 (Room 118)",
    "phone": "+1 (555) 123-7894",
    "isWarden": false
  },
  {
    "id": "EMP-011",
    "name": "Zackary Taylor",
    "email": "zack.taylor@acmecorp.com",
    "department": "Facilities & Engineering",
    "role": "HVAC & Electrical Tech",
    "officeLocation": "Building 1 - Basement (Plant Room B-2)",
    "phone": "+1 (555) 234-8901",
    "isWarden": false
  },
  {
    "id": "EMP-012",
    "name": "Nia Robinson",
    "email": "nia.robinson@acmecorp.com",
    "department": "Marketing & Brand",
    "role": "Brand Designer",
    "officeLocation": "Building 1 - Floor 2 (Design Studio 2C)",
    "phone": "+1 (555) 345-9012",
    "isWarden": false
  }
];

export const DEFAULT_MUSTER_POINTS = [
  {
    "id": "MUSTER-A",
    "name": "Muster Point A",
    "description": "Designated Primary Evacuation Assembly Point",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "radiusMeters": 100,
    "isPrimary": true,
    "assignedWarden": "Sarah Jenkins"
  },
  {
    "id": "MUSTER-B",
    "name": "Muster Point B",
    "description": "Designated Secondary Evacuation Assembly Point",
    "latitude": 37.7738,
    "longitude": -122.4185,
    "radiusMeters": 100,
    "isPrimary": false,
    "assignedWarden": "Amina Al-Mansoor"
  },
  {
    "id": "MUSTER-C",
    "name": "Muster Point C",
    "description": "Designated Alternate Overflow Assembly Point",
    "latitude": 37.7755,
    "longitude": -122.4210,
    "radiusMeters": 100,
    "isPrimary": false,
    "assignedWarden": "Marcus Vance"
  }
];

export const DEFAULT_HISTORICAL_DRILL = {
  "id": "INC-2026-0814-DRILL",
  "type": "Scheduled Fire Evacuation Drill",
  "declaredAt": "2026-08-14T10:00:00.000Z",
  "allClearAt": "2026-08-14T10:07:35.000Z",
  "durationSeconds": 455,
  "declaredBy": "Sarah Jenkins (Chief Safety Warden)",
  "status": "CLOSED",
  "totalStaff": 12,
  "accountedCount": 12,
  "unaccountedCount": 0,
  "manualSightCount": 2,
  "assistanceNeededCount": 0,
  "notes": "Quarterly Q3 Fire Drill. Total clear time: 7m 35s. Good compliance at Muster Point A.",
  "musterPointBreakdown": {
    "MUSTER-A": 7,
    "MUSTER-B": 3,
    "MUSTER-C": 2
  }
};
