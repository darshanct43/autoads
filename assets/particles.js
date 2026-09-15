/**
 * AutoAds Cinematic Story - Ambient Particle Engine
 * Creates floating golden dust, embers, and urban light flecks
 */

class ParticleEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 55;
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.isRunning = true;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: true });

    this.createParticles();
    this.loop();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  onMouseMove(e) {
    this.targetMouseX = (e.clientX - this.width / 2) * 0.04;
    this.targetMouseY = (e.clientY - this.height / 2) * 0.04;
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2.2 + 0.6,
        baseAlpha: Math.random() * 0.5 + 0.2,
        alpha: 0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(Math.random() * 0.6 + 0.2),
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayRange: Math.random() * 20 + 10,
        seed: Math.random() * 100,
        color: Math.random() > 0.35 ? '#FFCC00' : '#FFFFFF'
      });
    }
  }

  loop() {
    if (!this.isRunning) return;

    // Smooth mouse interpolation
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.y += p.vy;
      p.seed += p.swaySpeed;
      const sway = Math.sin(p.seed) * 0.5;
      const drawX = p.x + sway + this.mouseX;
      const drawY = p.y + this.mouseY;

      // Wrap around bounds
      if (p.y < -20) {
        p.y = this.height + 20;
        p.x = Math.random() * this.width;
      }
      if (p.x < -20) p.x = this.width + 20;
      if (p.x > this.width + 20) p.x = -20;

      // Fade in/out near top/bottom
      const edgeFade = Math.min(
        1,
        Math.min(p.y / (this.height * 0.15), (this.height - p.y) / (this.height * 0.15))
      );
      const currentAlpha = p.baseAlpha * Math.max(0, edgeFade);

      this.ctx.beginPath();
      this.ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2);

      // Soft glow
      this.ctx.shadowBlur = p.radius > 1.5 ? 8 : 4;
      this.ctx.shadowColor = p.color;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = currentAlpha;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;

    requestAnimationFrame(() => this.loop());
  }
}

window.ParticleEngine = ParticleEngine;
