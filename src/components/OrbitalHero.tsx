'use client';
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Original high-DPI orbital illustration: fine paths stay sharp without a blurred shader buffer.
export function OrbitalHero() {
  const canvas = useRef<HTMLCanvasElement>(null), reduced = useReducedMotion();
  useEffect(() => {
    const element = canvas.current, context = element?.getContext('2d', { alpha: true });
    if (!element || !context) return;
    let width = 0, height = 0, frame = 0, visible = true, last = 0;
    let px = 0, py = 0, targetX = 0, targetY = 0;
    const stars = Array.from({ length: 90 }, (_, i) => ({
      x: ((Math.sin(i * 127.1 + 21) * 43758.5453) % 1 + 1) % 1,
      y: ((Math.sin(i * 311.7 + 17) * 13579.73) % 1 + 1) % 1,
    }));
    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      if (!reduced && now - last < 30) { frame = requestAnimationFrame(draw); return; }
      last = now;
      px += (targetX - px) * .045; py += (targetY - py) * .045;
      const time = reduced ? 0 : now / 1000;
      const unit = Math.min(width, height), radius = unit * .32;
      context.clearRect(0, 0, width, height);
      for (const [i, star] of stars.entries()) {
        context.fillStyle = `rgba(211,221,227,${.12 + (i % 4) * .06})`;
        context.fillRect(star.x * width, star.y * height, i % 7 === 0 ? 1.5 : .8, i % 7 === 0 ? 1.5 : .8);
      }
      context.save(); context.translate(width * .53 + px * 9, height * .48 + py * 7);
      const halo = context.createRadialGradient(0, 0, radius * .1, 0, 0, radius * 1.5);
      halo.addColorStop(0, '#ffb45e16'); halo.addColorStop(.45, '#ffb45e09'); halo.addColorStop(1, '#ffb45e00');
      context.fillStyle = halo; context.fillRect(-unit, -unit, unit * 2, unit * 2);
      const ring = (rotation: number, scale: number, front: boolean) => {
        context.save(); context.rotate(rotation + px * .02);
        context.beginPath(); context.ellipse(0, 0, radius * scale, radius * .32 * scale, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        context.lineWidth = front ? 1.1 : .7; context.strokeStyle = front ? '#d6b28a88' : '#d3dde32e'; context.stroke();
        context.beginPath(); context.ellipse(0, 0, radius * scale + 7, radius * .32 * scale + 7, 0, 0, Math.PI * 2);
        context.lineWidth = .5; context.strokeStyle = '#d3dde31b'; context.stroke();
        const angle = time * .13 + rotation * 3;
        if ((Math.sin(angle) >= 0) === front) {
          const x = Math.cos(angle) * radius * scale, y = Math.sin(angle) * radius * .32 * scale;
          const light = context.createRadialGradient(x, y, 0, x, y, 16);
          light.addColorStop(0, '#ffcb8b99'); light.addColorStop(1, '#ffb45e00');
          context.fillStyle = light; context.fillRect(x - 16, y - 16, 32, 32);
          context.beginPath(); context.arc(x, y, 2.5, 0, Math.PI * 2); context.fillStyle = '#ffdbac'; context.fill();
        }
        context.restore();
      };
      const rings = [[-.45, 1.16], [.66, .98], [1.54, .79]];
      rings.forEach(([angle, scale]) => ring(angle, scale, false));
      const orb = context.createRadialGradient(-radius * .15, -radius * .15, 0, 0, 0, radius * .39);
      orb.addColorStop(0, '#3c3830'); orb.addColorStop(.5, '#1d1c1a'); orb.addColorStop(.92, '#101113'); orb.addColorStop(1, '#d6b28a');
      context.beginPath(); context.arc(0, 0, radius * .39, 0, Math.PI * 2); context.fillStyle = orb; context.fill();
      context.beginPath(); context.arc(0, 0, radius * .43, -.9, 1.8); context.strokeStyle = '#ffb45e38'; context.lineWidth = .7; context.stroke();
      rings.forEach(([angle, scale]) => ring(angle, scale, true));
      context.strokeStyle = '#d3dde330'; context.lineWidth = .6;
      for (let i = 0; i < 72; i++) {
        const angle = i * Math.PI / 36, r = radius * 1.42, length = i % 6 === 0 ? 7 : 3;
        context.beginPath(); context.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        context.lineTo(Math.cos(angle) * (r + length), Math.sin(angle) * (r + length)); context.stroke();
      }
      context.restore(); element.dataset.rendered = 'true';
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    const start = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw); };
    const resize = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      element.width = Math.round(width * dpr); element.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0); start();
    }); resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else { cancelAnimationFrame(frame); frame = 0; } }); intersection.observe(element);
    const move = (event: PointerEvent) => { if (reduced) return; const rect = element.getBoundingClientRect(); targetX = (event.clientX - rect.left) / rect.width - .5; targetY = (event.clientY - rect.top) / rect.height - .5; };
    const leave = () => { targetX = 0; targetY = 0; };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start(); };
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave); document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', visibility); };
  }, [reduced]);
  return <motion.div className="orbital-render" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1 }}>
    <canvas ref={canvas} aria-hidden="true"/>
    <span className="orbital-index">FIG. 01 <i/> AN IDEA, IN ORBIT</span>
    <span className="orbital-caption">A LITTLE STRUCTURE.<span>ENDLESS POSSIBILITIES / LEMMATA</span></span>
  </motion.div>;
}
