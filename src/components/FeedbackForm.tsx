import React, { useState } from 'react';
import { MessageSquare, Star, Send } from 'lucide-react';
import { PatientFeedback } from '../types';

interface FeedbackFormProps {
  unitId: string;
  onSubmit: (feedback: Omit<PatientFeedback, 'id' | 'timestamp' | 'unitId'>) => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ unitId, onSubmit }) => {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSubmit({ score, comment });
    setComment('');
    setScore(5);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Patient Quietness Feedback</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            How quiet was your stay? (1-5)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  score === s 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Comments
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details about noise levels..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-3 h-3" />
          Submit Feedback
        </button>
      </form>
    </div>
  );
};
