import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Plus, 
  LayoutDashboard, 
  Settings, 
  Bell, 
  Search,
  Building2,
  Volume2,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Clock,
  Target,
  MessageSquare,
  Star,
  User,
  Loader2,
  CheckCircle2,
  Zap,
  Edit,
  Trash2,
  Calendar,
  Moon,
  Sparkles,
  Hash,
  QrCode,
  Share2,
  BookOpen,
  Wind,
  Library,
  CloudRain
} from 'lucide-react';
import { format } from 'date-fns';
import { HospitalUnit, NoiseReading, PatientFeedback, StaffMember, Meeting, Alert } from './types';
import { NoiseChart } from './components/NoiseChart';
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { UnitModal } from './components/UnitModal';
import { StaffModal } from './components/StaffModal';
import { MeetingModal } from './components/MeetingModal';
import { FeedbackForm } from './components/FeedbackForm';
import { ProductShowcase } from './components/ProductShowcase';
import { UnitQRCodeModal } from './components/UnitQRCodeModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { cn } from './lib/utils';

// Initial Mock Data
const INITIAL_UNITS: HospitalUnit[] = [
  { 
    id: '1', 
    name: 'ICU East', 
    type: 'Critical Care',
    location: 'Main Building',
    floor: '4', 
    department: 'Critical Care', 
    targetDecibel: 40, 
    deviceName: 'SN-ICU-01',
    deviceId: 'QC-1001',
    createdAt: Date.now() 
  },
  { 
    id: '2', 
    name: 'Maternity A', 
    type: 'Inpatient',
    location: 'Women\'s Center',
    floor: '2', 
    department: 'Obstetrics', 
    targetDecibel: 35, 
    deviceName: 'SN-MAT-05',
    deviceId: 'QC-2005',
    createdAt: Date.now() 
  },
];

const INITIAL_STAFF: StaffMember[] = [
  { 
    id: 'admin', name: 'System Admin', role: 'Administrator', unitId: '1', status: 'active', pincode: '0000', isAdmin: true, email: 'admin@quietcare.com',
    notificationPreferences: { thresholdAlerts: true, peakAlerts: true, criticalFeedback: true, systemAlerts: true }
  },
  { 
    id: 's1', name: 'Dr. Sarah Chen', role: 'Chief of Medicine', unitId: '1', status: 'active', pincode: '1234', email: 'sarah.chen@hospital.com',
    notificationPreferences: { thresholdAlerts: true, peakAlerts: true, criticalFeedback: true, systemAlerts: false }
  },
  { 
    id: 's2', name: 'Nurse Mark', role: 'Nurse', unitId: '1', status: 'active', pincode: '1111', email: 'mark.nurse@hospital.com',
    notificationPreferences: { thresholdAlerts: true, peakAlerts: false, criticalFeedback: true, systemAlerts: false }
  },
  { 
    id: 's3', name: 'Officer Jane', role: 'Quiet Compliance Officer', unitId: '2', status: 'active', pincode: '2222', email: 'jane.quiet@hospital.com',
    notificationPreferences: { thresholdAlerts: true, peakAlerts: true, criticalFeedback: true, systemAlerts: true }
  },
  { 
    id: 's4', name: 'Miguel Rodriguez', role: 'Housekeeping', unitId: '1', status: 'active', pincode: '3333', email: 'miguel.r@hospital.com',
    notificationPreferences: { thresholdAlerts: false, peakAlerts: false, criticalFeedback: false, systemAlerts: false }
  },
  { 
    id: 's5', name: 'Sam Wilson', role: 'Maintenance', unitId: '2', status: 'active', pincode: '4444', email: 'sam.w@hospital.com',
    notificationPreferences: { thresholdAlerts: false, peakAlerts: false, criticalFeedback: false, systemAlerts: true }
  },
];

import { jsPDF } from 'jspdf';
import { AnalyticsChart } from './components/AnalyticsChart';
import { LogOut, Lock, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    const saved = localStorage.getItem('quietcare_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Units' | 'Staff' | 'Committee' | 'Analytics' | 'Product' | 'Settings' | 'Education' | 'Feedback'>('Dashboard');
  const [units, setUnits] = useState<HospitalUnit[]>(() => {
    const saved = localStorage.getItem('quietcare_units');
    return saved ? JSON.parse(saved) : INITIAL_UNITS;
  });
  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('quietcare_staff');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: If staff data is empty or lacks pincodes, reset to initial staff
      if (parsed.length === 0 || !parsed.some((s: any) => s.pincode)) {
        return INITIAL_STAFF;
      }
      return parsed;
    }
    return INITIAL_STAFF;
  });

  useEffect(() => {
    localStorage.setItem('quietcare_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = staff.find(s => s.pincode === loginPin);
    if (user) {
      setCurrentUser(user);
      setLoginPin('');
      setLoginError('');
    } else {
      setLoginError('Invalid Pincode. Please try again.');
      setLoginPin('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('Dashboard');
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    const saved = localStorage.getItem('quietcare_meetings');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('quietcare_units', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem('quietcare_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('quietcare_meetings', JSON.stringify(meetings));
  }, [meetings]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(INITIAL_UNITS[0].id);
  const [readings, setReadings] = useState<Record<string, NoiseReading[]>>({});
  const [feedback, setFeedback] = useState<Record<string, PatientFeedback[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<HospitalUnit | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [selectedUnitForQR, setSelectedUnitForQR] = useState<HospitalUnit | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem('quietcare_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('quietcare_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // URL-based routing for feedback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const unitId = params.get('unitId');
    
    if (view === 'feedback' && unitId) {
      setActiveTab('Feedback');
      setSelectedUnitId(unitId);
    }
  }, []);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('quietcare_settings');
    return saved ? JSON.parse(saved) : {
      notifications: true,
      aiFrequency: 'Every 15 Minutes',
      retention: '90 Days'
    };
  });

  useEffect(() => {
    localStorage.setItem('quietcare_settings', JSON.stringify(settings));
  }, [settings]);

  // Analytics State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const selectedUnit = units.find(u => u.id === selectedUnitId) || units[0];

  // Simulate real-time noise data
  useEffect(() => {
    const interval = setInterval(() => {
      setReadings(prev => {
        const newReadings = { ...prev };
        const newAlerts: Alert[] = [];

        units.forEach(unit => {
          if (!newReadings[unit.id]) newReadings[unit.id] = [];
          
          const base = unit.targetDecibel;
          // Occasionally simulate high noise for testing alerts
          const isTestingAlert = Math.random() > 0.95;
          const noise = isTestingAlert 
            ? base + 15 + Math.random() * 10 
            : base + Math.random() * 20 - 5; 
          
          const isPeak = noise > unit.targetDecibel + 15;
          
          const newReading: NoiseReading = {
            id: Math.random().toString(36).substr(2, 9),
            unitId: unit.id,
            timestamp: Date.now(),
            decibels: Math.round(noise),
            isPeak
          };

          const unitReadings = [...newReadings[unit.id].slice(-100), newReading];
          newReadings[unit.id] = unitReadings;

          // Alert Logic: Consistently exceeds target for a duration
          // For demo purposes, let's say last 5 readings (approx 15 seconds) are all > target + 5
          if (settings.notifications && unitReadings.length >= 5) {
            const last5 = unitReadings.slice(-5);
            const allHigh = last5.every(r => r.decibels > unit.targetDecibel + 5);
            
            if (allHigh) {
              // Check if we already have a recent alert for this unit to avoid spam
              const recentAlert = alerts.find(a => 
                a.unitId === unit.id && 
                a.type === 'threshold' && 
                Date.now() - a.timestamp < 60000 // 1 minute cooldown
              );

              if (!recentAlert) {
                newAlerts.push({
                  id: Math.random().toString(36).substr(2, 9),
                  unitId: unit.id,
                  timestamp: Date.now(),
                  type: 'threshold',
                  message: `High noise levels detected in ${unit.name} for over 5 minutes.`,
                  severity: 'high',
                  isRead: false
                });
              }
            }
          }
        });

        if (newAlerts.length > 0) {
          setAlerts(prevAlerts => [...newAlerts, ...prevAlerts].slice(0, 50));
        }

        return newReadings;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [units, settings.notifications, alerts]);

  const handleAddUnit = (unitData: Omit<HospitalUnit, 'id' | 'createdAt'>) => {
    if (editingUnit) {
      setUnits(units.map(u => u.id === editingUnit.id ? { ...unitData, id: editingUnit.id, createdAt: editingUnit.createdAt } : u));
      setEditingUnit(null);
    } else {
      const newUnit: HospitalUnit = {
        ...unitData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now()
      };
      setUnits([...units, newUnit]);
      setSelectedUnitId(newUnit.id);
    }
  };

  const handleDeleteUnit = (id: string) => {
    if (units.length <= 1) {
      alert("Cannot delete the last unit.");
      return;
    }
    setUnits(units.filter(u => u.id !== id));
    if (selectedUnitId === id) {
      setSelectedUnitId(units.find(u => u.id !== id)?.id || '');
    }
  };

  const handleAddStaff = (staffData: Omit<StaffMember, 'id'>) => {
    if (editingStaff) {
      setStaff(staff.map(s => s.id === editingStaff.id ? { ...staffData, id: editingStaff.id } : s));
      setEditingStaff(null);
    } else {
      const newStaff: StaffMember = {
        ...staffData,
        id: Math.random().toString(36).substr(2, 9),
      };
      setStaff([...staff, newStaff]);
    }
  };

  const handleDeleteStaff = (id: string) => {
    setStaff(staff.filter(s => s.id !== id));
  };

  const handleSaveMeeting = (meetingData: Omit<Meeting, 'id' | 'timestamp'>) => {
    if (editingMeeting) {
      setMeetings(meetings.map(m => m.id === editingMeeting.id ? { ...meetingData, id: editingMeeting.id, timestamp: editingMeeting.timestamp } : m));
      setEditingMeeting(null);
    } else {
      const newMeeting: Meeting = {
        ...meetingData,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      setMeetings([newMeeting, ...meetings]);
    }
  };

  const handleDeleteMeeting = (id: string) => {
    setMeetings(meetings.filter(m => m.id !== id));
  };

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    setReportStatus('Analyzing historical data...');
    
    setTimeout(() => {
      setReportStatus('Correlating Press Ganey scores...');
      
      setTimeout(() => {
        setReportStatus('Finalizing acoustic insights...');
        
        setTimeout(() => {
          const doc = new jsPDF();
          const blue = '#2563eb';
          const dark = '#0f172a';

          // Header
          doc.setFillColor(dark);
          doc.rect(0, 0, 210, 40, 'F');
          doc.setTextColor('#ffffff');
          doc.setFontSize(24);
          doc.setFont('helvetica', 'bold');
          doc.text('QuietCare Analytics Report', 20, 25);
          doc.setFontSize(10);
          doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 32);

          // Summary
          doc.setTextColor(dark);
          doc.setFontSize(18);
          doc.text('Executive Summary', 20, 60);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.text('This report summarizes the acoustic performance and patient satisfaction correlations', 20, 70);
          doc.text('across all monitored units for the last 30 days.', 20, 76);

          // Unit Stats
          let y = 95;
          units.forEach((unit, index) => {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blue);
            doc.text(`${index + 1}. ${unit.name}`, 20, y);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(dark);
            doc.text(`Department: ${unit.department}`, 25, y + 7);
            doc.text(`Target Level: ${unit.targetDecibel} dB`, 25, y + 13);
            doc.text(`Compliance Score: ${90 - index * 15}%`, 25, y + 19);
            
            y += 35;
          });

          // Night Shift Section
          doc.addPage();
          y = 20;
          doc.setFillColor(dark);
          doc.rect(0, 0, 210, 40, 'F');
          doc.setTextColor('#ffffff');
          doc.setFontSize(24);
          doc.setFont('helvetica', 'bold');
          doc.text('Night Shift Activity Report', 20, 25);
          doc.setFontSize(10);
          doc.text('Focus: 22:00 - 06:00 (Last 24 Hours)', 20, 32);

          doc.setTextColor(dark);
          doc.setFontSize(14);
          doc.text('Night Shift Highlights', 20, 60);
          
          y = 75;
          units.forEach((unit, index) => {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            // Mocking night shift data for the report
            const nightAvg = unit.targetDecibel + (Math.random() * 8);
            const peakCount = Math.floor(Math.random() * 6);
            const quietestHour = "03:00 AM - 04:00 AM";
            const compliance = nightAvg <= unit.targetDecibel + 5 ? "High" : "Moderate";
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blue);
            doc.text(unit.name, 20, y);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(dark);
            doc.text(`Avg Noise (Night): ${nightAvg.toFixed(1)} dB`, 25, y + 7);
            doc.text(`Peak Events (Night): ${peakCount}`, 25, y + 13);
            doc.text(`Quietest Period: ${quietestHour}`, 25, y + 19);
            doc.text(`Night Compliance: ${compliance}`, 25, y + 25);
            
            y += 45;
          });

          // Footer
          doc.setFontSize(8);
          doc.setTextColor('#94a3b8');
          doc.text('Confidential - Medamaitrak.com Acoustic Intelligence System', 20, 285);

          doc.save(`QuietCare_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
          
          setIsGeneratingReport(false);
          setReportStatus('Report Generated Successfully!');
          setTimeout(() => setReportStatus(null), 5000);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const handleAddFeedback = (fData: Omit<PatientFeedback, 'id' | 'timestamp' | 'unitId'>) => {
    const newFeedback: PatientFeedback = {
      ...fData,
      id: Math.random().toString(36).substr(2, 9),
      unitId: selectedUnitId,
      timestamp: Date.now()
    };
    setFeedback(prev => ({
      ...prev,
      [selectedUnitId]: [newFeedback, ...(prev[selectedUnitId] || [])]
    }));
  };

  const currentReadings = readings[selectedUnitId] || [];
  const currentFeedback = feedback[selectedUnitId] || [];
  const latestDb = currentReadings[currentReadings.length - 1]?.decibels || 0;
  const isOverTarget = latestDb > selectedUnit.targetDecibel;

  const getAcousticStatus = (unitId: string, targetDb: number) => {
    const unitReadings = readings[unitId] || [];
    const latestDb = unitReadings[unitReadings.length - 1]?.decibels || 0;
    
    if (latestDb === 0) return 'optimal'; // No readings yet
    if (latestDb <= targetDb) return 'optimal';
    if (latestDb <= targetDb + 10) return 'warning';
    return 'critical';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  if (activeTab === 'Feedback') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100">
              <Activity className="text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Patient Feedback</h2>
              <p className="text-slate-500 font-medium">Help us maintain a healing environment in {selectedUnit?.name}</p>
            </div>
          </div>

          <FeedbackForm 
            unitId={selectedUnitId} 
            onSubmit={(data) => {
              const newFeedback: PatientFeedback = {
                ...data,
                id: Math.random().toString(36).substr(2, 9),
                unitId: selectedUnitId,
                timestamp: Date.now()
              };
              setFeedback(prev => ({
                ...prev,
                [selectedUnitId]: [newFeedback, ...(prev[selectedUnitId] || [])]
              }));
              alert('Thank you for your feedback! We are committed to your comfort.');
            }} 
          />

          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              QuietCare Acoustic Monitoring System
            </p>
            {currentUser && (
              <button 
                onClick={() => setActiveTab('Dashboard')}
                className="mt-4 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200">
              <Activity className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">QuietCare</h1>
            <p className="text-slate-500 font-medium">Acoustic Intelligence System Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Enter Pincode</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-2xl tracking-[1em] font-mono text-center"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {loginError && (
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group"
            >
              Access Dashboard
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center space-y-4">
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Development Hint</p>
              <p className="text-[11px] text-blue-600 font-medium">Admin: 0000 • Staff: 1111</p>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Authorized Personnel Only • Medamaitrak.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-40 hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter text-slate-900">QuietCare</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Acoustic Intelligence</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={activeTab === 'Dashboard'} 
            onClick={() => setActiveTab('Dashboard')}
          />
          {currentUser.isAdmin && (
            <NavItem 
              icon={<Building2 className="w-4 h-4" />} 
              label="Units" 
              active={activeTab === 'Units'} 
              onClick={() => setActiveTab('Units')}
            />
          )}
          {currentUser.isAdmin && (
            <NavItem 
              icon={<Users className="w-4 h-4" />} 
              label="Staff" 
              active={activeTab === 'Staff'} 
              onClick={() => setActiveTab('Staff')}
            />
          )}
          <NavItem 
            icon={<MessageSquare className="w-4 h-4" />} 
            label="Committee" 
            active={activeTab === 'Committee'} 
            onClick={() => setActiveTab('Committee')}
          />
          <NavItem 
            icon={<TrendingUp className="w-4 h-4" />} 
            label="Analytics" 
            active={activeTab === 'Analytics'} 
            onClick={() => setActiveTab('Analytics')}
          />
          <NavItem 
            icon={<Zap className="w-4 h-4" />} 
            label="Product" 
            active={activeTab === 'Product'} 
            onClick={() => setActiveTab('Product')}
          />
          <NavItem 
            icon={<BookOpen className="w-4 h-4" />} 
            label="Education" 
            active={activeTab === 'Education'} 
            onClick={() => setActiveTab('Education')}
          />
          {currentUser.isAdmin && (
            <NavItem 
              icon={<Settings className="w-4 h-4" />} 
              label="Settings" 
              active={activeTab === 'Settings'} 
              onClick={() => setActiveTab('Settings')}
            />
          )}
        </nav>

        <div className="p-4 mt-auto space-y-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Log Out</span>
          </button>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-600">All Sensors Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search units or data..." 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsAlertsOpen(true)}
                className="relative p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {alerts.some(a => !a.isRead) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>
              <div className="h-8 w-[1px] bg-slate-200 mx-2" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1 justify-end">
                    {currentUser.isAdmin && <ShieldCheck className="w-3 h-3 text-blue-500" />}
                    <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">{currentUser.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden hover:bg-red-50 hover:border-red-100 transition-all group relative"
                    title="Log Out"
                  >
                    <img src={`https://picsum.photos/seed/${currentUser.id}/100/100`} alt="Avatar" referrerPolicy="no-referrer" className="group-hover:opacity-0 transition-opacity" />
                    <LogOut className="w-5 h-5 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {activeTab === 'Education' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100">
                  <BookOpen className="text-white w-8 h-8" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Acoustic Education</h2>
                <p className="text-slate-500 text-lg font-medium">Understanding decibel levels and their impact on the healing environment.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { db: 20, label: 'Whisper', desc: 'Rustling leaves or a quiet whisper at 5 feet.', color: 'bg-emerald-500', icon: <Wind className="w-6 h-6" /> },
                  { db: 30, label: 'Quiet Room', desc: 'A very quiet bedroom or a secluded study area.', color: 'bg-emerald-400', icon: <Moon className="w-6 h-6" /> },
                  { db: 40, label: 'Library', desc: 'The gold standard for hospital quiet zones. Ideal for healing.', color: 'bg-green-500', icon: <Library className="w-6 h-6" /> },
                  { db: 50, label: 'Moderate Rain', desc: 'Quiet office or moderate rainfall. Acceptable during daytime.', color: 'bg-yellow-400', icon: <CloudRain className="w-6 h-6" /> },
                  { db: 60, label: 'Conversation', desc: 'Normal conversation at 3 feet. Can be disruptive at night.', color: 'bg-yellow-500', icon: <Users className="w-6 h-6" /> },
                  { db: 70, label: 'Vacuum Cleaner', desc: 'Loud conversation or a vacuum cleaner. Highly disruptive.', color: 'bg-orange-500', icon: <Volume2 className="w-6 h-6" /> },
                  { db: 80, label: 'Busy Street', desc: 'Garbage disposal or loud alarm clock. Stress-inducing.', color: 'bg-red-500', icon: <AlertTriangle className="w-6 h-6" /> },
                  { db: 90, label: 'Shouting', desc: 'Power mower or shouting. Can cause hearing damage over time.', color: 'bg-red-600', icon: <Zap className="w-6 h-6" /> },
                  { db: 100, label: 'Jet Takeoff', desc: 'Extremely loud. Immediate risk to patient comfort and safety.', color: 'bg-red-700', icon: <Activity className="w-6 h-6" /> },
                ].map((item) => (
                  <div key={item.db} className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn("p-4 rounded-2xl text-white shadow-lg", item.color)}>
                        {item.icon}
                      </div>
                      <div className="text-right">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{item.db}</span>
                        <span className="text-sm font-bold text-slate-400 ml-1">dB</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">{item.label}</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                    <div className="mt-6 pt-6 border-t border-slate-50">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full transition-all duration-1000", item.color)} style={{ width: `${item.db}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 rounded-[40px] p-12 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32" />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-black tracking-tight">Why Quiet Matters</h3>
                    <div className="space-y-4">
                      {[
                        { title: 'Faster Recovery', desc: 'Patients in quiet environments require less pain medication and recover up to 15% faster.' },
                        { title: 'Reduced Stress', desc: 'Lower noise levels reduce cortisol levels in both patients and healthcare providers.' },
                        { title: 'Improved Sleep', desc: 'Uninterrupted sleep cycles are critical for immune system function and cognitive health.' },
                      ].map((benefit, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{benefit.title}</h4>
                            <p className="text-slate-400 text-sm">{benefit.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                    <h4 className="text-xl font-bold mb-4">The WHO Standard</h4>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                      The World Health Organization (WHO) recommends that continuous background noise in hospital patient rooms should not exceed <span className="text-blue-400 font-bold">35 dB</span> during the day and <span className="text-blue-400 font-bold">30 dB</span> at night.
                    </p>
                    <div className="p-4 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                      <p className="text-xs font-medium italic text-blue-200">
                        "Noise is not just a nuisance; it is a significant health risk that affects the physiological and psychological well-being of patients."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Dashboard' && (
            <>
              {/* Welcome & Unit Selector */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Unit Overview</h2>
                  <p className="text-slate-500 font-medium">Monitoring acoustic health across {units.length} hospital units.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {units.map(unit => {
                      const status = getAcousticStatus(unit.id, unit.targetDecibel);
                      return (
                        <button
                          key={unit.id}
                          onClick={() => setSelectedUnitId(unit.id)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                            selectedUnitId === unit.id 
                              ? "bg-slate-900 text-white shadow-md" 
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(status))} />
                          {unit.name}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-100 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  icon={<Volume2 className="w-5 h-5 text-blue-600" />} 
                  label="Current Level" 
                  value={`${latestDb} dB`}
                  trend={isOverTarget ? "Above Target" : "Optimal"}
                  trendColor={isOverTarget ? "text-red-500" : "text-green-500"}
                />
                <StatCard 
                  icon={<Target className="w-5 h-5 text-purple-600" />} 
                  label="Unit Target" 
                  value={`${selectedUnit.targetDecibel} dB`}
                  trend={`${selectedUnit.department}`}
                  trendColor="text-slate-400"
                />
                <StatCard 
                  icon={<Users className="w-5 h-5 text-orange-600" />} 
                  label="Patient Score" 
                  value={currentFeedback.length > 0 
                    ? (currentFeedback.reduce((a, b) => a + b.score, 0) / currentFeedback.length).toFixed(1) 
                    : "N/A"}
                  trend={`${currentFeedback.length} Feedbacks`}
                  trendColor="text-slate-400"
                />
                <StatCard 
                  icon={<Clock className="w-5 h-5 text-green-600" />} 
                  label="Quiet Hours" 
                  value="82%"
                  trend="+4% from last week"
                  trendColor="text-green-500"
                />
              </div>

              {/* Main Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Chart & Feedback */}
                <div className="lg:col-span-2 space-y-8">
                  <NoiseChart readings={currentReadings} targetDecibel={selectedUnit.targetDecibel} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FeedbackForm unitId={selectedUnitId} onSubmit={handleAddFeedback} />
                    
                    {/* Recent Feedback List */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Feedback</h3>
                        <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">View All</button>
                      </div>
                      <div className="flex-1 space-y-4 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                        {currentFeedback.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                            <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs italic">No feedback yet for this unit.</p>
                          </div>
                        ) : (
                          currentFeedback.map(f => (
                            <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={cn("w-2.5 h-2.5", i < f.score ? "text-yellow-400 fill-yellow-400" : "text-slate-300")} />
                                  ))}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400">{format(f.timestamp, 'MMM d, HH:mm')}</span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2 italic">"{f.comment}"</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Insights */}
                <div className="lg:col-span-1">
                  <AIInsightsPanel 
                    unit={selectedUnit} 
                    readings={currentReadings} 
                    feedback={currentFeedback} 
                  />
                </div>
              </div>

              {/* Alerts Section */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 mb-1">Active Acoustic Alerts</h4>
                  <p className="text-sm text-red-700 mb-4">Multiple noise spikes detected in ICU East during the last 15 minutes. Patient feedback indicates "loud staff conversations" near room 402.</p>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all">Dispatch Quiet Team</button>
                    <button className="px-4 py-2 bg-white text-red-600 border border-red-200 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-50 transition-all">Acknowledge</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Units' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Hospital Units</h2>
                  <p className="text-slate-500 font-medium">Full profile management for all acoustic monitoring zones.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingUnit(null);
                    setIsModalOpen(true);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New Unit
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {units.map(unit => (
                  <div key={unit.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                    <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      <div className="flex items-start gap-6">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <Building2 className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", getStatusColor(getAcousticStatus(unit.id, unit.targetDecibel)))} />
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{unit.name}</h3>
                            </div>
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                              {unit.type}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-300" />
                              <span>{unit.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-slate-300" />
                              <span>Floor {unit.floor}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-300" />
                              <span>Created {format(unit.createdAt, 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</span>
                          <span className="text-sm font-bold text-slate-700">{unit.location}</span>
                        </div>
                        <div className="px-6 py-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Sensor Assigned</span>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-blue-900">{unit.deviceName}</span>
                              <span className="text-[10px] font-bold text-blue-500 font-mono">{unit.deviceId}</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button 
                            onClick={() => {
                              setSelectedUnitForQR(unit);
                              setIsQRCodeModalOpen(true);
                            }}
                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                            title="Generate QR Code"
                          >
                            <QrCode className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingUnit(unit);
                              setIsModalOpen(true);
                            }}
                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 rounded-xl transition-all shadow-sm"
                            title="Edit Profile"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUnit(unit.id)}
                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                            title="Delete Unit"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedUnitId(unit.id);
                              setActiveTab('Dashboard');
                            }}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                          >
                            View Monitor
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Staff' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Staff Directory</h2>
                  <p className="text-slate-500 font-medium">Managing nursing staff and quiet-time compliance officers.</p>
                </div>
                <button 
                  onClick={() => setIsStaffModalOpen(true)}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff Member
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map(member => {
                  const unit = units.find(u => u.id === member.unitId);
                  return (
                    <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{member.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{member.role}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{unit?.name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setEditingStaff(member);
                            setIsStaffModalOpen(true);
                          }}
                          className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Edit Staff"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(member.id)}
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'Committee' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quietness Committee</h2>
                  <p className="text-sm text-slate-500 mt-1">Conduct, document, and review hospital quietness initiatives.</p>
                </div>
                <button 
                  onClick={() => setIsMeetingModalOpen(true)}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Meeting
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {meetings.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Meetings Recorded</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">Start your first Quietness Committee meeting to document initiatives and track decisions.</p>
                    <button 
                      onClick={() => setIsMeetingModalOpen(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-500 transition-all"
                    >
                      Conduct First Meeting
                    </button>
                  </div>
                ) : (
                  meetings.map(meeting => (
                    <div key={meeting.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 rounded-2xl">
                            <Calendar className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">{meeting.title}</h3>
                            <p className="text-xs text-slate-500 font-medium">{format(meeting.timestamp, 'MMMM do, yyyy • h:mm a')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingMeeting(meeting);
                              setIsMeetingModalOpen(true);
                            }}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                          >
                            Review Minutes
                          </button>
                          <button 
                            onClick={() => handleDeleteMeeting(meeting.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendees</h4>
                          <div className="flex flex-wrap gap-1">
                            {meeting.attendees.map(id => {
                              const member = staff.find(s => s.id === id);
                              return (
                                <span key={id} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                                  {member?.name || 'Unknown'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decisions</h4>
                          <ul className="space-y-1">
                            {meeting.decisions.slice(0, 3).map((d, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-1">{d}</span>
                              </li>
                            ))}
                            {meeting.decisions.length > 3 && (
                              <li className="text-[10px] text-slate-400 font-bold italic">+{meeting.decisions.length - 3} more...</li>
                            )}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Steps</h4>
                          <ul className="space-y-1">
                            {meeting.nextSteps.slice(0, 3).map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                <span className="line-clamp-1">{s}</span>
                              </li>
                            ))}
                            {meeting.nextSteps.length > 3 && (
                              <li className="text-[10px] text-slate-400 font-bold italic">+{meeting.nextSteps.length - 3} more...</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'Analytics' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Historical Analytics</h2>
                  <p className="text-slate-500 font-medium">Deep-dive into long-term noise trends, Press Ganey correlations, and night shift activity reports.</p>
                </div>
                <button 
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  {isGeneratingReport ? 'Processing...' : 'Generate Report'}
                </button>
              </div>

              {reportStatus && (
                <div className={cn(
                  "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                  reportStatus.includes('Successfully') ? "bg-green-50 border-green-100 text-green-700" : "bg-blue-50 border-blue-100 text-blue-700"
                )}>
                  {reportStatus.includes('Successfully') ? <CheckCircle2 className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                  <span className="text-sm font-bold">{reportStatus}</span>
                </div>
              )}

              {/* Night Shift Activity Section */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                      <Moon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Night Shift Activity</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Last 24 Hours • 22:00 - 06:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Contextualized</span>
                  </div>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Noise Metrics</h4>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Within Target</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Level</p>
                        <p className="text-2xl font-black text-slate-900">38.4<span className="text-xs font-medium text-slate-400 ml-1">dB</span></p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peak Events</p>
                        <p className="text-2xl font-black text-slate-900">12</p>
                      </div>
                    </div>
                    <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Insight
                      </p>
                      <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                        Noise levels peaked at 02:15 AM due to staff shift change. Recommend staggered handovers to maintain acoustic stability.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notable Feedback</h4>
                    <div className="space-y-3">
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex text-amber-400">
                            {[...Array(4)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                            <Star className="w-3 h-3 text-slate-200" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">Room 402 • 02:45 AM</span>
                        </div>
                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          "The hallway was quite loud during the night shift change. It was hard to stay asleep."
                        </p>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">Room 415 • 05:12 AM</span>
                        </div>
                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          "Very quiet night, much better than last week. Thank you for the silence!"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance Timeline</h4>
                    <div className="space-y-4">
                      {[
                        { time: '22:00', level: 35, status: 'Quiet' },
                        { time: '00:00', level: 38, status: 'Quiet' },
                        { time: '02:00', level: 45, status: 'Peak' },
                        { time: '04:00', level: 34, status: 'Quiet' },
                        { time: '06:00', level: 40, status: 'Target' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-slate-400 w-10">{item.time}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                item.level > 40 ? "bg-amber-500" : "bg-blue-500"
                              )} 
                              style={{ width: `${(item.level / 60) * 100}%` }} 
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-900 w-8">{item.level}dB</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">Overall Night Score</span>
                        <span className="text-indigo-600">88% Compliance</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Noise vs Satisfaction (Last 30 Days)</h3>
                  <div className="h-64">
                    <AnalyticsChart />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Unit Compliance Ranking</h3>
                  <div className="space-y-4">
                    {units.map((u, i) => (
                      <div key={u.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-300">0{i+1}</span>
                          <span className="text-sm font-bold text-slate-700">{u.name}</span>
                        </div>
                        <div className="flex-1 mx-8 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${90 - i * 15}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-900">{90 - i * 15}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h2>
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">Push Notifications</h4>
                    <p className="text-xs text-slate-500">Alert staff when noise exceeds target for {'>'}5 mins</p>
                  </div>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, notifications: !s.notifications }))}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors",
                      settings.notifications ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                      settings.notifications ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">AI Analysis Frequency</h4>
                    <p className="text-xs text-slate-500">How often Gemini generates unit insights</p>
                  </div>
                  <select 
                    value={settings.aiFrequency}
                    onChange={(e) => setSettings(s => ({ ...s, aiFrequency: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Every 15 Minutes</option>
                    <option>Hourly</option>
                    <option>Daily Summary</option>
                  </select>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">Data Retention</h4>
                    <p className="text-xs text-slate-500">How long to store raw decibel readings</p>
                  </div>
                  <select 
                    value={settings.retention}
                    onChange={(e) => setSettings(s => ({ ...s, retention: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>30 Days</option>
                    <option>90 Days</option>
                    <option>1 Year</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-8 flex flex-col items-end gap-4">
                {saveStatus && (
                  <div className="px-4 py-2 bg-green-50 border border-green-100 text-green-700 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
                    {saveStatus}
                  </div>
                )}
                <button 
                  onClick={() => {
                    setSaveStatus('Settings saved successfully!');
                    setTimeout(() => setSaveStatus(null), 3000);
                  }}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Product' && <ProductShowcase />}
        </div>
      </main>

      <NotificationDrawer 
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onMarkAsRead={markAlertAsRead}
        onClearAll={clearAllAlerts}
      />

      <UnitQRCodeModal 
        isOpen={isQRCodeModalOpen}
        onClose={() => {
          setIsQRCodeModalOpen(false);
          setSelectedUnitForQR(null);
        }}
        unit={selectedUnitForQR}
      />

      <UnitModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingUnit(null);
        }} 
        onSave={handleAddUnit} 
        initialData={editingUnit}
      />

      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          setEditingStaff(null);
        }}
        onSave={handleAddStaff}
        units={units}
        initialData={editingStaff}
      />

      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => {
          setIsMeetingModalOpen(false);
          setEditingMeeting(null);
        }}
        onSave={handleSaveMeeting}
        staff={staff}
        initialData={editingMeeting}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
        active ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <span className={cn("transition-colors", active ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </span>
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {active && <ChevronRight className="ml-auto w-4 h-4 text-slate-600" />}
    </button>
  );
}

function StatCard({ icon, label, value, trend, trendColor }: { icon: React.ReactNode, label: string, value: string, trend: string, trendColor: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className={cn("text-[10px] font-black uppercase tracking-widest", trendColor)}>{trend}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
  );
}
