import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CloudRain,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { HospitalUnit, NoiseReading, PatientFeedback, StaffMember, Meeting, Alert } from './types';

function unitReadingSource(u: HospitalUnit): 'demo' | 'live' {
  return u.readingSource === 'live' ? 'live' : 'demo';
}
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
import { apiFetch, apiFetchPublic } from './lib/api';

import { jsPDF } from 'jspdf';
import { AnalyticsChart } from './components/AnalyticsChart';
import {
  DecibelHistoryPanel,
  type DecibelHistoryRange,
  getDecibelHistoryBounds,
} from './components/DecibelHistoryPanel';
import { LogOut, Lock, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const [activeTab, setActiveTab] = useState<
    | 'Dashboard'
    | 'DecibelHistory'
    | 'Units'
    | 'Staff'
    | 'Committee'
    | 'Analytics'
    | 'Product'
    | 'Settings'
    | 'Education'
    | 'Feedback'
  >('Dashboard');
  const [units, setUnits] = useState<HospitalUnit[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const loadSession = useCallback(async () => {
    try {
      const r = await apiFetch('/api/auth/me');
      const data = (await r.json()) as { user: StaffMember | null };
      setCurrentUser(data.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const refreshAppData = useCallback(async () => {
    try {
      const [ur, sr, mr, ar, se] = await Promise.all([
        apiFetch('/api/units'),
        apiFetch('/api/staff'),
        apiFetch('/api/meetings'),
        apiFetch('/api/alerts'),
        apiFetch('/api/settings'),
      ]);
      if (ur.ok) setUnits((await ur.json()) as HospitalUnit[]);
      if (sr.ok) setStaff((await sr.json()) as StaffMember[]);
      if (mr.ok) setMeetings((await mr.json()) as Meeting[]);
      if (ar.ok) setAlerts((await ar.json()) as Alert[]);
      if (se.ok) {
        const raw = (await se.json()) as Record<string, unknown>;
        const { dataSource: _legacyDataSource, ...rest } = raw;
        setSettings((prev) => ({
          ...prev,
          ...rest,
        }));
      }
    } catch (e) {
      console.error('[quietcare] refreshAppData', e);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUnits([]);
      setStaff([]);
      setMeetings([]);
      setAlerts([]);
      setFeedback({});
      return;
    }
    refreshAppData();
  }, [currentUser, refreshAppData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pincode: loginPin }),
      });
      const data = (await r.json()) as { user?: StaffMember; error?: string };
      if (!r.ok) {
        setLoginError('Invalid Pincode. Please try again.');
        setLoginPin('');
        return;
      }
      setCurrentUser(data.user!);
      setLoginPin('');
      setLoginError('');
    } catch {
      setLoginError('Invalid Pincode. Please try again.');
      setLoginPin('');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setCurrentUser(null);
    setActiveTab('Dashboard');
  };

  const markAlertAsRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    try {
      await apiFetch(`/api/alerts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllAlerts = async () => {
    setAlerts([]);
    try {
      await apiFetch('/api/alerts', { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [readings, setReadings] = useState<Record<string, NoiseReading[]>>({});
  const [feedback, setFeedback] = useState<Record<string, PatientFeedback[]>>({});
  const [publicFeedbackUnit, setPublicFeedbackUnit] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<HospitalUnit | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [selectedUnitForQR, setSelectedUnitForQR] = useState<HospitalUnit | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [unitAlertNotice, setUnitAlertNotice] = useState<string | null>(null);
  const [acousticAlertActionLoading, setAcousticAlertActionLoading] = useState<'dispatch' | null>(null);

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

  // Settings State (loaded from API when logged in)
  const [settings, setSettings] = useState({
    notifications: true,
    aiFrequency: 'Every 15 Minutes',
    retention: '90 Days',
  });

  useEffect(() => {
    if (!units.length) return;
    if (!units.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

  useEffect(() => {
    if (!currentUser || !selectedUnitId) return;
    (async () => {
      try {
        const r = await apiFetch(`/api/feedback?unitId=${encodeURIComponent(selectedUnitId)}`);
        if (!r.ok) return;
        const rows = (await r.json()) as PatientFeedback[];
        setFeedback((prev) => ({ ...prev, [selectedUnitId]: rows }));
      } catch (e) {
        console.error('[quietcare] feedback', e);
      }
    })();
  }, [currentUser, selectedUnitId]);

  useEffect(() => {
    if (activeTab !== 'Feedback' || !selectedUnitId || currentUser) {
      setPublicFeedbackUnit(null);
      return;
    }
    (async () => {
      try {
        const r = await apiFetchPublic(`/api/public/units/${encodeURIComponent(selectedUnitId)}`);
        if (r.ok) {
          setPublicFeedbackUnit((await r.json()) as { id: string; name: string });
        } else {
          setPublicFeedbackUnit(null);
        }
      } catch {
        setPublicFeedbackUnit(null);
      }
    })();
  }, [activeTab, selectedUnitId, currentUser]);

  const persistSettings = useCallback(async (next: typeof settings) => {
    try {
      const r = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      if (r.ok) {
        const raw = (await r.json()) as Record<string, unknown>;
        const { dataSource: _legacyDataSource, ...rest } = raw;
        setSettings((prev) => ({
          ...prev,
          ...rest,
        }));
      }
    } catch (e) {
      console.error('[quietcare] settings', e);
    }
  }, []);

  const [decibelHistoryMode, setDecibelHistoryMode] = useState<'preset' | 'custom'>('preset');
  const [decibelHistoryRange, setDecibelHistoryRange] = useState<DecibelHistoryRange>('24h');
  const [decibelHistoryCustomFrom, setDecibelHistoryCustomFrom] = useState(
    () => Date.now() - 24 * 60 * 60 * 1000,
  );
  const [decibelHistoryCustomTo, setDecibelHistoryCustomTo] = useState(() => Date.now());
  const [decibelHistoryRows, setDecibelHistoryRows] = useState<NoiseReading[]>([]);
  const [decibelHistoryLoading, setDecibelHistoryLoading] = useState(false);
  const [decibelHistoryRefreshNonce, setDecibelHistoryRefreshNonce] = useState(0);

  // Analytics State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Demo: simulated decibel stream (local only) for units marked Demo
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      setReadings((prev) => {
        const newReadings = { ...prev };

        units.forEach((unit) => {
          if (unitReadingSource(unit) === 'live') return;
          if (!newReadings[unit.id]) newReadings[unit.id] = [];
          
          const base = unit.targetDecibel;
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

        });

        return newReadings;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [units, currentUser]);

  // Live: poll stored readings from API for units marked Live (MQTT ingest writes readings for live units)
  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await apiFetch('/api/readings?limit=100');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          byUnitId: Record<
            string,
            Array<{ id: string; unitId: string; timestamp: number; decibels: number }>
          >;
        };
        if (cancelled) return;
        setReadings((prev) => {
          const next = { ...prev };
          for (const unit of units) {
            if (unitReadingSource(unit) !== 'live') continue;
            const rows = data.byUnitId[unit.id] ?? [];
            next[unit.id] = rows.map((r) => ({
              id: r.id,
              unitId: unit.id,
              timestamp: r.timestamp,
              decibels: Math.round(r.decibels),
              isPeak: r.decibels > unit.targetDecibel + 15,
            }));
          }
          return next;
        });
      } catch (e) {
        console.error('[quietcare] /api/readings', e);
      }
    };

    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [units, currentUser]);

  const selectedUnitForHistory = units.find((u) => u.id === selectedUnitId) ?? units[0];

  const decibelHistoryWindow = useMemo(
    () =>
      getDecibelHistoryBounds(
        decibelHistoryMode,
        decibelHistoryRange,
        decibelHistoryCustomFrom,
        decibelHistoryCustomTo,
      ),
    [
      decibelHistoryMode,
      decibelHistoryRange,
      decibelHistoryCustomFrom,
      decibelHistoryCustomTo,
      decibelHistoryRefreshNonce,
      readings,
      activeTab,
    ],
  );

  useEffect(() => {
    if (activeTab !== 'DecibelHistory') {
      setDecibelHistoryRows([]);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'DecibelHistory' || !currentUser || !selectedUnitForHistory) {
      return;
    }
    if (unitReadingSource(selectedUnitForHistory) !== 'live') return;

    let cancelled = false;
    (async () => {
      setDecibelHistoryLoading(true);
      try {
        const { from, to } = getDecibelHistoryBounds(
          decibelHistoryMode,
          decibelHistoryRange,
          decibelHistoryCustomFrom,
          decibelHistoryCustomTo,
        );
        const res = await apiFetch(
          `/api/readings?unitId=${encodeURIComponent(
            selectedUnitForHistory.id,
          )}&from=${from}&to=${to}&limit=10000`,
        );
        if (!res.ok || cancelled) {
          if (!cancelled) setDecibelHistoryRows([]);
          return;
        }
        const data = (await res.json()) as {
          byUnitId: Record<string, Array<{ id: string; unitId: string; timestamp: number; decibels: number }>>;
        };
        if (cancelled) return;
        const raw = data.byUnitId[selectedUnitForHistory.id] ?? [];
        setDecibelHistoryRows(
          raw.map((r) => ({
            id: r.id,
            unitId: r.unitId,
            timestamp: r.timestamp,
            decibels: Math.round(r.decibels),
            isPeak: r.decibels > selectedUnitForHistory.targetDecibel + 15,
          })),
        );
      } catch (e) {
        console.error('[quietcare] decibel history', e);
        if (!cancelled) setDecibelHistoryRows([]);
      } finally {
        if (!cancelled) setDecibelHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    currentUser,
    selectedUnitForHistory,
    decibelHistoryMode,
    decibelHistoryRange,
    decibelHistoryCustomFrom,
    decibelHistoryCustomTo,
    decibelHistoryRefreshNonce,
  ]);

  useEffect(() => {
    if (activeTab !== 'DecibelHistory' || !selectedUnitForHistory) return;
    if (unitReadingSource(selectedUnitForHistory) === 'live') return;
    const { from, to } = getDecibelHistoryBounds(
      decibelHistoryMode,
      decibelHistoryRange,
      decibelHistoryCustomFrom,
      decibelHistoryCustomTo,
    );
    const all = readings[selectedUnitForHistory.id] ?? [];
    setDecibelHistoryRows(all.filter((r) => r.timestamp >= from && r.timestamp <= to));
  }, [
    activeTab,
    selectedUnitForHistory,
    decibelHistoryMode,
    decibelHistoryRange,
    decibelHistoryCustomFrom,
    decibelHistoryCustomTo,
    readings,
    decibelHistoryRefreshNonce,
  ]);

  // Demo + live: one unread threshold alert per unit until acknowledged (avoids a new copy every ~60s while noise stays high)
  useEffect(() => {
    if (!settings.notifications || !currentUser) return;

    setAlerts((prevAlerts) => {
      const newAlerts: Alert[] = [];
      for (const unit of units) {
        const unitReadings = readings[unit.id] ?? [];
        if (unitReadings.length < 5) continue;
        const last5 = unitReadings.slice(-5);
        const allHigh = last5.every((r) => r.decibels > unit.targetDecibel + 5);
        if (!allHigh) continue;
        const hasOpenThreshold = prevAlerts.some(
          (a) => a.unitId === unit.id && a.type === 'threshold' && !a.isRead,
        );
        if (hasOpenThreshold) continue;
        newAlerts.push({
          id: Math.random().toString(36).substr(2, 9),
          unitId: unit.id,
          timestamp: Date.now(),
          type: 'threshold',
          message: `High noise levels detected in ${unit.name} for over 5 minutes.`,
          severity: 'high',
          isRead: false,
        });
      }
      if (newAlerts.length === 0) return prevAlerts;
      for (const a of newAlerts) {
        void apiFetch('/api/alerts', {
          method: 'POST',
          body: JSON.stringify(a),
        });
      }
      return [...newAlerts, ...prevAlerts].slice(0, 50);
    });
  }, [readings, units, settings.notifications, currentUser]);

  const handleAddUnit = async (unitData: Omit<HospitalUnit, 'id' | 'createdAt'>) => {
    if (editingUnit) {
      const r = await apiFetch(`/api/units/${encodeURIComponent(editingUnit.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(unitData),
      });
      if (r.ok) await refreshAppData();
      setEditingUnit(null);
    } else {
      const r = await apiFetch('/api/units', {
        method: 'POST',
        body: JSON.stringify({ ...unitData, createdAt: Date.now() }),
      });
      if (r.ok) {
        const created = (await r.json()) as HospitalUnit;
        setSelectedUnitId(created.id);
        await refreshAppData();
      }
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (units.length <= 1) {
      alert("Cannot delete the last unit.");
      return;
    }
    await apiFetch(`/api/units/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (selectedUnitId === id) {
      setSelectedUnitId(units.find((u) => u.id !== id)?.id || '');
    }
    await refreshAppData();
  };

  const handleAddStaff = async (staffData: Omit<StaffMember, 'id'>) => {
    if (editingStaff) {
      const r = await apiFetch(`/api/staff/${encodeURIComponent(editingStaff.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(staffData),
      });
      if (r.ok) await refreshAppData();
      setEditingStaff(null);
    } else {
      const r = await apiFetch('/api/staff', {
        method: 'POST',
        body: JSON.stringify(staffData),
      });
      if (r.ok) await refreshAppData();
    }
  };

  const handleDeleteStaff = async (id: string) => {
    await apiFetch(`/api/staff/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await refreshAppData();
  };

  const handleSaveMeeting = async (meetingData: Omit<Meeting, 'id' | 'timestamp'>) => {
    if (editingMeeting) {
      await apiFetch(`/api/meetings/${encodeURIComponent(editingMeeting.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...meetingData,
          timestamp: editingMeeting.timestamp,
        }),
      });
      setEditingMeeting(null);
    } else {
      await apiFetch('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({ ...meetingData, timestamp: Date.now() }),
      });
    }
    await refreshAppData();
  };

  const handleDeleteMeeting = async (id: string) => {
    await apiFetch(`/api/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await refreshAppData();
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

  const handleAddFeedback = async (fData: Omit<PatientFeedback, 'id' | 'timestamp' | 'unitId'>) => {
    const r = await apiFetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ unitId: selectedUnitId, score: fData.score, comment: fData.comment }),
    });
    if (r.ok) {
      const row = (await r.json()) as PatientFeedback;
      setFeedback((prev) => ({
        ...prev,
        [selectedUnitId]: [row, ...(prev[selectedUnitId] || [])],
      }));
    }
  };

  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0];
  const activeUnitId = selectedUnit?.id ?? selectedUnitId;
  const currentReadings = readings[activeUnitId] || [];
  const currentFeedback = feedback[activeUnitId] || [];
  const latestDb = currentReadings[currentReadings.length - 1]?.decibels || 0;
  const isOverTarget = Boolean(selectedUnit && latestDb > selectedUnit.targetDecibel);

  const unreadThresholdAlertsForUnit = alerts.filter(
    (a) => a.unitId === activeUnitId && !a.isRead && a.type === 'threshold',
  );

  const showUnitAlertNotice = (msg: string) => {
    setUnitAlertNotice(msg);
    window.setTimeout(() => setUnitAlertNotice(null), 5000);
  };

  const handleAcknowledgeAcousticAlerts = async () => {
    if (unreadThresholdAlertsForUnit.length === 0) return;
    const ids = new Set(unreadThresholdAlertsForUnit.map((a) => a.id));
    setAlerts((prev) => prev.map((a) => (ids.has(a.id) ? { ...a, isRead: true } : a)));
    try {
      await Promise.all(
        [...ids].map((id) =>
          apiFetch(`/api/alerts/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ isRead: true }),
          }),
        ),
      );
      showUnitAlertNotice('Alerts acknowledged for this unit.');
    } catch (e) {
      console.error(e);
      void refreshAppData();
      showUnitAlertNotice('Could not sync acknowledge. Refreshed from server.');
    }
  };

  const handleDispatchQuietTeam = async () => {
    if (!selectedUnit || !currentUser) return;
    setAcousticAlertActionLoading('dispatch');
    try {
      const dispatchAlert: Alert = {
        id: Math.random().toString(36).slice(2, 11),
        unitId: selectedUnit.id,
        timestamp: Date.now(),
        type: 'system',
        message: `Quiet team dispatched to ${selectedUnit.name} by ${currentUser.name}.`,
        severity: 'medium',
        isRead: false,
      };
      const r = await apiFetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(dispatchAlert),
      });
      if (r.ok) {
        setAlerts((prev) => [dispatchAlert, ...prev].slice(0, 50));
        showUnitAlertNotice('Quiet team dispatch recorded. Staff are notified in the alert feed.');
      } else {
        showUnitAlertNotice('Could not record dispatch. Please try again.');
      }
    } catch {
      showUnitAlertNotice('Could not record dispatch. Please try again.');
    } finally {
      setAcousticAlertActionLoading(null);
    }
  };

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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (activeTab === 'Feedback') {
    const feedbackUnitName = selectedUnit?.name || publicFeedbackUnit?.name || 'this unit';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100">
              <Activity className="text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Patient Feedback</h2>
              <p className="text-slate-500 font-medium">Help us maintain a healing environment in {feedbackUnitName}</p>
            </div>
          </div>

          <FeedbackForm 
            unitId={selectedUnitId} 
            onSubmit={async (data) => {
              const r = await apiFetchPublic('/api/feedback', {
                method: 'POST',
                body: JSON.stringify({
                  unitId: selectedUnitId,
                  score: data.score,
                  comment: data.comment,
                }),
              });
              if (!r.ok) {
                alert('Could not submit feedback. Please try again.');
                return;
              }
              alert('Thank you for your feedback! We are committed to your comfort.');
              if (currentUser) {
                const row = (await r.json()) as PatientFeedback;
                setFeedback((prev) => ({
                  ...prev,
                  [selectedUnitId]: [row, ...(prev[selectedUnitId] || [])],
                }));
              }
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

  if (currentUser && units.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-slate-700 font-medium text-center">No units in the database yet.</p>
        <p className="text-sm text-slate-500 text-center max-w-md">
          Use Settings → Import from localStorage (admin), or add units via the Units tab once data exists.
        </p>
        <button
          type="button"
          onClick={() => refreshAppData()}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
        >
          Retry
        </button>
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

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
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
          <NavItem
            icon={<History className="w-4 h-4" />}
            label="Decibel history"
            active={activeTab === 'DecibelHistory'}
            onClick={() => setActiveTab('DecibelHistory')}
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

              {/* Alerts Section — threshold alerts from live/demo noise rules */}
              {unreadThresholdAlertsForUnit.length > 0 ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-red-900 mb-1">Active Acoustic Alerts</h4>
                    <ul className="text-sm text-red-700 mb-4 space-y-2 list-disc list-inside">
                      {unreadThresholdAlertsForUnit.map((a) => (
                        <li key={a.id}>{a.message}</li>
                      ))}
                    </ul>
                    {unitAlertNotice && (
                      <p className="text-xs font-medium text-red-800 mb-3">{unitAlertNotice}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={acousticAlertActionLoading === 'dispatch'}
                        onClick={() => void handleDispatchQuietTeam()}
                        className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {acousticAlertActionLoading === 'dispatch' ? 'Recording…' : 'Dispatch Quiet Team'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAcknowledgeAcousticAlerts()}
                        className="px-4 py-2 bg-white text-red-600 border border-red-200 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-50 transition-all"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-emerald-900 mb-1">No active threshold alerts</h4>
                    <p className="text-sm text-emerald-800 mb-4">
                      {selectedUnit.name} has no unread high-noise alerts. You can still request a quiet team visit proactively.
                    </p>
                    {unitAlertNotice && (
                      <p className="text-xs font-medium text-emerald-900 mb-3">{unitAlertNotice}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={acousticAlertActionLoading === 'dispatch'}
                        onClick={() => void handleDispatchQuietTeam()}
                        className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-800 transition-all disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {acousticAlertActionLoading === 'dispatch' ? 'Recording…' : 'Dispatch Quiet Team'}
                      </button>
                      <button
                        type="button"
                        disabled
                        title="No threshold alerts to acknowledge for this unit"
                        className="px-4 py-2 bg-white text-emerald-600/50 border border-emerald-200 text-xs font-bold uppercase tracking-widest rounded-lg cursor-not-allowed"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'DecibelHistory' && units.length > 0 && (
            <DecibelHistoryPanel
              units={units}
              selectedUnitId={activeUnitId}
              onSelectUnit={setSelectedUnitId}
              timeMode={decibelHistoryMode}
              onTimeModeChange={setDecibelHistoryMode}
              range={decibelHistoryRange}
              onRangeChange={(r) => {
                setDecibelHistoryMode('preset');
                setDecibelHistoryRange(r);
              }}
              customFrom={decibelHistoryCustomFrom}
              customTo={decibelHistoryCustomTo}
              onCustomFromChange={setDecibelHistoryCustomFrom}
              onCustomToChange={setDecibelHistoryCustomTo}
              from={decibelHistoryWindow.from}
              to={decibelHistoryWindow.to}
              rows={decibelHistoryRows}
              loading={decibelHistoryLoading}
              isLive={Boolean(selectedUnit && unitReadingSource(selectedUnit) === 'live')}
              onRefresh={async () => {
                setDecibelHistoryRefreshNonce((n) => n + 1);
              }}
            />
          )}

          {activeTab === 'DecibelHistory' && units.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
              <p className="font-medium">Add a unit to view decibel history.</p>
            </div>
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
                    type="button"
                    onClick={() => {
                      const next = { ...settings, notifications: !settings.notifications };
                      setSettings(next);
                      void persistSettings(next);
                    }}
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
                    onChange={(e) => {
                      const next = { ...settings, aiFrequency: e.target.value };
                      setSettings(next);
                      void persistSettings(next);
                    }}
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
                    onChange={(e) => {
                      const next = { ...settings, retention: e.target.value };
                      setSettings(next);
                      void persistSettings(next);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>30 Days</option>
                    <option>90 Days</option>
                    <option>1 Year</option>
                  </select>
                </div>
                {currentUser?.isAdmin && typeof localStorage !== 'undefined' && (
                  <div className="p-6 space-y-3">
                    <h4 className="font-bold text-slate-900">Import legacy browser data</h4>
                    <p className="text-xs text-slate-500">
                      One-time: copy units, staff, meetings, alerts, and settings from this browser&apos;s old localStorage into the server database.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const raw = {
                            units: JSON.parse(localStorage.getItem('quietcare_units') || 'null'),
                            staff: JSON.parse(localStorage.getItem('quietcare_staff') || 'null'),
                            meetings: JSON.parse(localStorage.getItem('quietcare_meetings') || 'null'),
                            alerts: JSON.parse(localStorage.getItem('quietcare_alerts') || 'null'),
                            settings: JSON.parse(localStorage.getItem('quietcare_settings') || 'null'),
                          };
                          if (!raw.units && !raw.staff) {
                            alert('No legacy localStorage data found.');
                            return;
                          }
                          const r = await apiFetch('/api/migrate', {
                            method: 'POST',
                            body: JSON.stringify(raw),
                          });
                          if (r.ok) {
                            await refreshAppData();
                            alert('Import complete.');
                          } else {
                            alert('Import failed.');
                          }
                        } catch {
                          alert('Import failed.');
                        }
                      }}
                      className="px-4 py-2 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold"
                    >
                      Import from localStorage
                    </button>
                  </div>
                )}
              </div>
              
              <div className="pt-8 flex flex-col items-end gap-4">
                {saveStatus && (
                  <div className="px-4 py-2 bg-green-50 border border-green-100 text-green-700 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
                    {saveStatus}
                  </div>
                )}
                <button 
                  type="button"
                  onClick={async () => {
                    await persistSettings(settings);
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
