import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { HospitalUnit, NoiseReading, PatientFeedback } from '../types';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Info, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIInsightsPanelProps {
  unit: HospitalUnit;
  readings: NoiseReading[];
  feedback: PatientFeedback[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ unit, readings, feedback }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const avgDb = readings.reduce((acc, r) => acc + r.decibels, 0) / (readings.length || 1);
      const peakDb = Math.max(...readings.map(r => r.decibels), 0);
      const avgScore = feedback.reduce((acc, f) => acc + f.score, 0) / (feedback.length || 1);

      const prompt = `
        As a healthcare noise management expert, analyze the following data for hospital unit "${unit.name}" (${unit.department}):
        - Target Noise Level: ${unit.targetDecibel} dB
        - Average Recorded Noise: ${avgDb.toFixed(1)} dB
        - Peak Noise Level: ${peakDb} dB
        - Patient Satisfaction Score (1-5): ${avgScore.toFixed(1)}
        - Recent Patient Comments: ${feedback.map(f => f.comment).join('; ')}

        Provide an assessment including:
        1. A health status label (Excellent, Good, Fair, Poor, Critical).
        2. A one-sentence concise summary of the overall acoustic health.
        3. Detailed insights (max 150 words) including current status relative to targets, potential causes for noise spikes, and 3 actionable recommendations.
        Use a professional, encouraging tone.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              healthStatus: { type: Type.STRING },
              summary: { type: Type.STRING },
              details: { type: Type.STRING },
            },
            required: ['healthStatus', 'summary', 'details'],
          },
        },
      });

      const data = JSON.parse(response.text);
      setHealthStatus(data.healthStatus);
      setSummary(data.summary);
      setInsight(data.details);
    } catch (error) {
      console.error('Error generating AI insight:', error);
      setInsight('Failed to generate insights. Please check your API key configuration.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'excellent': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'good': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'fair': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'poor': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-lg tracking-tight">AI Clinical Assessment</h3>
        </div>
        <button
          onClick={generateInsight}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Analyze Data'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {insight ? (
          <div className="space-y-6">
            {/* Health Summary Section */}
            <div className={`p-4 rounded-xl border ${getStatusColor(healthStatus)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Acoustic Health: {healthStatus}</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{summary}</p>
            </div>

            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{insight}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-8">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm italic">Click "Analyze Data" to generate real-time noise management recommendations based on current unit metrics.</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between text-[10px] uppercase tracking-tighter font-bold text-slate-500">
        <span>Powered by Gemini 3 Flash</span>
        <span>Last Update: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
