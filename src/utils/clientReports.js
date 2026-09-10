import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function downloadClientPdf(incident, staffList) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const checkIns = incident.checkIns || {};

    // 1. Title Banner
    doc.setFillColor(220, 38, 38); // Red
    doc.rect(0, 0, 210, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EMERGENCY EVACUATION & MUSTER AUDIT REPORT', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Enterprise Health, Safety & Environment (HSE) Compliance Document', 14, 21);

    // 2. Incident Summary Box
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INCIDENT DETAILS', 14, 32);

    const declaredTime = new Date(incident.declaredAt).toLocaleString();
    const clearedTime = incident.allClearAt ? new Date(incident.allClearAt).toLocaleString() : 'In Progress (Active)';
    const duration = incident.durationSeconds ? `${Math.floor(incident.durationSeconds / 60)}m ${incident.durationSeconds % 60}s` : 'Active';

    const detailsData = [
      ['Incident ID:', incident.id, 'Incident Type:', incident.type],
      ['Declared At:', declaredTime, 'All Clear At:', clearedTime],
      ['Declared By:', incident.declaredBy || 'Safety Warden', 'Total Duration:', duration],
      ['Status:', incident.status || 'CLOSED', 'Classification:', incident.isDrill ? 'Scheduled Drill' : 'ACTUAL EMERGENCY']
    ];

    doc.autoTable({
      startY: 35,
      body: detailsData,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 28 },
        1: { cellWidth: 70 },
        2: { fontStyle: 'bold', cellWidth: 28 },
        3: { cellWidth: 65 }
      }
    });

    // 3. Accountability Metrics
    let finalY = doc.lastAutoTable.finalY + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ACCOUNTABILITY SUMMARY', 14, finalY);

    const total = incident.totalStaff || staffList.length;
    const accounted = incident.accountedCount !== undefined ? incident.accountedCount : Object.keys(checkIns).length;
    const unaccounted = total - accounted;
    const rate = Math.round((accounted / total) * 100);

    const metricsData = [
      ['Total Headcount', 'Accounted Safe', 'Unaccounted / Missing', 'Accountability Rate'],
      [`${total} personnel`, `${accounted} personnel`, `${unaccounted} personnel`, `${rate}%`]
    ];

    doc.autoTable({
      startY: finalY + 3,
      head: [metricsData[0]],
      body: [metricsData[1]],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, halign: 'center', cellPadding: 2 }
    });

    // 4. Missing Staff Table
    finalY = doc.lastAutoTable.finalY + 6;
    const missingStaff = staffList.filter(s => !checkIns[s.id] || checkIns[s.id].status === 'UNACCOUNTED');

    if (missingStaff.length > 0) {
      doc.setFillColor(254, 226, 226);
      doc.setDrawColor(220, 38, 38);
      doc.rect(14, finalY, 182, 7 + (missingStaff.length * 5), 'FD');

      doc.setTextColor(185, 28, 28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`ATTENTION FIRST RESPONDERS: ${missingStaff.length} PERSON(S) REMAIN UNACCOUNTED FOR`, 18, finalY + 5);

      let missingY = finalY + 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      missingStaff.forEach(m => {
        doc.text(`• ${m.name} | Dept: ${m.department} | Floor: ${m.officeLocation} | Phone: ${m.phone}`, 20, missingY);
        missingY += 5;
      });

      finalY = missingY + 4;
    }

    // 5. Complete Personnel Roll-Call Table
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PERSONNEL MUSTER ROSTER RECORD', 14, finalY);

    const rosterRows = staffList.map((s, idx) => {
      const c = checkIns[s.id];
      const status = c ? c.status : 'UNACCOUNTED';
      const time = c ? new Date(c.timestamp).toLocaleTimeString() : 'N/A';
      const muster = c ? c.musterPointName : 'None';
      const method = c ? (c.checkInMethod === 'SELF_APP' ? 'Self-Mobile' : 'Warden Sight') : 'None';
      return [
        idx + 1,
        s.name,
        s.department,
        s.officeLocation,
        status,
        time,
        muster,
        method
      ];
    });

    doc.autoTable({
      startY: finalY + 3,
      head: [['#', 'Name', 'Department', 'Location', 'Status', 'Time', 'Muster Station', 'Verification']],
      body: rosterRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 1.5 }
    });

    // Sign off
    finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 260) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('INCIDENT COMMAND SIGN-OFF:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('Chief Incident Warden: ____________________    Date: __________    Time: __________', 14, finalY + 8);
    doc.text('Lead Safety Compliance Officer: ________________    Date: __________    Signature: __________', 14, finalY + 16);

    doc.save(`Evacuation_Report_${incident.id}.pdf`);
  } catch (err) {
    console.error('Client PDF Generation Error:', err);
    alert('Failed to generate PDF: ' + err.message);
  }
}

export function downloadClientExcel(incident, staffList) {
  try {
    const checkIns = incident.checkIns || {};
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ['Emergency Muster & Evacuation Incident Log'],
      ['Incident ID', incident.id],
      ['Incident Type', incident.type],
      ['Status', incident.status],
      ['Declared At', incident.declaredAt],
      ['All Clear At', incident.allClearAt || 'Active'],
      ['Duration (Seconds)', incident.durationSeconds || 'Active'],
      ['Declared By', incident.declaredBy],
      ['Total Headcount', incident.totalStaff || staffList.length],
      ['Accounted', incident.accountedCount || 0],
      ['Unaccounted', incident.unaccountedCount || 0],
      ['Notes', incident.notes || '']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Summary');

    const rosterData = staffList.map(s => {
      const c = checkIns[s.id];
      return {
        'Employee ID': s.id,
        'Full Name': s.name,
        'Department': s.department,
        'Role': s.role,
        'Office Location': s.officeLocation,
        'Phone': s.phone,
        'Is Warden': s.isWarden ? 'Yes' : 'No',
        'Accountability Status': c ? c.status : 'UNACCOUNTED',
        'Check-in Timestamp': c ? c.timestamp : '',
        'Muster Point': c ? c.musterPointName : '',
        'Check-In Method': c ? c.checkInMethod : '',
        'GPS Verification': c ? c.gpsStatus : '',
        'Distance to Muster (m)': c ? c.distanceMeters : '',
        'Verified By': c ? c.verifiedBy : ''
      };
    });
    const wsRoster = XLSX.utils.json_to_sheet(rosterData);
    XLSX.utils.book_append_sheet(workbook, wsRoster, 'Roster Check-Ins');

    XLSX.writeFile(workbook, `Evacuation_Audit_${incident.id}.xlsx`);
  } catch (err) {
    console.error('Client Excel Generation Error:', err);
    alert('Failed to generate Excel: ' + err.message);
  }
}
