import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Building,
  Phone,
  MapPin,
  Shield
} from 'lucide-react';
import { useIncident } from '../context/IncidentContext';

export function StaffManagerModal({ isOpen, onClose }) {
  const {
    staffDirectory,
    addStaffMember,
    deleteStaffMember,
    importStaffList,
    resetStaffDirectory
  } = useIncident();

  const [activeTab, setActiveTab] = useState('add'); // 'add', 'import', 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Form state for adding single employee
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [isWarden, setIsWarden] = useState(false);

  // File import state
  const [importedPreview, setImportedPreview] = useState([]);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPerson = {
      id: `EMP-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}@yourcompany.com`,
      department: department.trim() || 'General Operations',
      role: role.trim() || 'Staff Member',
      officeLocation: officeLocation.trim() || 'Main Building',
      phone: phone.trim() || '+1 (555) 000-0000',
      isWarden: !!isWarden
    };

    addStaffMember(newPerson);
    setFeedback({ type: 'success', text: `Added "${name}" to staff directory!` });

    // Reset form
    setName('');
    setDepartment('');
    setOfficeLocation('');
    setPhone('');
    setRole('');
    setIsWarden(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (!Array.isArray(rawData) || rawData.length === 0) {
          setFeedback({ type: 'error', text: 'No rows found in uploaded file.' });
          return;
        }

        // Map columns intelligently
        const parsed = rawData.map((row, idx) => {
          const rowName = row['Full Name'] || row['Name'] || row['name'] || row['Employee Name'] || `Employee ${idx + 1}`;
          const rowDept = row['Department'] || row['dept'] || row['department'] || 'General';
          const rowLoc = row['Office Location'] || row['Location'] || row['Floor'] || row['location'] || 'Main Building';
          const rowPhone = row['Mobile Number'] || row['Phone'] || row['phone'] || row['Mobile'] || '';
          const rowRole = row['Job Title'] || row['Role'] || row['role'] || 'Staff Member';
          const rowWarden = row['Is Warden'] === 'Yes' || row['Is Warden'] === true || row['Warden'] === 'Yes' || false;

          return {
            id: `EMP-${Date.now().toString().slice(-3)}${idx}`,
            name: String(rowName).trim(),
            email: `${String(rowName).trim().toLowerCase().replace(/\s+/g, '.')}@yourcompany.com`,
            department: String(rowDept).trim(),
            role: String(rowRole).trim(),
            officeLocation: String(rowLoc).trim(),
            phone: String(rowPhone).trim(),
            isWarden: !!rowWarden
          };
        });

        setImportedPreview(parsed);
        setFeedback({ type: 'success', text: `Loaded ${parsed.length} staff members from ${file.name}. Review below and confirm import.` });
      } catch (err) {
        console.error('File parsing error:', err);
        setFeedback({ type: 'error', text: 'Failed to parse file: ' + err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = (replace = true) => {
    if (importedPreview.length === 0) return;
    importStaffList(importedPreview, replace);
    setFeedback({
      type: 'success',
      text: `Successfully imported ${importedPreview.length} staff members into the directory!`
    });
    setImportedPreview([]);
    setFileName('');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Full Name': 'John Doe',
        'Department': 'Finance & Accounting',
        'Job Title': 'Senior Accountant',
        'Office Location': 'Floor 3 - Room 302',
        'Mobile Number': '+1 (555) 123-4567',
        'Is Warden': 'No'
      },
      {
        'Full Name': 'Jane Smith',
        'Department': 'People & Culture (HR)',
        'Job Title': 'HR Lead',
        'Office Location': 'Floor 1 - Room 108',
        'Mobile Number': '+1 (555) 987-6543',
        'Is Warden': 'Yes'
      },
      {
        'Full Name': 'David Okon',
        'Department': 'Engineering & IT',
        'Job Title': 'DevOps Engineer',
        'Office Location': 'Floor 2 - Open Bay 2A',
        'Mobile Number': '+1 (555) 456-7890',
        'Is Warden': 'No'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Directory Template');
    XLSX.writeFile(wb, 'Staff_Directory_Template.xlsx');
  };

  const filteredStaff = staffDirectory.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.officeLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 rounded-xl text-white shadow">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Manage Staff Directory
              </h2>
              <p className="text-xs text-slate-400">
                Add, upload, or edit your organization's employee headcount ({staffDirectory.length} total staff).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-200'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('add')}
            className={`py-2 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Single Person</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel / CSV Import</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>View All ({staffDirectory.length})</span>
          </button>
        </div>

        {/* TAB 1: ADD SINGLE PERSON */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Stephen Ilobah"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Operations & Logistics"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Office Location / Floor
                </label>
                <input
                  type="text"
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  placeholder="e.g. Floor 2 - Room 204"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +234 801 234 5678"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Job Role / Title
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Project Manager"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="wardenCheck"
                checked={isWarden}
                onChange={(e) => setIsWarden(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="wardenCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                Designate as Emergency Safety Warden
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add to Organization Directory</span>
            </button>
          </form>
        )}

        {/* TAB 2: EXCEL / CSV IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Bulk Import From Spreadsheet
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload an Excel (.xlsx) or CSV file with your organization's staff list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-slate-700 hover:border-red-500 rounded-xl p-6 text-center block cursor-pointer transition-colors bg-slate-900/50">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <span className="text-xs font-bold text-white block">
                  Click to select Excel (.xlsx) or CSV file
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Expected columns: Full Name, Department, Location, Phone
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fileName && (
                <div className="text-xs text-emerald-400 font-mono">
                  Selected file: {fileName}
                </div>
              )}
            </div>

            {/* Preview & Confirmation */}
            {importedPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Preview: {importedPreview.length} staff to import
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmImport(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl"
                    >
                      Append to List
                    </button>
                    <button
                      onClick={() => handleConfirmImport(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white rounded-xl shadow"
                    >
                      Replace Entire List
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 text-xs bg-slate-950">
                  {importedPreview.slice(0, 15).map((p, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.department} • {p.officeLocation}</div>
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        {p.phone}
                      </div>
                    </div>
                  ))}
                  {importedPreview.length > 15 && (
                    <div className="p-2 text-center text-slate-500 text-[11px]">
                      + {importedPreview.length - 15} more employees
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIEW & DELETE EXISTING STAFF */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name or department..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset staff directory back to the 12 default demo employees?')) {
                    resetStaffDirectory();
                    setFeedback({ type: 'success', text: 'Reset to default directory.' });
                  }
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs flex items-center gap-1 transition-colors"
                title="Reset to default demo staff"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Demo</span>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No staff members found matching "{searchQuery}"
                </div>
              ) : (
                filteredStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-2.5 bg-slate-950/60 hover:bg-slate-950 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{staff.name}</span>
                        {staff.isWarden && (
                          <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[8px] font-black uppercase">
                            Warden
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {staff.department} • <span className="text-slate-300">{staff.officeLocation}</span>
                      </div>
                      {staff.phone && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {staff.phone}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteStaffMember(staff.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title={`Remove ${staff.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Changes save automatically to your phone/browser.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
