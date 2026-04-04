import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Zap, 
  Shield, 
  Heart, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2,
  Ear,
  Brain,
  BarChart3,
  Loader2,
  Download
} from 'lucide-react';

export function ProductShowcase() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    
    // Simulate a download delay
    setTimeout(() => {
      const doc = new jsPDF();
      const blue = '#2563eb';
      const dark = '#0f172a';
      const gray = '#64748b';

      // Header
      doc.setFillColor(dark);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor('#ffffff');
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('QUIETCARE', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('ACOUSTIC INTELLIGENCE v2.5', 20, 32);

      // Hero Section
      doc.setTextColor(dark);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('Silence is Medicine.', 20, 60);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gray);
      doc.text('QuietCare uses advanced AI to monitor, analyze, and optimize the acoustic', 20, 70);
      doc.text('environment of modern healthcare facilities.', 20, 76);

      // Key Benefits
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(blue);
      doc.text('KEY BENEFITS', 20, 95);
      
      doc.setDrawColor(blue);
      doc.setLineWidth(0.5);
      doc.line(20, 98, 60, 98);

      const benefits = [
        { t: 'Patient Recovery', d: 'Quiet environments lead to 15% faster healing and higher satisfaction.' },
        { t: 'Staff Focus', d: 'Reduce alarm fatigue and cognitive load with intelligent noise filtering.' },
        { t: 'Total Privacy', d: 'Edge-processed analysis ensures decibel monitoring without recording.' }
      ];

      let y = 110;
      benefits.forEach(b => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(dark);
        doc.text(b.t, 20, y);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(gray);
        doc.text(b.d, 20, y + 6);
        y += 20;
      });

      // ROI Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(blue);
      doc.text('THE ROI OF QUIETNESS', 20, 175);
      
      doc.setDrawColor(blue);
      doc.line(20, 178, 90, 178);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(dark);
      doc.text('Nurse Turnover Reduction: 22%', 20, 190);
      doc.text('HCAHPS Score Increase: +18pts', 20, 200);
      doc.text('Annual Savings Estimate: $1.2M', 20, 210);

      // Footer
      doc.setFillColor(blue);
      doc.rect(0, 270, 210, 27, 'F');
      
      doc.setTextColor('#ffffff');
      doc.setFontSize(10);
      doc.text('Medamaitrak.com', 20, 285);
      doc.text('Contact: reports@acejan.com', 140, 285);

      doc.save('QuietCare_Whitepaper_Flyer.pdf');
      setIsDownloading(false);
    }, 1500);
  };

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section - Recipe 2: Editorial */}
      <section className="relative overflow-hidden rounded-[40px] bg-slate-900 text-white p-12 lg:p-24 min-h-[600px] flex flex-col justify-center">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-blue-500/20 to-transparent" />
          <img 
            src="https://picsum.photos/seed/hospital-tech/1200/800" 
            alt="Hospital Tech" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <div 
            className="relative z-10 max-w-3xl"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              Acoustic Intelligence v2.5
            </span>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] mb-8 uppercase italic">
              Silence is <br />
              <span className="text-blue-500">Medicine.</span>
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed mb-12 max-w-xl">
              QuietCare uses advanced AI to monitor, analyze, and optimize the acoustic environment of modern healthcare facilities.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2 group">
                Request Demo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-8 py-4 bg-slate-800 text-white border border-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isDownloading ? 'Downloading...' : 'Download Whitepaper'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid - Recipe 5: Brutalist/Creative */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <BenefitCard 
          number="01"
          icon={<Heart className="w-8 h-8 text-red-500" />}
          title="Patient Recovery"
          description="Studies show that patients in quiet environments heal 15% faster and report higher satisfaction scores."
        />
        <BenefitCard 
          number="02"
          icon={<Brain className="w-8 h-8 text-blue-500" />}
          title="Staff Focus"
          description="Reduce alarm fatigue and cognitive load. Our AI filters noise from critical alerts, ensuring staff respond to what matters."
        />
        <BenefitCard 
          number="03"
          icon={<Shield className="w-8 h-8 text-green-500" />}
          title="Total Privacy"
          description="Edge-processed acoustic analysis. We monitor decibels and patterns without ever recording a single word of conversation."
        />
      </section>

      {/* ROI Section - Recipe 1: Technical Dashboard */}
      <section className="bg-white rounded-[40px] border border-slate-200 p-12 lg:p-20 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-6 italic">
              The ROI of <br />Quietness
            </h2>
            <p className="text-slate-500 font-medium mb-12 leading-relaxed">
              Implementing QuietCare isn't just about comfort—it's a strategic financial decision for modern hospital administration.
            </p>
            
            <div className="space-y-8">
              <ROIMetric 
                label="Nurse Turnover Reduction"
                value="22%"
                description="Lower burnout leads to significant savings in recruitment and training costs."
              />
              <ROIMetric 
                label="HCAHPS Score Increase"
                value="+18pts"
                description="Direct correlation between 'Quiet at Night' scores and overall reimbursement."
              />
              <ROIMetric 
                label="Adverse Event Reduction"
                value="12%"
                description="Better staff focus leads to fewer medical errors and shorter hospital stays."
              />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/5 blur-3xl rounded-full" />
            <div className="relative bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Projection_Model_v4</span>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Annual Savings Estimate</p>
                  <h4 className="text-3xl font-black text-white tracking-tight">$1.2M</h4>
                  <p className="text-[10px] text-slate-400 mt-2">Based on a 200-bed facility model</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Payback Period</p>
                    <p className="text-xl font-bold text-white">7 Months</p>
                  </div>
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Implementation</p>
                    <p className="text-xl font-bold text-white">14 Days</p>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Market Adoption</span>
                    <span className="text-[10px] font-bold text-blue-400">84%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: '84%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Recipe 8: Clean Utility */}
      <section className="space-y-12">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-4">Advanced Capabilities</h2>
          <p className="text-slate-500 font-medium">Cutting-edge technology designed specifically for the clinical environment.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureItem icon={<Ear />} title="Acoustic Fingerprinting" />
          <FeatureItem icon={<Zap />} title="Real-time Dispatch" />
          <FeatureItem icon={<BarChart3 />} title="Predictive Analysis" />
          <FeatureItem icon={<Shield />} title="HIPAA Compliant" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 rounded-[40px] p-12 lg:p-20 text-center text-white shadow-xl shadow-blue-100">
        <h2 className="text-4xl lg:text-6xl font-black tracking-tighter mb-8 uppercase italic">Ready to transform <br />your facility?</h2>
        <p className="text-blue-100 text-lg font-medium mb-12 max-w-xl mx-auto">
          Join over 50 leading hospitals using QuietCare to deliver a better patient experience.
        </p>
        <button className="px-12 py-6 bg-white text-blue-600 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl">
          Get Started Today
        </button>
      </section>
    </div>
  );
}

function BenefitCard({ number, icon, title, description }: { number: string, icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-6xl font-black text-slate-100 group-hover:text-blue-50 transition-colors">{number}</span>
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:shadow-md transition-all">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
    </div>
  );
}

function ROIMetric({ label, value, description }: { label: string, value: string, description: string }) {
  return (
    <div className="flex gap-6">
      <div className="text-4xl font-black text-blue-600 tracking-tighter w-24 shrink-0">{value}</div>
      <div>
        <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1">{label}</h4>
        <p className="text-sm text-slate-500 leading-snug">{description}</p>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' }) : icon}
      </div>
      <span className="text-sm font-bold text-slate-700">{title}</span>
    </div>
  );
}
