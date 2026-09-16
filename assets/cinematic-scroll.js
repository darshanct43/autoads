/**
 * AutoAds Cinematic Story - Scroll & Frame Scrubbing Engine (7 Motion Scenes + FAQ)
 * Scrubs all 50 video frames across folders 1, 2, 3, 4, 5, 6, 7 in real time.
 */

class CinematicScrollEngine {
  constructor() {
    this.canvas = document.getElementById('canvas-frames');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.lightSweep = document.getElementById('light-sweep');
    this.hudProgress = document.getElementById('hud-progress');
    this.hudNumber = document.getElementById('hud-number');
    this.hudTitle = document.getElementById('hud-title');
    this.scrollCue = document.getElementById('scroll-cue');
    this.navLinks = document.querySelectorAll('.nav-menu a');
    this.storyTrack = document.querySelector('.story-track');
    this.sceneHud = document.querySelector('.scene-hud');
    this.cardContainer = document.querySelector('.scene-card-container');

    // 8 Stages: 7 Motion Scenes + 1 Dedicated FAQ Scene
    this.scenes = [
      { id: 1, name: 'WHAT IS AUTOADS', folder: '1', start: 0.00, end: 0.12, transEnd: 0.14, focalY: 0.35, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-1.jpg' },
      { id: 2, name: 'TRANSIT MEDIA', folder: '2', start: 0.14, end: 0.26, transEnd: 0.28, focalY: 0.45, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-2.jpg' },
      { id: 3, name: 'HYPERLOCAL IMPACT', folder: '3', start: 0.28, end: 0.40, transEnd: 0.42, focalY: 0.50, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-3.jpg' },
      { id: 4, name: 'OFFLINE + DIGITAL', folder: '4', start: 0.42, end: 0.54, transEnd: 0.56, focalY: 0.32, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-4.jpg' },
      { id: 5, name: 'DROP ADS IN 1 MIN', folder: '5', start: 0.56, end: 0.68, transEnd: 0.70, focalY: 0.45, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-5.jpg' },
      { id: 6, name: 'FITNESS & HUSTLE', folder: '6', start: 0.70, end: 0.80, transEnd: 0.82, focalY: 0.35, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-6.jpg' },
      { id: 7, name: 'STOP WASTING SPEND', folder: '7', start: 0.82, end: 0.91, transEnd: 0.93, focalY: 0.40, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-7.jpg' },
      { id: 8, name: 'QUESTIONS & ANSWERS', folder: '7', start: 0.93, end: 0.98, transEnd: 1.00, focalY: 0.40, masterSrc: (window.AUTOADS_CDN_PATH || 'assets/') + 'scene-7.jpg' }
    ];

    this.sceneFrames = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
    this.masterImages = {};
    this.framesCount = 50;

    this.targetProgress = 0;
    this.currentProgress = 0;
    this.lastTriggeredScene = -1;
    this.isPastStoryTrack = false;
    this.trackRunway = 0;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;

    this.init();
  }

  init() {
    this.resize();
    this.onScroll();
    window.addEventListener('resize', () => { this.resize(); this.onScroll(); }, { passive: true });
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });

    this.preloadAllFrames();
    this.preloadMasters();
    this.loop();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  preloadMasters() {
    this.scenes.forEach(scene => {
      const img = new Image();
      img.src = scene.masterSrc;
      img.onload = () => {
        this.masterImages[scene.id] = img;
        if (scene.id === 1 && this.currentProgress === 0) {
          this.render();
        }
      };
    });
  }

  preloadAllFrames() {
    const cdn = window.AUTOADS_CDN_PATH || 'assets/';
    [1, 2, 3, 4, 5, 6, 7].forEach(folder => {
      for (let i = 1; i <= this.framesCount; i++) {
        const frameNum = String(i).padStart(3, '0');
        const img = new Image();
        if (cdn.includes('autoads.co.in')) {
          img.src = `${cdn}${folder}/ezgif-frame-${frameNum}.jpg`;
        } else {
          img.src = `${cdn}f${folder}_${frameNum}.jpg`;
        }
        img.onload = () => {
          this.sceneFrames[folder][i - 1] = img;
        };
      }
    });
    this.sceneFrames[8] = this.sceneFrames[7];
  }

  onScroll() {
    const scrollY = window.scrollY;
    const track = this.storyTrack || document.querySelector('.story-track');
    const trackRunway = track ? Math.max(1, track.offsetHeight - window.innerHeight) : (document.documentElement.scrollHeight - window.innerHeight);
    this.trackRunway = trackRunway;

    // Cinematic progress 0.0 -> 1.0 strictly within the 1600vh story track
    this.targetProgress = Math.min(1, Math.max(0, scrollY / trackRunway));
    this.isPastStoryTrack = scrollY > (trackRunway + 30);

    if (this.scrollCue) {
      if (scrollY > 80) {
        this.scrollCue.style.opacity = '0';
      } else {
        this.scrollCue.style.opacity = '1';
      }
    }
  }

  loop() {
    const ease = 0.09;
    this.currentProgress += (this.targetProgress - this.currentProgress) * ease;

    this.updateHUD();
    this.updateCards();
    this.render();

    requestAnimationFrame(() => this.loop());
  }

  updateHUD() {
    const p = this.currentProgress;

    // When scrolled past the cinematic story track into the discovery hub, fade out HUD
    if (this.isPastStoryTrack || (p >= 0.995 && window.scrollY > (this.trackRunway || 0))) {
      if (this.sceneHud) {
        this.sceneHud.style.opacity = '0';
        this.sceneHud.style.pointerEvents = 'none';
      }
      this.updateDiscoveryNav();
      return;
    }

    if (this.sceneHud) {
      this.sceneHud.style.opacity = '1';
      this.sceneHud.style.pointerEvents = 'auto';
    }

    if (this.hudProgress) {
      this.hudProgress.style.height = `${Math.min(100, Math.max(8, p * 100))}%`;
    }

    let activeScene = this.scenes[0];
    for (let i = 0; i < this.scenes.length; i++) {
      if (p >= this.scenes[i].start) {
        activeScene = this.scenes[i];
      }
    }

    if (activeScene.id !== this.lastTriggeredScene) {
      this.lastTriggeredScene = activeScene.id;
      if (this.hudNumber) this.hudNumber.textContent = `0${activeScene.id} / 08`;
      if (this.hudTitle) this.hudTitle.textContent = activeScene.name;
      this.updateNavLinks(activeScene.id);

      if (this.lightSweep) {
        this.lightSweep.classList.remove('sweeping');
        void this.lightSweep.offsetWidth;
        this.lightSweep.classList.add('sweeping');
      }

      if (window.AudioEngine && window.AudioEngine.playTransition) {
        window.AudioEngine.playTransition();
      }
    }
  }

  updateDiscoveryNav() {
    const sections = [
      { id: 'international', selector: 'a[href="#international"]' },
      { id: 'cities', selector: 'a[href="#cities"]' },
      { id: 'faqs', selector: 'a[href="#faqs"]' },
      { id: 'connect', selector: 'a[href="#connect"]' }
    ];

    let currentSelector = null;
    const scrollY = window.scrollY;
    const offset = window.innerHeight * 0.4;

    for (const sec of sections) {
      const el = document.getElementById(sec.id);
      if (el) {
        const top = el.offsetTop;
        if (scrollY + offset >= top) {
          currentSelector = sec.selector;
        }
      }
    }

    this.navLinks.forEach(link => {
      if (currentSelector && link.matches(currentSelector)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  updateNavLinks(activeId) {
    this.navLinks.forEach(link => {
      const sceneTarget = parseInt(link.getAttribute('data-scene'), 10);
      if (sceneTarget === activeId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  updateCards() {
    const p = this.currentProgress;
    const cards = [
      { el: document.getElementById('card-scene-1'), start: 0.00, end: 0.12 },
      { el: document.getElementById('card-scene-2'), start: 0.14, end: 0.26 },
      { el: document.getElementById('card-scene-3'), start: 0.28, end: 0.40 },
      { el: document.getElementById('card-scene-4'), start: 0.42, end: 0.54 },
      { el: document.getElementById('card-scene-5'), start: 0.56, end: 0.68 },
      { el: document.getElementById('card-scene-6'), start: 0.70, end: 0.80 },
      { el: document.getElementById('card-scene-7'), start: 0.82, end: 0.91 },
      { el: document.getElementById('card-scene-faq'), start: 0.93, end: 0.98 }
    ];

    // If past the cinematic story track into the discovery hub, cleanly hide all cards
    if (this.isPastStoryTrack || (p >= 0.995 && window.scrollY > (this.trackRunway || 0))) {
      if (this.cardContainer) {
        this.cardContainer.style.opacity = '0';
        this.cardContainer.style.visibility = 'hidden';
      }
      cards.forEach(item => {
        if (item.el) {
          item.el.classList.remove('active');
          item.el.classList.add('exiting');
        }
      });
      return;
    }

    if (this.cardContainer) {
      this.cardContainer.style.opacity = '1';
      this.cardContainer.style.visibility = 'visible';
    }

    cards.forEach((item) => {
      if (!item.el) return;
      if (p >= item.start && p <= item.end) {
        item.el.classList.add('active');
        item.el.classList.remove('exiting');
      } else if (p > item.end && p <= item.end + 0.02) {
        item.el.classList.remove('active');
        item.el.classList.add('exiting');
      } else {
        item.el.classList.remove('active');
        item.el.classList.remove('exiting');
      }
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const p = this.currentProgress;

    ctx.clearRect(0, 0, w, h);

    // Determine active scene and transition state
    let activeScene = this.scenes[0];
    let nextScene = null;
    let blend = 0;
    let sceneProg = 0;

    for (let i = 0; i < this.scenes.length; i++) {
      const s = this.scenes[i];
      if (p >= s.start && p < s.transEnd) {
        activeScene = s;
        if (p > s.end && i < this.scenes.length - 1) {
          nextScene = this.scenes[i + 1];
          blend = (p - s.end) / (s.transEnd - s.end);
        } else {
          sceneProg = (p - s.start) / (s.end - s.start);
        }
        break;
      }
    }

    if (p >= this.scenes[7].transEnd) {
      activeScene = this.scenes[7];
      sceneProg = 1;
    }

    // Camera Push-In scale
    const pushInScale = 1.0 + Math.min(0.08, sceneProg * 0.08);

    // Render active scene frames in motion
    ctx.save();
    ctx.globalAlpha = nextScene ? (1 - blend) : 1;
    this.drawSceneFrame(ctx, activeScene, sceneProg, pushInScale);
    ctx.restore();

    // Render overlapping next scene during transition
    if (nextScene && blend > 0) {
      ctx.save();
      ctx.globalAlpha = blend;
      const nextScale = 1.08 - (blend * 0.04);
      this.drawSceneFrame(ctx, nextScene, 0, nextScale);
      ctx.restore();
    }
  }

  drawSceneFrame(ctx, scene, progress, scale) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    let imgToDraw = null;
    const folderId = scene.id === 8 ? 7 : scene.id;
    const frames = this.sceneFrames[folderId];

    if (frames && frames.length > 0) {
      const frameIdx = Math.min(
        this.framesCount - 1,
        Math.max(0, Math.floor(progress * (this.framesCount - 1)))
      );
      imgToDraw = frames[frameIdx];
    }

    if (!imgToDraw || !imgToDraw.complete || imgToDraw.naturalWidth === 0) {
      imgToDraw = this.masterImages[scene.id];
    }

    if (!imgToDraw || !imgToDraw.complete || imgToDraw.naturalWidth === 0) return;

    // Aspect-Ratio Cover with focal alignment
    const nw = imgToDraw.naturalWidth;
    const nh = imgToDraw.naturalHeight;
    const canvasRatio = w / h;
    const imgRatio = nw / nh;

    let dw, dh, dx, dy;
    if (imgRatio > canvasRatio) {
      dh = h * scale;
      dw = dh * imgRatio;
      dx = (w - dw) / 2;
      dy = (h - dh) * (scene.focalY !== undefined ? scene.focalY : 0.4);
    } else {
      dw = w * scale;
      dh = dw / imgRatio;
      dx = (w - dw) / 2;
      dy = (h - dh) * (scene.focalY !== undefined ? scene.focalY : 0.4);
    }

    ctx.drawImage(imgToDraw, dx, dy, dw, dh);
  }

  scrollToScene(sceneId) {
    const scene = this.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const track = this.storyTrack || document.querySelector('.story-track');
    const trackRunway = track ? Math.max(1, track.offsetHeight - window.innerHeight) : (document.documentElement.scrollHeight - window.innerHeight);
    const targetP = scene.id === 1 ? 0 : (scene.start + 0.02);
    const targetY = targetP * trackRunway;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  getCurrentSceneIndex() {
    const p = this.currentProgress;
    for (let i = this.scenes.length - 1; i >= 0; i--) {
      if (p >= this.scenes[i].start - 0.015) {
        return i;
      }
    }
    return 0;
  }

  nextScene() {
    const currentIdx = this.getCurrentSceneIndex();
    if (currentIdx < this.scenes.length - 1) {
      this.scrollToScene(this.scenes[currentIdx + 1].id);
    } else {
      const hub = document.getElementById('international') || document.querySelector('.discovery-hub-wrapper') || document.getElementById('contact');
      if (hub) {
        hub.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  prevScene() {
    const currentIdx = this.getCurrentSceneIndex();
    if (currentIdx > 0) {
      this.scrollToScene(this.scenes[currentIdx - 1].id);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

window.CinematicScrollEngine = CinematicScrollEngine;
