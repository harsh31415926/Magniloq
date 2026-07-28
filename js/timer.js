/**
 * timer.js
 * A reusable circular countdown timer. Two independent instances are
 * created for Preparation and Speaking on the topic page.
 */
const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export class RingTimer {
  /**
   * @param {HTMLElement} root - container with .timer-ring-fg, .timer-time
   * @param {number} totalSeconds
   * @param {(secondsLeft:number)=>void} onTick
   * @param {()=>void} onFinish
   */
  constructor(root, totalSeconds, onTick, onFinish) {
    this.root = root;
    this.ring = root.querySelector(".timer-ring-fg");
    this.display = root.querySelector(".timer-time");
    this.ring.style.strokeDasharray = `${CIRCUMFERENCE}`;
    this.total = totalSeconds;
    this.remaining = totalSeconds;
    this.onTick = onTick;
    this.onFinish = onFinish;
    this.intervalId = null;
    this.render();
  }

  setTotal(seconds) {
    this.pause();
    this.total = seconds;
    this.remaining = seconds;
    this.render();
  }

  render() {
    const pct = this.total > 0 ? this.remaining / this.total : 0;
    const offset = CIRCUMFERENCE * (1 - pct);
    this.ring.style.strokeDashoffset = String(offset);
    const m = Math.floor(this.remaining / 60);
    const s = Math.floor(this.remaining % 60);
    this.display.textContent = `${m}:${String(s).padStart(2, "0")}`;
    const urgent = this.remaining <= 10 && this.remaining > 0;
    this.ring.style.stroke = urgent ? "var(--gold)" : "var(--blue)";
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.render();
        this.pause();
        this.onFinish && this.onFinish();
        return;
      }
      this.render();
      this.onTick && this.onTick(this.remaining);
    }, 1000);
  }

  pause() {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  reset() {
    this.pause();
    this.remaining = this.total;
    this.render();
  }
}

/** Short synthesized beep — no external audio file needed. */
export function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [880, 1108];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.34);
    });
  } catch (e) { /* audio not available — fail silently */ }
}
