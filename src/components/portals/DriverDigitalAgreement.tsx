import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, FileText, Camera, Shield, AlertTriangle, Eraser } from 'lucide-react';
import { firebaseService } from '@/services/firebaseService';
import { uploadToS3 } from '@/services/awsService';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

interface AgreementProps {
  driverId: string;
  onSigned: () => void;
}

export default function DriverDigitalAgreement({ driverId, onSigned }: AgreementProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clauses = [
    { title: "1. Device Ownership", text: "The advertising display device installed in the driver’s vehicle remains the sole property of MAYYAN AutoAds at all times." },
    { title: "2. Battery Usage Consent", text: "The driver agrees that the advertising device may utilize the vehicle battery for operating and displaying advertisements." },
    { title: "3. Battery Liability Limitation", text: "MAYYAN AutoAds shall not be responsible for normal battery wear, reduced battery performance, or battery-related issues arising from regular usage of the advertising system." },
    { title: "4. Device Safety Responsibility", text: "The driver is fully responsible for maintaining the physical safety and protection of the installed advertising device." },
    { title: "5. Advertisement Acceptance", text: "The driver agrees to display campaigns assigned by MAYYAN AutoAds, including commercial, promotional, awareness, and legally permitted political advertisements unless prohibited by applicable law." },
    { title: "6. Refusal of Ads", text: "If the driver refuses to display approved advertisements without valid reason, MAYYAN AutoAds reserves the right to suspend or terminate the partnership." },
    { title: "7. Device Return Policy", text: "Upon resignation, inactivity, termination, or agreement cancellation, the driver must return the device within 15 days." },
    { title: "8. Device Recovery & Compensation", text: "If the driver intentionally damages, withholds, sells, refuses to return, or misuses the device, the driver agrees to compensate MAYYAN AutoAds up to the device value (approximately INR 10,000)." },
    { title: "9. Legal Recovery Rights", text: "MAYYAN AutoAds reserves the lawful right to recover company-owned devices when necessary." },
    { title: "10. Loan / Seizure Protection Clause", text: "The advertising device shall not be treated as the personal property of the driver in situations involving vehicle seizure, loan recovery, financial disputes, or third-party claims." },
    { title: "11. Jurisdiction Clause", text: "Any disputes arising from this agreement shall fall under the jurisdiction of competent courts located in Karnataka, India." },
    { title: "12. Driver Consent Declaration", text: "The driver confirms that they have carefully read, understood, and voluntarily accepted all terms and conditions before digitally signing." },
  ];

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const generatePDF = async (signatureDataUrl: string, selfieS3Url: string) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("MAYYAN AutoAds Driver Agreement", 20, 20);
    doc.setFontSize(10);
    doc.text(`Agreement Date: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Driver ID: ${driverId}`, 20, 35);
    
    let y = 50;
    clauses.forEach((c) => {
      doc.setFont("helvetica", "bold");
      doc.text(c.title, 20, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(c.text, 170);
      doc.text(lines, 20, y);
      y += (lines.length * 5) + 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.addPage();
    doc.setFontSize(14);
    doc.text("Digital Verification", 20, 20);
    
    // Add Signature
    doc.text("Digital Signature:", 20, 40);
    doc.addImage(signatureDataUrl, 'PNG', 20, 45, 60, 30);
    
    // Add Selfie Info
    doc.text("Verification Selfie stored at:", 20, 90);
    doc.setFontSize(8);
    doc.text(selfieS3Url, 20, 95);
    
    return doc.output('blob');
  };

  const handleFinalSubmit = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Please provide your signature");
      return;
    }
    if (!selfie) {
      alert("Please upload a verification selfie");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload Selfie
      const selfieFileName = `drivers/${driverId}/agreement/verification-selfie-${Date.now()}.jpg`;
      const selfieS3Url = await uploadToS3(selfie, selfieFileName, selfie.type);

      // 2. Upload Signature Image
      const sigData = sigCanvas.current!.getTrimmedCanvas().toDataURL('image/png');
      const sigBlob = await (await fetch(sigData)).blob();
      const sigFileName = `drivers/${driverId}/agreement/signature-${Date.now()}.png`;
      const signatureUrl = await uploadToS3(sigBlob, sigFileName, 'image/png');

      // 3. Generate and Upload PDF
      const pdfBlob = await generatePDF(sigData, selfieS3Url);
      const pdfFileName = `drivers/${driverId}/agreement/contract-${Date.now()}.pdf`;
      const pdfUrl = await uploadToS3(pdfBlob, pdfFileName, 'application/pdf');

      // 4. Update Firestore
      await firebaseService.updateDriverAgreement(driverId, {
        agreementAccepted: true,
        signedAt: new Date(),
        signatureUrl,
        agreementPdfUrl: pdfUrl,
        verificationSelfieUrl: selfieS3Url,
        agreementVersion: "v1.0",
        status: "SIGNED"
      });

      onSigned();
    } catch (e: any) {
      console.error(e);
      alert("Failed to save agreement: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl mx-auto overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
          <Shield className="text-white w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">MAYYAN AutoAds</h2>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Digital Partnership Agreement</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-80 overflow-y-auto p-5 bg-slate-50 rounded-[1.5rem] border border-slate-200 text-sm space-y-4 scroll-smooth"
            >
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl mb-4">
                <p className="text-orange-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Please read carefully before signing
                </p>
              </div>
              {clauses.map((c, i) => (
                <div key={i} className="group transition-all">
                  <p className="font-black text-slate-800 uppercase text-xs tracking-wider mb-1">{c.title}</p>
                  <p className="text-slate-600 leading-relaxed font-medium">{c.text}</p>
                  {i < clauses.length - 1 && <div className="h-px bg-slate-200 my-4" />}
                </div>
              ))}
              {!hasScrolledToBottom && (
                <div className="sticky bottom-0 left-0 right-0 py-4 bg-gradient-to-t from-slate-50 flex justify-center">
                   <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 animate-bounce">Scroll to continue ↓</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input 
                type="checkbox" 
                id="agree"
                disabled={!hasScrolledToBottom}
                checked={agreed} 
                onChange={e => setAgreed(e.target.checked)}
                className="w-5 h-5 rounded-lg border-2 border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <label htmlFor="agree" className={cn("font-bold text-sm", !hasScrolledToBottom ? "text-slate-300" : "text-slate-700")}>
                I confirm I have read and agree to all terms above.
              </label>
            </div>

            <button 
              disabled={!agreed} 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              Continue to Signature <CheckCircle2 className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-700 uppercase tracking-tight">Verification Selfie</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setSelfie(e.target.files[0]);
                        setSelfieUrl(URL.createObjectURL(e.target.files[0]));
                      }
                    }} 
                    className="hidden" 
                    id="selfie-upload" 
                  />
                  <label 
                    htmlFor="selfie-upload"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all gap-2"
                  >
                    <Camera className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selfie ? 'Selfie Attached' : 'Capture Selfie'}</span>
                  </label>
                </div>
                {selfieUrl && (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img src={selfieUrl} className="w-full h-full object-cover" alt="Selfie" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-black text-slate-700 uppercase tracking-tight">Digital Signature</label>
                <button onClick={() => sigCanvas.current?.clear()} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <Eraser className="w-4 h-4" />
                </button>
              </div>
              <div className="border-2 border-slate-200 rounded-3xl bg-slate-50 overflow-hidden h-40">
                <SignatureCanvas 
                  ref={sigCanvas}
                  penColor='black'
                  canvasProps={{className: 'sigCanvas w-full h-full'}} 
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-sm"
              >
                Back
              </button>
              <button 
                disabled={loading} 
                onClick={handleFinalSubmit}
                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 disabled:bg-slate-200 transition-all"
              >
                {loading ? 'Processing Agreement...' : 'Complete Signing'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

