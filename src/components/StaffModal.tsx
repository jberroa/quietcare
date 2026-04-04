import React, { useState } from 'react';
import { StaffMember, HospitalUnit } from '../types';
import { X, UserPlus, User, Briefcase, Building2, Mail, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: Omit<StaffMember, 'id'>) => void;
  units: HospitalUnit[];
  initialData?: StaffMember | null;
}

export const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose, onSave, units, initialData }) => {
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    role: initialData?.role || 'Nurse',
    unitId: initialData?.unitId || units[0]?.id || '',
    status: initialData?.status || 'active' as const,
    email: initialData?.email || '',
    pincode: initialData?.pincode || '',
    isAdmin: initialData?.isAdmin || false,
    notificationPreferences: initialData?.notificationPreferences || {
      thresholdAlerts: true,
      peakAlerts: true,
      criticalFeedback: true,
      systemAlerts: false,
    },
  });

  React.useEffect(() => {
    setError(null);
    if (initialData) {
      setFormData({
        name: initialData.name,
        role: initialData.role,
        unitId: initialData.unitId,
        status: initialData.status,
        email: initialData.email || '',
        pincode: initialData.pincode || '',
        isAdmin: initialData.isAdmin || false,
        notificationPreferences: initialData.notificationPreferences || {
          thresholdAlerts: true,
          peakAlerts: true,
          criticalFeedback: true,
          systemAlerts: false,
        },
      });
    } else {
      setFormData({
        name: '',
        role: 'Nurse',
        unitId: units[0]?.id || '',
        status: 'active',
        email: '',
        pincode: '',
        isAdmin: false,
        notificationPreferences: {
          thresholdAlerts: true,
          peakAlerts: true,
          criticalFeedback: true,
          systemAlerts: false,
        },
      });
    }
  }, [initialData, units]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {initialData ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="e.g. John Smith"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option>Nurse</option>
                  <option>Physician</option>
                  <option>Quiet Compliance Officer</option>
                  <option>Unit Manager</option>
                  <option>Housekeeping</option>
                  <option>Maintenance</option>
                  <option>Security</option>
                  <option>Dietary</option>
                  <option>Patient Transport</option>
                  <option>Social Worker</option>
                  <option>Pharmacist</option>
                  <option>Respiratory Therapist</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="email"
                  placeholder="e.g. john@hospital.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Login Pincode</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="password"
                    maxLength={4}
                    placeholder="4 digits"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Admin Access</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isAdmin: !formData.isAdmin })}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all",
                    formData.isAdmin 
                      ? "bg-blue-50 border-blue-200 text-blue-600" 
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}
                >
                  <ShieldCheck className={cn("w-4 h-4", formData.isAdmin ? "text-blue-600" : "text-slate-300")} />
                  {formData.isAdmin ? 'Admin' : 'Standard'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Assigned Unit</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none"
                  value={formData.unitId}
                  onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                >
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Email Notification Preferences</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'thresholdAlerts', label: 'Threshold Alerts', desc: 'Noise exceeding target' },
                  { id: 'peakAlerts', label: 'Peak Noise Alerts', desc: 'Sudden loud spikes' },
                  { id: 'criticalFeedback', label: 'Critical Feedback', desc: 'Poor patient scores' },
                  { id: 'systemAlerts', label: 'System Alerts', desc: 'Sensor/Connection issues' },
                ].map((pref) => (
                  <label key={pref.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{pref.label}</span>
                      <span className="text-[10px] text-slate-500">{pref.desc}</span>
                    </div>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={(formData.notificationPreferences as any)[pref.id]}
                      onChange={(e) => setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          [pref.id]: e.target.checked
                        }
                      })}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {initialData ? 'Update Staff Member' : 'Register Staff'}
          </button>
        </form>
      </div>
    </div>
  );
};
