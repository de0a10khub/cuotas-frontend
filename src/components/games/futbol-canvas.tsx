'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Mecánica:
// - Pelota fija abajo centro.
// - Mouse/touch down → drag → up = vector flick (dx, dy negativo).
// - Trayectoria recta desde pelota hacia portería en función del vector.
// - Portero IA: cuando se chuta, decide hacia dónde tirarse (3 zonas:
//   izq/centro/der). Si la pelota cruza la línea de gol pasando por su
//   zona, parada. Si no, GOL.

const W = 480;
const H = 320;
const BALL_RADIUS = 12;
const BALL_X = W / 2;
const BALL_Y = H - 40;
const GOAL_TOP = 30;
const GOAL_BOTTOM = 110;
const GOAL_LEFT = 80;
const GOAL_RIGHT = W - 80;

type ShotResult = {
  is_goal: boolean;
  speed: number;
  angle: number;
  zone: 'left' | 'center' | 'right' | 'out';
  saved_zone: 'left' | 'center' | 'right';
};

interface Props {
  disabled: boolean;
  onShot: (result: ShotResult) => void;
}

export function FutbolCanvas({ disabled, onShot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<{ start: { x: number; y: number } | null; current: { x: number; y: number } | null }>({
    start: null,
    current: null,
  });
  const [animating, setAnimating] = useState(false);

  // Animación de chute (state)
  const animRef = useRef<{
    progress: number;
    targetX: number;
    targetY: number;
    saved_zone: 'left' | 'center' | 'right';
    is_goal: boolean;
    keeperX: number;
    keeperPhase: 'idle' | 'diving';
  } | null>(null);

  // Loop de render
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo: campo verde con gradiente y líneas
    ctx.fillStyle = '#1f6f3a';
    ctx.fillRect(0, 0, W, H);

    // Líneas perspectiva del área
    ctx.strokeStyle = '#ffffff60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, GOAL_BOTTOM + 30);
    ctx.lineTo(W - 20, GOAL_BOTTOM + 30);
    ctx.lineTo(W - 60, H - 80);
    ctx.lineTo(60, H - 80);
    ctx.closePath();
    ctx.stroke();
    // Punto de penalti
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath();
    ctx.arc(W / 2, H - 80, 3, 0, Math.PI * 2);
    ctx.fill();

    // Portería: postes + travesaño
    ctx.fillStyle = '#fff';
    ctx.fillRect(GOAL_LEFT - 4, GOAL_TOP, 4, GOAL_BOTTOM - GOAL_TOP);
    ctx.fillRect(GOAL_RIGHT, GOAL_TOP, 4, GOAL_BOTTOM - GOAL_TOP);
    ctx.fillRect(GOAL_LEFT - 4, GOAL_TOP - 4, GOAL_RIGHT - GOAL_LEFT + 8, 4);
    // Red (rejilla)
    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 1;
    for (let x = GOAL_LEFT; x <= GOAL_RIGHT; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, GOAL_TOP);
      ctx.lineTo(x, GOAL_BOTTOM);
      ctx.stroke();
    }
    for (let y = GOAL_TOP; y <= GOAL_BOTTOM; y += 10) {
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT, y);
      ctx.lineTo(GOAL_RIGHT, y);
      ctx.stroke();
    }

    // Portero (cuadrado con cabeza)
    let keeperX = W / 2 - 12;
    if (animRef.current?.keeperPhase === 'diving') {
      // Animación: portero salta a su zona
      const targetKX =
        animRef.current.saved_zone === 'left'
          ? GOAL_LEFT + 10
          : animRef.current.saved_zone === 'right'
          ? GOAL_RIGHT - 34
          : W / 2 - 12;
      keeperX = W / 2 - 12 + (targetKX - (W / 2 - 12)) * Math.min(1, animRef.current.progress * 2);
    } else {
      // Movimiento idle: vaivén
      keeperX = W / 2 - 12 + Math.sin(Date.now() / 400) * 12;
    }
    if (animRef.current) animRef.current.keeperX = keeperX;
    // Body
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(keeperX, GOAL_BOTTOM - 38, 24, 32);
    // Head
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(keeperX + 12, GOAL_BOTTOM - 44, 6, 0, Math.PI * 2);
    ctx.fill();
    // Guantes
    ctx.fillStyle = '#fff';
    ctx.fillRect(keeperX - 5, GOAL_BOTTOM - 30, 5, 6);
    ctx.fillRect(keeperX + 24, GOAL_BOTTOM - 30, 5, 6);

    // Pelota
    let ballX = BALL_X;
    let ballY = BALL_Y;
    if (animRef.current) {
      const t = animRef.current.progress;
      ballX = BALL_X + (animRef.current.targetX - BALL_X) * t;
      ballY = BALL_Y + (animRef.current.targetY - BALL_Y) * t;
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0008';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Detalles pentágonos
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Línea de aim (durante drag)
    if (drag.start && drag.current && !animating) {
      const dx = drag.current.x - drag.start.x;
      const dy = drag.current.y - drag.start.y;
      const len = Math.hypot(dx, dy);
      if (len > 5) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(BALL_X, BALL_Y);
        // Vector inverso (flick hacia abajo derecha = chute hacia arriba izquierda)
        ctx.lineTo(BALL_X - dx, BALL_Y - dy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Cartel de resultado (durante animación)
    if (animRef.current && animRef.current.progress > 0.95) {
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      if (animRef.current.is_goal) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText('¡GOL!', W / 2, H / 2);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('¡PARADA!', W / 2, H / 2);
      }
    }
  }, [drag, animating]);

  // Loop animation
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (animRef.current) {
        animRef.current.progress = Math.min(1, animRef.current.progress + 0.045);
        if (animRef.current.progress >= 1.05) {
          // fin
          const result: ShotResult = {
            is_goal: animRef.current.is_goal,
            speed: 0,
            angle: 0,
            zone: 'center',
            saved_zone: animRef.current.saved_zone,
          };
          animRef.current = null;
          setAnimating(false);
          setDrag({ start: null, current: null });
          onShot(result);
        }
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, onShot]);

  // Eventos drag
  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      if (!t) return null;
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || animating) return;
    const c = getCoords(e);
    if (!c) return;
    const dx = c.x - BALL_X;
    const dy = c.y - BALL_Y;
    if (Math.hypot(dx, dy) < BALL_RADIUS * 2.5) {
      setDrag({ start: c, current: c });
    }
  };
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drag.start || animating) return;
    const c = getCoords(e);
    if (!c) return;
    setDrag((p) => ({ ...p, current: c }));
  };
  const onUp = () => {
    if (!drag.start || !drag.current || animating) {
      setDrag({ start: null, current: null });
      return;
    }
    const dx = drag.start.x - drag.current.x; // invertido — flick down = shoot up
    const dy = drag.start.y - drag.current.y;
    const speed = Math.hypot(dx, dy);
    if (speed < 30) {
      // flick demasiado corto → cancelar
      setDrag({ start: null, current: null });
      return;
    }
    // Calcular punto destino: extrapolación del vector hasta cruce con línea de gol (Y = GOAL_BOTTOM)
    const t = (BALL_Y - GOAL_BOTTOM) / dy; // cuánto multiplicar (dx,dy) para llegar a y=GOAL_BOTTOM
    let targetX = BALL_X + dx * t;
    let targetY = GOAL_BOTTOM;
    if (dy <= 0 || t <= 0 || t > 5) {
      // Vector mal — chutar fuera arriba
      targetX = BALL_X + dx;
      targetY = BALL_Y - dy;
    }

    // Zona de la pelota al cruzar
    let zone: ShotResult['zone'] = 'out';
    if (targetX < GOAL_LEFT || targetX > GOAL_RIGHT) zone = 'out';
    else if (targetX < GOAL_LEFT + (GOAL_RIGHT - GOAL_LEFT) / 3) zone = 'left';
    else if (targetX < GOAL_LEFT + (2 * (GOAL_RIGHT - GOAL_LEFT)) / 3) zone = 'center';
    else zone = 'right';

    // Portero decide aleatorio (con peso ligero al centro)
    const r = Math.random();
    const saved_zone: 'left' | 'center' | 'right' = r < 0.33 ? 'left' : r < 0.66 ? 'center' : 'right';

    // Resultado: gol si zona ≠ saved_zone y zona ≠ out
    let is_goal = zone !== 'out' && zone !== saved_zone;
    // Si chute muy potente (>200), 30% extra de probabilidad de gol
    if (is_goal === false && speed > 220 && zone !== 'out') {
      is_goal = Math.random() < 0.25;
    }

    animRef.current = {
      progress: 0,
      targetX,
      targetY,
      saved_zone,
      is_goal,
      keeperX: W / 2 - 12,
      keeperPhase: 'diving',
    };
    setAnimating(true);
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={onDown}
      onTouchMove={onMove}
      onTouchEnd={onUp}
      className="rounded-xl border border-emerald-700/40 cursor-pointer touch-none w-full max-w-[600px] aspect-[3/2]"
      style={{ touchAction: 'none' }}
    />
  );
}
