'use client';

import { useEffect, useState } from 'react';

const PHRASES = [
  '¡Vamos campeón!',
  'Hoy es tu día 💪',
  'Otro café y al lío',
  'Pequeños pasos, grandes resultados',
  'Sigue así, no pares',
  'Brilla, que es lo tuyo',
  'Cada cobro cuenta',
  'Dale como si no hubiera mañana',
  'El mejor del equipo',
  'Pa\' lante siempre',
  'Tu actitud lo es todo',
  'Hoy más que ayer, menos que mañana',
  'Un día menos para el éxito',
  'Estás haciendo magia',
  'Eres imparable',
  'No te rindas, ya casi',
  'Un cliente más, un paso más',
  'Tranqui, lo tienes',
  'Confía en el proceso',
  'Eres el motor del equipo',
];

const pick = () => PHRASES[Math.floor(Math.random() * PHRASES.length)];

interface Props {
  /** Intervalo entre apariciones en ms. 60000 = test (1min). 300000 = prod (5min). */
  intervalMs?: number;
  /** Cuanto tiempo se queda visible. */
  visibleMs?: number;
}

export function MotivationalBubble({ intervalMs = 60_000, visibleMs = 3_000 }: Props) {
  const [visible, setVisible] = useState(false);
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      setPhrase(pick());
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), visibleMs);
    };

    const cycle = setInterval(trigger, intervalMs);

    // Tambien dispara el primer al minuto, no inmediatamente — pero para test
    // cuando intervalMs=60000 ya esta bien.
    return () => {
      clearInterval(cycle);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [intervalMs, visibleMs]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-4 right-4 z-[60] transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      <div className="relative flex items-end gap-2">
        {/* Bocadillo (speech bubble) */}
        <div className="relative mb-12 max-w-[180px]">
          <div className="rounded-2xl border-2 border-cyan-400/40 bg-gradient-to-br from-[#0d1f3a] via-[#0a1628] to-[#0d1f3a] px-4 py-2.5 text-sm font-medium text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.35)]">
            {phrase}
          </div>
          {/* Cola del bocadillo apuntando al personaje */}
          <div className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b-2 border-r-2 border-cyan-400/40 bg-gradient-to-br from-[#0a1628] to-[#0d1f3a]" />
          {/* 3 puntos clasicos del comic */}
          <div className="absolute -bottom-6 right-2 h-2 w-2 rounded-full border border-cyan-400/40 bg-[#0d1f3a]" />
          <div className="absolute -bottom-9 right-0 h-1.5 w-1.5 rounded-full border border-cyan-400/40 bg-[#0d1f3a]" />
        </div>

        {/* Personaje */}
        <div className="relative h-32 w-32 overflow-hidden">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/character.png"
            alt=""
            className="relative h-full w-full object-contain object-bottom drop-shadow-[0_0_15px_rgba(34,211,238,0.25)]"
          />
        </div>
      </div>
    </div>
  );
}
