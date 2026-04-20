export interface HospitalUnit {
  id: string;
  name: string;
  type: string;
  location: string;
  floor: string;
  department: string;
  targetDecibel: number;
  deviceName: string;
  deviceId: string;
  /** Demo: simulated readings in the browser. Live: server polls Tuya and stores readings. */
  readingSource?: 'demo' | 'live';
  createdAt: number;
}

export interface NoiseReading {
  id: string;
  unitId: string;
  timestamp: number;
  decibels: number;
  isPeak: boolean;
}

export interface PatientFeedback {
  id: string;
  unitId: string;
  timestamp: number;
  score: number; // 1-5 (Press Ganey style)
  comment: string;
}

export interface AIInsight {
  id: string;
  unitId: string;
  timestamp: number;
  summary: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface NotificationPreferences {
  thresholdAlerts: boolean;
  peakAlerts: boolean;
  criticalFeedback: boolean;
  systemAlerts: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  unitId: string;
  status: 'active' | 'on-break' | 'off-duty';
  email?: string;
  pincode?: string;
  isAdmin?: boolean;
  notificationPreferences?: NotificationPreferences;
}

export interface Meeting {
  id: string;
  timestamp: number;
  title: string;
  attendees: string[]; // Staff IDs
  notes: string;
  decisions: string[];
  nextSteps: string[];
}

export interface Alert {
  id: string;
  unitId: string;
  timestamp: number;
  type: 'threshold' | 'peak' | 'system';
  message: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
}
