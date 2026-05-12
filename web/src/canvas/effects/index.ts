import type { Point } from '@whiteboard/shared';

export class EffectsRenderer {
  private particles: Particle[] = [];

  spawnElementCreatedEffect(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.04,
        size: 3 + Math.random() * 4,
        color: `hsl(${200 + Math.random() * 60}, 70%, 60%)`,
      });
    }
  }

  spawnCursorTrail(x: number, y: number, color: string): void {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 0.6,
      decay: 0.05,
      size: 2 + Math.random() * 3,
      color,
    });
  }

  update(): void {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D, viewportX: number, viewportY: number, zoom: number): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(
        p.x * zoom + viewportX,
        p.y * zoom + viewportY,
        p.size * zoom,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  get hasParticles(): boolean {
    return this.particles.length > 0;
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}
