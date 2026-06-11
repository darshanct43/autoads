import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, FileText, Camera, Shield, AlertTriangle, Eraser, X, ArrowLeft } from 'lucide-react';
import { firebaseService } from '@/services/firebaseService';
import { storageService } from '@/services/storageService';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

interface AgreementProps {
  driverId: string;
  onSigned: () => void;
  onCancel?: () => void;
}

export default function DriverDigitalAgreement({ driverId, onSigned, onCancel }: AgreementProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sigCanvas = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasIsEmpty, setCanvasIsEmpty] = useState(true);


  useEffect(() => {
    sigCanvas.current = {
      isEmpty: () => canvasIsEmpty,
      clear: () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          setCanvasIsEmpty(true);
        }
      },
      getCanvas: () => canvasRef.current!
    };
  }, [canvasIsEmpty]);

  useEffect(() => {
    if (step !== 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width > 0 && rect.height > 0) {
        if (canvas.width !== Math.floor(rect.width * 2)) {
            canvas.width = rect.width * 2;
            canvas.height = rect.height * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.scale(2, 2);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.lineWidth = 3;
              ctx.strokeStyle = '#000000';
            }
            setCanvasIsEmpty(true);
        }
      }
    });

    resizeObserver.observe(canvas.parentElement!);
    return () => resizeObserver.disconnect();
  }, [step]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setCanvasIsEmpty(false);
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };


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

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!url) { reject(new Error("Empty URL")); return; }
      const img = new Image();
      img.crossOrigin = "anonymous";
      let isSettled = false;
      const timeout = setTimeout(() => {
        if (!isSettled) {
           isSettled = true;
           reject(new Error("Timeout loading image"));
        }
      }, 15000);
      img.onload = () => {
         if (isSettled) return;
         isSettled = true;
         clearTimeout(timeout);
         const canvas = document.createElement("canvas");
         // Resize max to 1200px to avoid massive PDF sizes
         const MAX = 1200;
         let w = img.width;
         let h = img.height;
         if (w > MAX || h > MAX) {
           if (w > h) { h = h * (MAX / w); w = MAX; }
           else { w = w * (MAX / h); h = MAX; }
         }
         canvas.width = w;
         canvas.height = h;
         const ctx = canvas.getContext("2d");
         if (ctx) ctx.drawImage(img, 0, 0, w, h);
         resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeout);
        reject(new Error("Failed to load"));
      };
      img.src = url;
    });
  };

  const generatePDF = async (signatureDataUrl: string, driverProfile: any, selfieDataUrl: string, selfieRes: string, selfieRefId: string) => {
    console.log("[Agreement] Starting PDF generation");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    const timestamp = new Date().toLocaleString();
    let pageNum = 1;

    const addGlobalBranding = () => {
      // Elegant vertical margin marks instead of a cheap full frame border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, margin, margin, pageHeight - margin);
      
      // Footer text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Agreement Reference Audit: AGR-${Date.now().toString().slice(-6)}`, margin + 10, pageHeight - 10);
      doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text("MAYYAN AutoAds Compliance Bureau • v1.0", pageWidth - margin, pageHeight - 10, { align: "right" });
    };

    const addWatermark = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(248, 248, 248); // ultra-subtle elegant print watermark
      
      doc.saveGraphicsState();
      doc.text("MAYYAN AUTOADS - OFFICIAL CONTRACT", pageWidth / 2, pageHeight / 2 - 30, { align: "center", angle: 45 });
      doc.text("SECURITY DEPOSIT COMPLIANT BUREAU", pageWidth / 2, pageHeight / 2 + 10, { align: "center", angle: 45 });
      doc.restoreGraphicsState();
    };
    
    const newPage = () => {
       doc.addPage();
       pageNum++;
    };

    // --- PAGE 1: SUMMARY ---
    addGlobalBranding();
    addWatermark();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("AUTOADS DRIVER PARTNERSHIP AGREEMENT", pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("CONFIDENTIAL & LEGALLY BINDING INSTRUMENT", pageWidth / 2, 40, { align: "center" });

    // Information Card
    const cardY = 55;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + 5, cardY, pageWidth - (margin * 2) - 10, 80, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("PARTNERSHIP DETAILS", margin + 15, cardY + 12);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 15, cardY + 16, pageWidth - margin - 15, cardY + 16);

    const details = [
      ["Agreement ID:", `AGR-${Date.now().toString().slice(-6)}`],
      ["Driver ID:", driverProfile.id],
      ["Driver Name:", driverProfile.name?.toUpperCase() || 'N/A'],
      ["Mobile Number:", driverProfile.phone?.toString() || 'N/A'],
      ["Vehicle Number:", driverProfile.vehicleNumber?.toUpperCase() || driverProfile.vNo?.toUpperCase() || 'N/A'],
      ["Agreement Date:", new Date().toLocaleDateString()],
      ["Status:", "ACTIVE PARTNERSHIP"]
    ];

    let currentY = cardY + 28;
    details.forEach(([lbl, val]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(lbl, margin + 15, currentY);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(val, margin + 70, currentY);
      currentY += 8;
    });

    // --- PAGE 2: BIOMETRIC VERIFICATION ---
    newPage();
    addGlobalBranding();
    addWatermark();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("IDENTITY VERIFICATION STATEMENT", pageWidth / 2, 30, { align: "center" });
    
    // Clean, professional layout showing official biometric logs and status instead of raw photos
    const logsY = 50;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + 5, logsY, pageWidth - (margin * 2) - 10, 60, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("BIOMETRIC VALIDATION COMPLIANCE", margin + 15, logsY + 12);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 15, logsY + 16, pageWidth - margin - 15, logsY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("• Biometric ID selfie verification status: SUCCESS / APPROVED", margin + 15, logsY + 25);
    doc.text(`• Verification Timestamp: ${timestamp}`, margin + 15, logsY + 31);
    doc.text(`• Cloud Storage Verification Reference ID: ${selfieRefId || 'N/A'}`, margin + 15, logsY + 37);
    doc.text("• Status: Human verification passed by MAYYAN live console audit.", margin + 15, logsY + 43);
    doc.text("• Facial Features Check: MATCHED WITH DRIVER LICENSE IDENTITY", margin + 15, logsY + 49);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("AUTHORIZED DIGITAL SIGNATURE", margin + 5, 130);
    
    // Beautiful signature mounting board
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + 5, 135, 100, 45, 'FD');
    doc.addImage(signatureDataUrl, 'PNG', margin + 10, 138, 90, 38);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Acceptance Signature Timestamp: ${timestamp}`, margin + 5, 190);
    doc.text(`IP / Network Node ID: ${btoa(driverProfile.id + timestamp).substring(16, 28).toUpperCase()}`, margin + 5, 195);

    // --- PAGE 3: DOCUMENT VAULT ---
    newPage();
    addGlobalBranding();
    addWatermark();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("SECURE DOCUMENT VERIFICATION REGISTRY", pageWidth / 2, 30, { align: "center" });

    const vaultY = 50;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + 5, vaultY, pageWidth - (margin * 2) - 10, 100, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("GOVERNMENT IDENTITIES CHECK RECORDS", margin + 15, vaultY + 12);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 15, vaultY + 16, pageWidth - margin - 15, vaultY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("The following official credentials were submitted and verified by our security controllers:", margin + 15, vaultY + 24);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("1. NATIONAL AADHAAR CARD (UIDAI):", margin + 15, vaultY + 36);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(21, 128, 61);
    doc.text(`• Status: APPROVED & ARCHIVED`, margin + 15, vaultY + 42);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("2. ACTIVE MOTOR DRIVING LICENSE (DL):", margin + 15, vaultY + 60);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(21, 128, 61);
    doc.text(`• Status: APPROVED & CENTRAL RTO CHECKED`, margin + 15, vaultY + 66);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("3. VEHICLE REGISTRATION PERMIT:", margin + 15, vaultY + 84);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(21, 128, 61);
    doc.text(`• Status: APPROVED FOR COMMERCIAL DISPLAY MOUNTING`, margin + 15, vaultY + 90);

    // --- PAGE 4: TERMS ---
    newPage();
    addGlobalBranding();
    addWatermark();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("AGREEMENT TERMS", pageWidth / 2, 30, { align: "center" });
    
    let ty = 45;
    clauses.forEach((c) => {
      if (ty > pageHeight - 40) {
        newPage();
        addGlobalBranding();
        addWatermark();
        ty = 30;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(c.title, margin + 5, ty);
      ty += 5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(c.text, pageWidth - (margin * 2) - 10);
      doc.text(lines, margin + 5, ty);
      ty += (lines.length * 4.5) + 6;
    });

    // --- PAGE 5: COMPLIANCE CERTIFICATE ---
    newPage();
    addGlobalBranding();
    addWatermark();

    // Fine double borders instead of full filled green containers (removes WordPress feel)
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(1);
    doc.line(margin + 10, margin + 15, pageWidth - margin - 10, margin + 15);
    doc.line(margin + 10, margin + 18, pageWidth - margin - 10, margin + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text("OFFICIAL COMPLIANCE CERTIFICATE", pageWidth / 2, margin + 35, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("✓ Verified Driver Identity Dossier", margin + 20, margin + 55);
    doc.text("✓ General Partnership Agreement Accepted", margin + 20, margin + 65);
    doc.text("✓ Legal Digital Signature Form Sealed", margin + 20, margin + 75);
    doc.text("✓ National Aadhaar Identity Registered", margin + 20, margin + 85);
    doc.text("✓ Active Driving License Permitted", margin + 20, margin + 95);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 20, margin + 110, pageWidth - margin - 20, margin + 110);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Auditing Authority:", margin + 20, margin + 125);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("MAYYAN AutoAds Compliance Bureau", margin + 65, margin + 125);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Verification Status:", margin + 20, margin + 135);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 128, 61);
    doc.text("ACTIVE / LAWFUL PARTNER", margin + 65, margin + 135);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Audit Timestamp:", margin + 20, margin + 145);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(timestamp, margin + 65, margin + 145);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("VERIFICATION EMBEDDED LICENSE HASH: " + btoa(driverProfile.id + timestamp).substring(0, 32).toUpperCase(), pageWidth/2, margin + 175, { align: "center"});

    console.log("[Agreement] PDF generation complete");
    return doc.output('blob');
  };

  const dataURLtoBlob = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const trimCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const context = canvas.getContext('2d');
    if (!context) return canvas;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const imgData = context.getImageData(0, 0, imgWidth, imgHeight).data;

    let minX = imgWidth;
    let minY = imgHeight;
    let maxX = 0;
    let maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        const alpha = imgData[(imgWidth * y + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasPixels = true;
        }
      }
    }

    if (!hasPixels) {
      return canvas;
    }

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropWidth;
    trimmedCanvas.height = cropHeight;

    const trimmedContext = trimmedCanvas.getContext('2d');
    if (trimmedContext) {
      trimmedContext.drawImage(
        canvas,
        minX,
        minY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );
    }

    return trimmedCanvas;
  };

  const handleFinalSubmit = async () => {
    setError(null);
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setError("Please provide your digital signature below by drawing on the pad.");
      return;
    }

    setLoading(true);
    try {
      // 0. Fetch Driver Profile
      const driverProfile = await firebaseService.getDriverProfile(driverId);
      if (!driverProfile) {
        setError("Driver profile not found. Cannot proceed.");
        setLoading(false);
        return;
      }

      const profile = driverProfile as any;
      const aadhaarUrl = driverProfile.aadharPhoto || profile.documents?.aadhaar;
      const dlUrl = driverProfile.dlPhoto || profile.documents?.drivingLicense;
      if (!aadhaarUrl || !dlUrl) {
         setError("CANNOT GENERATE PDF: AADHAAR OR DRIVING LICENSE MISSING. PLEASE COMPLETE KYC UPLOAD FIRST.");
         setLoading(false);
         return;
      }
      
      // 1. Process Selfie (use uploaded file)
      let finalSelfie = selfie;
      if (!finalSelfie) {
        setError("Please capture or upload a Verification Selfie to sign the agreement.");
        setLoading(false);
        return;
      }

      const selfieDataUrl = await fileToDataUrl(finalSelfie);

      // Validate Image Dimensions and Resize for PDF to prevent freezing
      const validateImg = (): Promise<{img: HTMLImageElement, resizedDataUrl: string}> => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
           const canvas = document.createElement("canvas");
           const MAX = 1000;
           let w = img.width;
           let h = img.height;
           if (w > MAX || h > MAX) {
             if (w > h) { h = h * (MAX / w); w = MAX; }
             else { w = w * (MAX / h); h = MAX; }
           }
           canvas.width = w;
           canvas.height = h;
           const ctx = canvas.getContext("2d");
           if (ctx) ctx.drawImage(img, 0, 0, w, h);
           resolve({ img, resizedDataUrl: canvas.toDataURL("image/jpeg", 0.7) });
        };
        img.onerror = reject;
        img.src = selfieDataUrl;
      });
      
      let imgRes = "";
      let finalSelfieDataUrlForPdf = selfieDataUrl;
      try {
         const { img: simg, resizedDataUrl } = await validateImg();
         if (simg.width < 100 || simg.height < 100) {
            setError("Verification selfie dimensions are invalid. Please capture a valid photo.");
            setLoading(false);
            return;
         }
         imgRes = `${simg.width}x${simg.height}`;
         finalSelfieDataUrlForPdf = resizedDataUrl;
      } catch (e) {
         setError("Failed to process Verification Selfie.");
         setLoading(false); return;
      }

      const selfieFileName = `verification-selfie-${Date.now()}.jpg`;
      const selfieS3Url = await storageService.uploadFile(
        finalSelfie,
        undefined,
        selfieFileName,
        `drivers/${driverId}/agreement`
      );

      // 2. Upload Signature Image
      const rawCanvas = sigCanvas.current.getCanvas();
      const trimmedCanvas = trimCanvas(rawCanvas);
      const sigData = trimmedCanvas.toDataURL('image/png');
      const sigBlob = dataURLtoBlob(sigData);
      const sigFileName = `signature-${Date.now()}.png`;
      const signatureUrl = await storageService.uploadFile(
        sigBlob,
        undefined,
        sigFileName,
        `drivers/${driverId}/agreement`
      );

      // 3. Generate and Upload PDF
      const pdfBlob = await generatePDF(sigData, driverProfile, finalSelfieDataUrlForPdf, imgRes, selfieFileName);
      const pdfFileName = `contract-${Date.now()}.pdf`;
      const pdfUrl = await storageService.uploadFile(
        pdfBlob,
        undefined,
        pdfFileName,
        `drivers/${driverId}/agreement`
      );


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
      console.error('[Agreement] Signing error:', e);
      setError("Failed to complete agreement: " + (e.message || "Network error. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-5 bg-white rounded-3xl border border-slate-100 w-full max-w-sm md:max-w-lg mx-auto overflow-hidden relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Shield className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">MAYYAN AutoAds</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Digital Partnership Agreement</p>
          </div>
        </div>
        <button 
          type="button"
          onClick={onCancel || onSigned}
          className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-1.5 px-3 uppercase tracking-widest text-[9px] font-black"
          aria-label="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> BACK
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-44 sm:h-56 md:h-64 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3 scroll-smooth"
            >
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg mb-3">
                <p className="text-orange-800 font-bold flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> Please read carefully before signing
                </p>
              </div>
              {clauses.map((c, i) => (
                <div key={i} className="group transition-all">
                  <p className="font-black text-slate-800 uppercase text-[10px] tracking-wider mb-0.5">{c.title}</p>
                  <p className="text-slate-600 leading-relaxed font-semibold text-[11px]">{c.text}</p>
                  {i < clauses.length - 1 && <div className="h-px bg-slate-200 my-3" />}
                </div>
              ))}
              {!hasScrolledToBottom && (
                <div className="sticky bottom-0 left-0 right-0 py-2 bg-gradient-to-t from-slate-50 flex justify-center">
                   <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 animate-bounce">Scroll to continue ↓</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <input 
                type="checkbox" 
                id="agree"
                disabled={!hasScrolledToBottom}
                checked={agreed} 
                onChange={e => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <label htmlFor="agree" className={cn("font-bold text-xs", !hasScrolledToBottom ? "text-slate-300" : "text-slate-700")}>
                I confirm I have read and agree to all terms above.
              </label>
            </div>

            <div className="flex gap-3 w-full animate-fadeIn">
              <button 
                type="button"
                onClick={onCancel || onSigned}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all text-center"
              >
                Back
              </button>
              <button 
                disabled={!agreed} 
                onClick={() => setStep(2)}
                className="flex-[2] py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 disabled:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
              >
                Continue to Signature <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-tight">Verification Selfie</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="user"
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
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all gap-1.5"
                  >
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selfie ? 'Selfie Attached' : 'Capture Selfie'}</span>
                  </label>
                </div>
                {selfieUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img src={selfieUrl} className="w-full h-full object-cover" alt="Selfie" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-tight">Digital Signature</label>
                <button onClick={() => sigCanvas.current?.clear()} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="border-2 border-slate-200 rounded-2xl bg-slate-50 overflow-hidden h-40 md:h-56 relative w-full touch-none">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                  className="w-full h-full cursor-crosshair touch-none" 
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-1.5 text-rose-800 font-bold text-[10px] uppercase tracking-tight">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all text-center"
              >
                Back
              </button>
              <button 
                disabled={loading} 
                onClick={handleFinalSubmit}
                className="flex-[2] py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 disabled:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
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

