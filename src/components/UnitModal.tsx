import React, { useState } from 'react';
import { HospitalUnit } from '../types';
import { X, Plus, Building2, Target, Hash, CheckCircle2 } from 'lucide-react';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unit: Omit<HospitalUnit, 'id' | 'createdAt'>) => void;
  initialData?: HospitalUnit | null;
}

export const UnitModal: React.FC<UnitModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    type: initialData?.type || '',
    location: initialData?.location || '',
    floor: initialData?.floor || '',
    department: initialData?.department || '',
    targetDecibel: initialData?.targetDecibel || 45,
    deviceName: initialData?.deviceName || '',
    deviceId: initialData?.deviceId || '',
    readingSource: (initialData?.readingSource === 'live' ? 'live' : 'demo') as 'demo' | 'live',
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        location: initialData.location,
        floor: initialData.floor,
        department: initialData.department,
        targetDecibel: initialData.targetDecibel,
        deviceName: initialData.deviceName,
        deviceId: initialData.deviceId,
        readingSource: initialData.readingSource === 'live' ? 'live' : 'demo',
      });
    } else {
      setFormData({ 
        name: '', 
        type: '', 
        location: '', 
        floor: '', 
        department: '', 
        targetDecibel: 45,
        deviceName: '',
        deviceId: '',
        readingSource: 'demo',
      });
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {initialData ? 'Edit Hospital Unit' : 'New Hospital Unit'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Unit Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="e.g. ICU North"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Unit Type</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Inpatient"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Department</label>
                <input
                  required
                  type="text"
                  placeholder="Cardiology"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Floor</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="4"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Location</label>
                <input
                  required
                  type="text"
                  placeholder="North Wing"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sensor Configuration</p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">Data mode</label>
                <select
                  value={formData.readingSource}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      readingSource: e.target.value === 'live' ? 'live' : 'demo',
                    })
                  }
                  className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-bold"
                >
                  <option value="demo">Demo (simulated in browser)</option>
                  <option value="live">Live (server polls Tuya; needs real device id)</option>
                </select>
              </div>
              <p className="text-[11px] text-blue-700/90 leading-relaxed">
                For live mode, use the Tuya IoT cloud device id (same id used in{' '}
                <code className="text-[10px] bg-blue-100/80 px-1 rounded">/v1.0/devices/&#123;device_id&#125;</code>
                ). Friendly label below is for display only.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">Device label</label>
                  <input
                    required
                    type="text"
                    placeholder="SN-102"
                    className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    value={formData.deviceName}
                    onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">Tuya device ID</label>
                  <input
                    required
                    type="text"
                    placeholder="eb79… (from Tuya IoT)"
                    className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                    value={formData.deviceId}
                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Target Decibels (dB)
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="number"
                  min="20"
                  max="100"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  value={formData.targetDecibel}
                  onChange={(e) => setFormData({ ...formData, targetDecibel: parseInt(e.target.value) })}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-400 italic">WHO recommends 35-45dB for patient rooms.</p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
          >
            {initialData ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {initialData ? 'Update Unit' : 'Create Unit'}
          </button>
        </form>
      </div>
    </div>
  );
};
