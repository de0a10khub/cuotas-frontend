'use client';

import { useEffect, useState } from 'react';

const PHRASES = [
  // Currito español random
  'Otro café y a por ello',
  'Enga, pa\' arriba que es viernes (mentira)',
  'Cojonudo, otro lunes',
  'Hoy no me como ni una rosca',
  'Dios qué pereza todo',
  'Vamos a darle un meneo',
  'Hala, a trabajar',
  'A ver si tiramos del carro hoy',
  'Llevo 3 cafés, cuidado conmigo',
  '¿Otra reunión? No gracias',
  // Memes / internet
  'Stonks 📈',
  'Modo gigachad ON',
  'Loading... loading... loading...',
  'Plot twist: hay que currar',
  'POV: tú cobrando',
  'Aura farming en marcha',
  'Skill issue, del impago',
  'El boss final: el cliente que no responde',
  'Aura al cobrar +100',
  // Pelis
  'Houston, tenemos un cliente',
  'Hasta la vista, deudor',
  'Que la fuerza del cobro te acompañe',
  // Madre / jefe pesado
  'Niño, espabila',
  'Tu jefe te está mirando 👀',
  'Hijo, deja el móvil y cobra',
  '¿Otra vez en TikTok?',
  'Cuando yo tenía tu edad cobraba con DOS teléfonos',
  'Aquí no se viene a calentar la silla',
  'Espabila o te quito el café',
  // Auto-bullying motivacional
  'Mientras lees esto, alguien debe pasta',
  'Fingiendo productividad desde 2026',
  'Tú no eres persona, eres un cobrador',
  'El dinero no se cobra solo, ojalá',
  'Mi LinkedIn dice "professional". Mentira.',
  'Otro lunes, otra crisis existencial',
  'Si no cobro, lloro',
  'El cliente es mi karma',
  // España-España
  'Hagan juego, señores',
  'Vamos a por todas, equipo 💪',
  'Aplausos para el del fondo',
  'Mr. Worldwide del cobro',
  // Random absurdo
  'Te cobraría con la mirada si pudiera',
  'Mi novia cree que cobro mucho. Mi banco no.',
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
