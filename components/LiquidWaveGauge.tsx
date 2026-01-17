'use client';

import { useEffect, useRef } from 'react';

interface LiquidWaveGaugeProps {
  percentage: number;
  attended: number;
  total: number;
}

export default function LiquidWaveGauge({ percentage, attended, total }: LiquidWaveGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 60;
    let animationFrame = 0;
    let animationId: number | null = null;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw circle background
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw wave
      const waveHeight = (percentage / 100) * radius * 2;
      const waveY = centerY + radius - waveHeight;
      const waveAmplitude = 4;
      const waveFrequency = 0.02;
      const wavePhase = (animationFrame * 0.05) % (Math.PI * 2);

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(centerX - radius, waveY);

      for (let x = centerX - radius; x <= centerX + radius; x += 2) {
        const relX = (x - centerX) * waveFrequency;
        const y = waveY + Math.sin(relX + wavePhase) * waveAmplitude;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.lineTo(centerX - radius, centerY + radius);
      ctx.closePath();
      ctx.fill();

      // Draw text
      ctx.restore();
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(percentage)}%`, centerX, centerY);

      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${attended}/${total} classes`, centerX, centerY + 30);

      animationFrame++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [percentage, attended, total]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={180}
      className="mx-auto"
    />
  );
}
