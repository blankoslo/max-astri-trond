'use client';

import { useEffect, useRef } from 'react';

export default function Home() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!overlayRef.current) return;

      // Use requestAnimationFrame to throttle updates for better performance
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.style.background = `radial-gradient(800px circle at ${e.clientX}px ${e.clientY}px, var(--color-brand-200), var(--color-brand-300), transparent 70%)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(45deg, var(--color-brand-400), var(--color-brand-500), var(--color-brand-600))`,
      }}
    >
      {/* Animated gradient overlay that follows mouse */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 transition-all duration-700 ease-out opacity-30"
      />
      
      {/* Main heading */}
      <h1 
        className="text-6xl md:text-8xl lg:text-9xl xl:text-10xl font-bold text-center px-6 transition-all duration-500 ease-out cursor-default relative z-10"
        style={{
          color: 'var(--color-text-white)',
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 'var(--font-weight-bold)',
          textShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          lineHeight: '0.9',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.textShadow = '0 12px 48px rgba(0, 0, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.textShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        }}
      >
        friluftskompis
      </h1>
    </div>
  );
}
