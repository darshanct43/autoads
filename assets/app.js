/**
 * AutoAds Cinematic Story - Main Controller & Audio Engine
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.droneOsc = null;
    this.droneGain = null;
    this.toggleBtn = document.getElementById('btn-audio');
    this.initUI();
  }

  initUI() {
    if (!this.toggleBtn) return;
    this.toggleBtn.addEventListener('click', () => this.toggleAudio());
  }

  initAudio() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();

    // Ambient Drone
    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.droneOsc.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);

    this.droneOsc.start();
  }

  toggleAudio() {
    this.initAudio();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      this.toggleBtn.classList.add('audio-muted');
      const lbl = this.toggleBtn.querySelector('.lbl');
      if (lbl) lbl.textContent = 'SOUND OFF';
    } else {
      this.droneGain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.5);
      this.toggleBtn.classList.remove('audio-muted');
      const lbl = this.toggleBtn.querySelector('.lbl');
      if (lbl) lbl.textContent = 'SOUND ON';
    }
  }

  playTransition() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.6);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio transition error', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Engines
  const audio = new AudioEngine();
  window.AudioEngine = audio;

  const particles = new ParticleEngine('canvas-particles');
  const scrollEngine = new CinematicScrollEngine();
  window.CinematicScrollEngine = scrollEngine;

  // Nav Links smooth scroll
  const navLinks = document.querySelectorAll('.nav-item a, .nav-brand, .btn-secondary-cta');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetScene = parseInt(link.getAttribute('data-scene'), 10);
      if (targetScene) {
        e.preventDefault();
        if (targetScene === 9) {
          const ctaSection = document.getElementById('connect');
          if (ctaSection) {
            ctaSection.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          scrollEngine.scrollToScene(targetScene);
        }
      } else {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const targetEl = document.getElementById(href.substring(1));
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  });

  // Mobile Navigation Drawer Toggle
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu') || document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    const toggleNav = (open) => {
      const isOpen = open !== undefined ? open : !navMenu.classList.contains('open');
      navMenu.classList.toggle('open', isOpen);
      navToggle.classList.toggle('active', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNav();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('open') && !navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        toggleNav(false);
      }
    });

    // Close menu when clicking any nav link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1100) {
          toggleNav(false);
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        toggleNav(false);
      }
    });
  }

  // Keyboard Navigation for Cinematic Journey
  document.addEventListener('keydown', (e) => {
    const step = window.innerHeight * 0.55;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      window.scrollBy({ top: step, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      window.scrollBy({ top: -step, behavior: 'smooth' });
    }
  });
});
