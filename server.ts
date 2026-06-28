import express from 'express';
import path from 'path';
import fs from 'fs';
import adminAiHandler, { getSystemData } from './backend/admin-ai.js';
import uploadHandler from './lib/upload.js';
import chatHandler from './backend/chat.js';
import createOrderHandler from './api/create-order.js';
import verifyPaymentHandler from './api/verify-payment.js';
import backupEnvHandler from './api/backup-env.js';
import systemMetricsHandler from './api/system-metrics.js';
import debugRazorpayHandler from './api/debug-razorpay.js';
import razorpayHealthHandler from './api/razorpay-health.js';
import createStaffHandler from './api/create-staff.js';
import razorpayWebhookHandler from './api/razorpay-webhook.js';
import envSecurityHandler from './api/env-security.js';

import { getCredential, printAudit } from './lib/env.js';
printAudit();

// Print loaded Razorpay details at startup
const rawKeyId = getCredential('RAZORPAY_KEY_ID');
const rawSecret = getCredential('RAZORPAY_KEY_SECRET');
const keyIdTrimmed = rawKeyId.trim().replace(/^["']|["']$/g, '');
const secretTrimmed = rawSecret.trim().replace(/^["']|["']$/g, '');

console.log("==========================================");
console.log("🔒 FLEETOPS RAZORPAY ENVIRONMENT SECURITY AUDIT:");
console.log(`- Loaded Source: Pure System Environment / .env File only`);
console.log(`- Loaded Key ID Prefix: ${keyIdTrimmed ? keyIdTrimmed.substring(0, 12) + "..." : "NONE"}`);
console.log(`- Loaded Secret Length: ${secretTrimmed ? secretTrimmed.length : 0} characters`);
console.log("==========================================");

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("[Server] Registering core API routes...");

  // Register upload handler BEFORE any body parsers to ensure formidable gets the raw stream
  app.post('/api/upload', (req, res, next) => {
    console.log(`[Server] POST /api/upload received from ${req.ip}`);
    uploadHandler(req, res).catch(err => {
      console.error("[Server] Upload Handler Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error in upload handler', details: err.message });
      }
    });
  });

  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.post('/api/admin-ai', adminAiHandler as any);
  app.post('/api/chat', chatHandler as any);
  app.post('/api/create-order', createOrderHandler as any);
  app.post('/api/verify-payment', verifyPaymentHandler as any);
  app.get('/api/razorpay-health', razorpayHealthHandler as any);
  app.post('/api/backup-env', backupEnvHandler as any);
  app.get('/api/debug-razorpay', debugRazorpayHandler as any);
  app.get('/api/system-metrics', systemMetricsHandler as any);
  app.post('/api/create-staff', createStaffHandler as any);
  app.post('/api/razorpay-webhook', razorpayWebhookHandler as any);
  app.post('/api/env-security', envSecurityHandler as any);

  app.get('/api/env-check', (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      hasRazorpayKey: !!process.env.RAZORPAY_KEY_ID,
      hasRazorpaySecret: !!process.env.RAZORPAY_KEY_SECRET,
      getCredentialKey: getCredential('RAZORPAY_KEY_ID'),
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/payment-config', (req, res) => {
    // Determine configured gateway: favor database/environment
    res.json({
      gateway: 'razorpay'
    });
  });

  // API Fallback: Ensure any missing /api route returns JSON error instead of index.html
  app.all('/api/*', (req, res) => {
    console.warn(`[Server] 404 API Fallback reached for ${req.method} ${req.url}`);
    res.status(404).json({ 
      success: false,
      error: 'API Route Not Found'
    });
  });

  app.get('/plain.html', (req, res) => {
    res.send('<html><body>HELLO MXQ</body></html>');
  });

  // Legacy routes removed


  // STANDALONE /TV & /KIOSK PORTALS (Bypasses Firebase Auth & SDK loading completely)
  const serveTvPortal = async (req: any, res: any) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AutoAds Terminal Signage Engine (Bypass Mode)</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #0b111e;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      display: flex;
    }
    
    /* Viewport layout */
    .viewport {
      flex: 1;
      height: 100%;
      position: relative;
      background-color: #020617;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    /* Signage Header Banner */
    .header-banner {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 10;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
    }
    
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .brand-logo {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 14px;
      color: #020617;
    }
    
    .brand-name {
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.06em;
      color: #ffffff;
      text-transform: uppercase;
    }
    
    .status-badge {
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      background-color: #10b981;
      border-radius: 50%;
      animation: pulse-glow 2s infinite;
    }
    @keyframes pulse-glow {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }
    
    .meta-group {
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      color: #94a3b8;
    }
    .param-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .param-label {
      color: #64748b;
    }
    .param-value {
      color: #cbd5e1;
      font-weight: 600;
    }
    
    /* Playback Stage */
    .player-container {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #02040a;
    }
    
    .media-element {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
      z-index: 1;
    }
    
    .media-element.active {
      opacity: 1;
      z-index: 2;
    }
    
    /* Overlay Metadata */
    .campaign-overlay {
      position: absolute;
      bottom: 40px;
      left: 40px;
      right: 40px;
      background: rgba(11, 15, 25, 0.8);
      backdrop-filter: blur(10px);
      padding: 20px 24px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 5;
      max-width: 480px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.6);
      transition: all 0.3s ease;
    }
    
    .campaign-tag {
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 4px;
    }
    
    .campaign-title {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }
    
    .campaign-desc {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.45;
    }
    
    /* Operations Control Center (Sidebar) */
    .control-sidebar {
      width: 340px;
      height: 100%;
      background: #0f172a;
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      z-index: 20;
      box-shadow: -10px 0 32px rgba(0,0,0,0.5);
    }
    
    .sidebar-header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .sidebar-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #f8fafc;
    }
    .sidebar-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    
    .control-section {
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .section-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 12px;
    }
    
    .control-btn {
      width: 100%;
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 11px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      text-align: left;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s ease;
      margin-bottom: 8px;
    }
    .control-btn:hover {
      background: #334155;
      color: #f8fafc;
      border-color: #475569;
    }
    .control-btn.active {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.4);
    }
    .control-btn:last-child {
      margin-bottom: 0;
    }
    
    /* Logger Panel */
    .log-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      overflow: hidden;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    
    .log-header {
      background: #090d16;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    
    .log-body {
      flex: 1;
      padding: 12px;
      font-size: 11px;
      color: #10b981;
      overflow-y: auto;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    
    /* Lockdown Interface Overlay */
    .lockdown-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(8, 12, 21, 0.98);
      z-index: 30;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px;
      text-align: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease-in-out;
    }
    
    .lockdown-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    
    .lock-icon-box {
      width: 74px;
      height: 74px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.1);
      border: 2px solid #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
      font-size: 28px;
      margin-bottom: 24px;
      animation: lock-ring 2s infinite;
    }
    
    @keyframes lock-ring {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
      70% { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    
    .lock-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 12px;
      letter-spacing: -0.01em;
      text-transform: uppercase;
    }
    
    .lock-text {
      max-width: 400px;
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.6;
    }
    
    /* Auxiliary classes */
    .btn-action-cluster {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    .utility-link {
      color: #38bdf8;
      text-decoration: none;
      font-size: 11px;
      font-weight: 600;
    }
    .utility-link:hover {
      text-decoration: underline;
    }
    
    /* Responsive layouts */
    @media (max-width: 950px) {
      body {
        flex-direction: column;
      }
      .control-sidebar {
        width: 100%;
        height: 380px;
        border-left: none;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .viewport {
        height: calc(100vh - 380px);
      }
      .campaign-overlay {
        bottom: 20px;
        left: 20px;
        right: 20px;
        padding: 14px 18px;
      }
    }
  </style>
</head>
<body>
  <div class="viewport">
    <!-- Header info banner -->
    <div class="header-banner">
      <div class="brand-group">
        <div class="brand-logo">A</div>
        <div class="brand-name">AutoAds Terminal</div>
        <div class="status-badge">
          <div class="status-dot" id="net-dot"></div>
          <span id="net-badge">Connected (TV Signage)</span>
        </div>
      </div>
      <div class="meta-group">
        <div class="param-item">
          <span class="param-label">ID:</span>
          <span class="param-value">TERM-MXQ-6600</span>
        </div>
        <div class="param-item">
          <span class="param-label">Battery:</span>
          <span class="param-value" id="bat-val">98% Charging</span>
        </div>
        <div class="param-item">
          <span class="param-label">Clock:</span>
          <span class="param-value" id="hud-clock">00:00:00 UTC</span>
        </div>
      </div>
    </div>
    
    <!-- Video element and Image elements -->
    <div class="player-container">
      <video id="tv-video" class="media-element" muted playsinline></video>
      <img id="tv-image" class="media-element" alt="Campaign Banner">
      
      <!-- Bottom Campaign metadata text overlay -->
      <div class="campaign-overlay" id="camp-overlay">
        <div class="campaign-tag" id="camp-tag">Active Campaign</div>
        <div class="campaign-title" id="camp-title">Loading display...</div>
        <div class="campaign-desc" id="camp-desc">Establishing standalone sequence profile.</div>
      </div>
      
      <!-- Lockdown state overlay -->
      <div class="lockdown-overlay" id="lock-screen">
        <div class="lock-icon-box">&#128274;</div>
        <div class="lock-title">Display Locked Remotely</div>
        <div class="lock-text">This display unit has been remotely locked by the administrative command console. Active campaign loops are suspended.</div>
      </div>
    </div>
  </div>
  
  <!-- Controller panel sidebar -->
  <div class="control-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">Signage Operations Center</div>
      <div class="sidebar-subtitle">Bypass Control Hub & WebView Diagnostics</div>
    </div>
    
    <!-- Remote Administration Command Simulation -->
    <div class="control-section">
      <div class="section-label">Simulate Remote Command Actions</div>
      <button class="control-btn" id="lock-toggle-btn" onclick="triggerClientLock()">
        <span>LOCKDOWN PLAYBACK</span>
        <span class="btn-icon">&#128274;</span>
      </button>
      <button class="control-btn" onclick="advancePlaylist()">
        <span>SKIP CURRENT CAMPAIGN</span>
        <span class="btn-icon">&#9193;</span>
      </button>
      <button class="control-btn" id="net-toggle-btn" onclick="triggerClientDisconnect()">
        <span>TOGGLE Network connectivity</span>
        <span class="btn-icon">&#128246;</span>
      </button>
    </div>
    
    <!-- Logs monitor panel -->
    <div class="control-section" style="flex: 1; display: flex; flex-direction: column; min-height: 180px;">
      <div class="section-label">Live Terminal Telemetry logs</div>
      <div class="log-container">
        <div class="log-header">
          <span>CONSOLE OUTPUT</span>
          <span style="cursor: pointer; text-decoration: underline;" onclick="clearLogs()">Clear</span>
        </div>
        <div class="log-body" id="log-body"></div>
      </div>
      <div class="btn-action-cluster">
        <a href="/legacy-test" class="utility-link">Hardware probe</a>
        <span style="color: #475569;">|</span>
        <a href="/legacy-auth-test" class="utility-link">Auth audit</a>
      </div>
    </div>
  </div>

  <script>
    var logs = [];
    var playlist = [
      {
        id: "media_1",
        title: "Coca-Cola Summer Splash",
        desc: "Refreshing display campaigns. Fully optimized for citywide taxi-mounters and public vehicle display terminals.",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        type: "VIDEO"
      },
      {
        id: "media_2",
        title: "Google Pixel Tablet Display",
        desc: "Interactive smart hub with machine learning optimization. Playing on custom AutoAds television networks.",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        type: "VIDEO"
      },
      {
        id: "media_3",
        title: "Nike Movement Catalyst",
        desc: "Empowering sports trackers across metropolitan transport panels. Running daily high-density loop.",
        url: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=1200&q=80",
        type: "IMAGE",
        duration: 7000
      },
      {
        id: "media_4",
        title: "AutoAds City Network",
        desc: "Connect passenger attention with responsive geographic advertisement placement. Secure miles to payouts in real-time.",
        url: "https://images.unsplash.com/photo-1549880756-c28a427e974f?auto=format&fit=crop&w=1200&q=80",
        type: "IMAGE",
        duration: 7500
      }
    ];
    
    var currentIndex = 0;
    var imageTimer = null;
    var isLocked = false;
    var isOnline = true;
    
    function appendLog(msg) {
      var d = new Date();
      var timeStr = d.toTimeString().split(' ')[0];
      logs.push("[" + timeStr + "] " + msg);
      
      // Restrict log length
      if (logs.length > 80) logs.shift();
      
      var logBody = document.getElementById('log-body');
      if (logBody) {
        logBody.innerText = logs.join('\\n');
        logBody.scrollTop = logBody.scrollHeight;
      }
    }
    
    function clearLogs() {
      logs = [];
      appendLog("Logs cleared.");
    }
    
    // Playback Controller
    var videoNode = document.getElementById('tv-video');
    var imageNode = document.getElementById('tv-image');
    
    function playAd(index) {
      if (isLocked) return;
      
      // Safety bounds
      if (index >= playlist.length) index = 0;
      currentIndex = index;
      
      var ad = playlist[index];
      appendLog("PLAYER: Loading campaign element '" + ad.title + "' (" + ad.type + ")");
      
      // Clear any pending image timer
      if (imageTimer) {
        clearTimeout(imageTimer);
        imageTimer = null;
      }
      
      // Set metadata info overlays
      document.getElementById('camp-title').innerText = ad.title;
      document.getElementById('camp-desc').innerText = ad.desc;
      
      if (ad.type === "VIDEO") {
        imageNode.className = "media-element"; // inactive
        
        videoNode.src = ad.url;
        videoNode.className = "media-element active";
        
        // Native media loaders
        videoNode.load();
        var playPromise = videoNode.play();
        if (playPromise !== undefined) {
          playPromise.then(function() {
            appendLog("PLAYER: Video playback started successfully.");
          }).catch(function(err) {
            appendLog("PLAYER: Video autoplay blocked or load failed: " + err.message);
            // Auto skip to preserve loop
            imageTimer = setTimeout(function() {
              advancePlaylist();
            }, 5000);
          });
        }
      } else {
        // IMAGE
        videoNode.pause();
        videoNode.className = "media-element"; // inactive
        
        imageNode.src = ad.url;
        imageNode.className = "media-element active";
        
        appendLog("PLAYER: Displaying image. Loop timeout set to " + ad.duration + "ms.");
        
        imageTimer = setTimeout(function() {
          advancePlaylist();
        }, ad.duration);
      }
    }
    
    function advancePlaylist() {
      if (isLocked) return;
      var nextIndex = (currentIndex + 1) % playlist.length;
      appendLog("PLAYER: Transitioning... Next index: " + nextIndex);
      playAd(nextIndex);
    }
    
    // Bind ended event of video
    videoNode.onended = function() {
      appendLog("PLAYER: Video campaign ended naturally.");
      advancePlaylist();
    };
    
    videoNode.onerror = function() {
      appendLog("PLAYER: ERROR: Video payload failed to load. Skipping...");
      advancePlaylist();
    };
    
    // Interactive actions
    function triggerClientLock() {
      var lockScreen = document.getElementById('lock-screen');
      var lockBtn = document.getElementById('lock-toggle-btn');
      
      isLocked = !isLocked;
      if (isLocked) {
        lockScreen.className = "lockdown-overlay active";
        lockBtn.className = "control-btn active";
        lockBtn.querySelector('span').innerText = "UNLOCK PLAYBACK";
        
        // Pause active elements
        videoNode.pause();
        if (imageTimer) clearTimeout(imageTimer);
        appendLog("SECURITY: LOCKDOWN ENABLED. All active campaign plays suspended.");
      } else {
        lockScreen.className = "lockdown-overlay";
        lockBtn.className = "control-btn";
        lockBtn.querySelector('span').innerText = "LOCKDOWN PLAYBACK";
        appendLog("SECURITY: LOCKDOWN REMOVED. Restoring active sequence...");
        playAd(currentIndex);
      }
    }
    
    function triggerClientDisconnect() {
      isOnline = !isOnline;
      var netDot = document.getElementById('net-dot');
      var netBadge = document.getElementById('net-badge');
      var netBtn = document.getElementById('net-toggle-btn');
      
      if (isOnline) {
        netDot.style.backgroundColor = "#10b981";
        netBadge.innerText = "Connected (TV Signage)";
        netBtn.className = "control-btn";
        appendLog("TELEMETRY: Network transmitter online. Synchronized local heartbeats.");
      } else {
        netDot.style.backgroundColor = "#ef4444";
        netBadge.innerText = "Offline (Local Safeguard)";
        netBtn.className = "control-btn active";
        appendLog("TELEMETRY: Connection interrupted. Falling back to standalone persistent safety buffers.");
      }
    }
    
    // Live HUD Clock & Battery Simulation
    setInterval(function() {
      var hudClock = document.getElementById('hud-clock');
      if (hudClock) {
        var d = new Date();
        hudClock.innerText = d.toTimeString().split(' ')[0] + " UTC";
      }
    }, 1000);
    
    setInterval(function() {
      var batVal = document.getElementById('bat-val');
      if (batVal) {
        var p = 94 + Math.round(Math.random() * 5);
        batVal.innerText = p + "% Charging";
      }
    }, 10000);
    
    // Boot sequence
    (function() {
      appendLog("SYSTEM: Bypassing Firebase SDK imports completely (0% handshake cost).");
      appendLog("SYSTEM: Standalone player mounted onto compatible TV Canvas.");
      appendLog("SYSTEM: Detected runtime environment: WebView 66 / Chrome 66 compatible.");
      appendLog("SYSTEM: Initiating first playlist campaign...");
      playAd(0);
    })();
  </script>
</body>
</html>`);
};
  app.get('/tv', serveTvPortal);
  app.get('/kiosk', serveTvPortal);

    

    

    

    

    

    

    

    

    

    

    

    

    

    

    

    




  app.get('/api/stats', async (req, res) => {
    try {
      const data = await getSystemData();
      res.json({
        activeAdScreensCount: data.activeAdScreensCount,
        registeredDriversCount: data.registeredDriversCount,
        fetchedFromFirestore: data.fetchedFromFirestore
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production path resolution
    // dist/server.cjs is the outfile, so __dirname is the 'dist' directory
    const distPath = typeof __dirname !== 'undefined' 
      ? path.resolve(__dirname) 
      : path.join(process.cwd(), 'dist');
    
    console.log(`[Server] Production Mode Active. Selected distPath: ${distPath}`);
    const indexHtmlExists = fs.existsSync(path.join(distPath, 'index.html'));
    console.log(`[Server] index.html exists verification at target: ${indexHtmlExists}`);

    app.use(express.static(distPath));
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
    app.use('/videos', express.static(path.join(process.cwd(), 'videos')));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build is in progress or index.html is missing. Please reload.');
      }
    });
  }

  console.log(`[Server] Starting Express server on port ${PORT}...`);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Server running on http://localhost:${PORT}`);
  });
}

console.log("[Server] Calling startServer()...");
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
