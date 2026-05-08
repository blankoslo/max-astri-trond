'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(45deg, #4f59fb, #2f3597, #202464)`,
      }}
    >
      {/* Animated gradient overlay that follows mouse */}
      <div 
        className="absolute inset-0 transition-all duration-700 ease-out opacity-30"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, #bfc3ff, #959bff, transparent 70%)`,
        }}
      />
      
      {/* Main heading */}
      <h1 
        className="text-6xl md:text-8xl lg:text-9xl xl:text-10xl font-bold text-center px-6 transition-all duration-500 ease-out cursor-default relative z-10"
        style={{
          color: '#ffffff',
          fontFamily: 'var(--font-family-secondary)',
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
