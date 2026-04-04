import React from 'react';
import { X, Bell, AlertTriangle, Info, CheckCircle2, Trash2, Zap } from 'lucide-react';
import { Alert } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkAsRead,
  onClearAll
}) => {
  if (!isOpen) return null;

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-slate-900" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button 
                onClick={onClearAll}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                title="Clear All"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">All Clear</h3>
              <p className="text-xs text-slate-400 font-medium">No active alerts or notifications at this time.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                onClick={() => onMarkAsRead(alert.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                  alert.isRead 
                    ? "bg-white border-slate-100 opacity-60" 
                    : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex gap-4">
                  <div className={cn(
                    "p-2 rounded-xl h-fit",
                    alert.severity === 'high' ? "bg-red-50 text-red-600" :
                    alert.severity === 'medium' ? "bg-amber-50 text-amber-600" :
                    "bg-blue-50 text-blue-600"
                  )}>
                    {alert.type === 'threshold' ? <AlertTriangle className="w-4 h-4" /> :
                     alert.type === 'peak' ? <Zap className="w-4 h-4" /> :
                     <Info className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        alert.severity === 'high' ? "text-red-600" :
                        alert.severity === 'medium' ? "text-amber-600" :
                        "text-blue-600"
                      )}>
                        {alert.type} Alert
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {format(alert.timestamp, 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-1 leading-tight">
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                      {format(alert.timestamp, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {!alert.isRead && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            QuietCare Real-Time Monitoring System
          </p>
        </div>
      </div>
    </div>
  );
};
