import { store } from './server/store.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

console.log('--- RUNNING EMERGENCY ROLL CALL API & LOGIC TESTS ---');

try {
  // Test 1: Store staff list and muster points
  const staff = store.getStaff();
  console.log(`[PASS] Staff loaded: ${staff.length} employees`);
  if (staff.length === 0) throw new Error('Staff list should not be empty');

  const musterPoints = store.getMusterPoints();
  console.log(`[PASS] Muster points loaded: ${musterPoints.length} points`);
  if (musterPoints.length === 0) throw new Error('Muster points should not be empty');

  // Test 2: Declare an incident
  const incidentSummary = store.declareIncident({
    type: 'Simulated Fire Alarm Test',
    declaredBy: 'Automated Test Runner',
    notes: 'Unit test verification',
    simulatedDrill: true
  });
  console.log(`[PASS] Incident declared: ${incidentSummary.incident.id}, status: ${incidentSummary.incident.status}`);
  if (!incidentSummary.active || incidentSummary.unaccountedCount !== staff.length) {
    throw new Error('Initial unaccounted count does not match total staff');
  }

  // Test 3: Perform Self Check-In with GPS
  const checkInRes = store.recordCheckIn({
    staffId: staff[0].id,
    musterPointId: musterPoints[0].id,
    status: 'SAFE',
    checkInMethod: 'SELF_APP',
    gps: { latitude: musterPoints[0].latitude, longitude: musterPoints[0].longitude }
  });
  console.log(`[PASS] Self Check-in recorded for ${staff[0].name}. Accounted: ${checkInRes.accountedCount}/${checkInRes.totalStaff}`);
  if (checkInRes.accountedCount !== 1) throw new Error('Accounted count should be 1');

  // Test 4: Warden Manual Sight Confirmation
  const wardenOverrideRes = store.recordCheckIn({
    staffId: staff[1].id,
    musterPointId: musterPoints[1].id,
    status: 'MANUAL_SIGHT_CONFIRMED',
    checkInMethod: 'WARDEN_SIGHT',
    verifiedBy: 'Warden Test'
  });
  console.log(`[PASS] Warden sight confirmation recorded for ${staff[1].name}. Accounted: ${wardenOverrideRes.accountedCount}/${wardenOverrideRes.totalStaff}`);
  if (wardenOverrideRes.manualSightCount !== 1) throw new Error('Manual sight count should be 1');

  // Test 5: Needs Assistance flag
  const assistanceRes = store.recordCheckIn({
    staffId: staff[2].id,
    musterPointId: musterPoints[0].id,
    status: 'NEEDS_ASSISTANCE',
    checkInMethod: 'SELF_APP',
    notes: 'Minor smoke inhalation near Stairwell A'
  });
  console.log(`[PASS] Assistance requested recorded. Count: ${assistanceRes.assistanceNeededCount}`);
  if (assistanceRes.assistanceNeededCount !== 1) throw new Error('Assistance count should be 1');

  // Test 6: Close Incident (All-Clear)
  const closedIncident = store.closeIncident({
    closedBy: 'Fire Marshal / Test Runner',
    finalNotes: 'Building safely evacuated and verified.'
  });
  console.log(`[PASS] All-Clear given. Duration: ${closedIncident.durationSeconds}s, Accounted: ${closedIncident.accountedCount}`);
  if (closedIncident.status !== 'CLOSED') throw new Error('Incident status should be CLOSED');

  // Test 7: Verify History
  const history = store.getIncidentHistory();
  console.log(`[PASS] Incident history count: ${history.length}`);
  if (history[0].id !== closedIncident.id) throw new Error('Recent incident not at top of history');

  // Test 8: Generate PDF in-memory test
  const doc = new jsPDF();
  doc.text('Emergency Test Audit', 10, 10);
  doc.autoTable({
    head: [['ID', 'Name', 'Status']],
    body: [[staff[0].id, staff[0].name, 'SAFE']]
  });
  const pdfBytes = doc.output('arraybuffer');
  console.log(`[PASS] PDF generated successfully (${pdfBytes.byteLength} bytes)`);

  // Test 9: Generate Excel in-memory test
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['ID', 'Name'], [staff[0].id, staff[0].name]]);
  XLSX.utils.book_append_sheet(wb, ws, 'Roster');
  const excelBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  console.log(`[PASS] Excel generated successfully (${excelBuf.length} bytes)`);

  console.log('\n>>> ALL 9 TESTS PASSED SUCCESSFULLY! <<<');
} catch (err) {
  console.error('TEST FAILED:', err);
  process.exit(1);
}
