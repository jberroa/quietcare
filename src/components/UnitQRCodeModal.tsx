import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Share2, Printer, Building2 } from 'lucide-react';
import { HospitalUnit } from '../types';

interface UnitQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: HospitalUnit | null;
}

export const UnitQRCodeModal: React.FC<UnitQRCodeModalProps> = ({ isOpen, onClose, unit }) => {
  if (!isOpen || !unit) return null;

  // Construct the feedback URL
  const feedbackUrl = `${window.location.origin}?unitId=${unit.id}&view=feedback`;

  const handleDownload = () => {
    const svg = document.getElementById('unit-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_Code_${unit.name.replace(/\s+/g, '_')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Unit QR Code</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 mb-1">{unit.name}</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Feedback Access Point</p>
          </div>

          <div className="p-6 bg-white border-4 border-slate-50 rounded-3xl shadow-inner mb-8">
            <QRCodeSVG
              id="unit-qr-code"
              value={feedbackUrl}
              size={200}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "https://ais-dev-cegj3r2eb6cas27kalu4la-369133220505.us-east1.run.app/favicon.ico",
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <p className="text-sm text-slate-600 mb-8 max-w-[280px]">
            Patients can scan this code to provide real-time feedback on the acoustic environment of this unit.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
          
          <button
            onClick={() => {
              navigator.clipboard.writeText(feedbackUrl);
              alert('Feedback link copied to clipboard!');
            }}
            className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
          >
            <Share2 className="w-3 h-3" />
            Copy Feedback Link
          </button>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Powered by QuietCare Acoustic Intelligence
          </p>
        </div>
      </div>
    </div>
  );
};
