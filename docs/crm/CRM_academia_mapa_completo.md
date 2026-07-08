# CRM de la Academia — Mapa funcional completo

Complementa la spec técnica del módulo de onboarding (spec_modulo_onboarding_ERP.md). Esto es TODO lo que debe vivir en el CRM para gestionar el ciclo completo del alumno. Construido sobre el ERP actual (cuotas-backend), por fases. Principio rector: el CRM existe para una sola cosa — que el alumno consiga resultados y por tanto siga pagando. Todo módulo que no sirva a eso, fuera.

---

## 1. Ficha única del alumno (expediente 360°)

Una sola pantalla donde cualquiera del equipo ve TODO del alumno en 10 segundos:

- Datos: nombre, email, teléfono/WhatsApp, DNI, plan contratado, contrato PDF (ya existe en ERP)
- **Su objetivo**: qué negocio quiere montar (capturado en D0) y la victoria de 30 días pactada por escrito
- Estado de pagos en vivo: cuotas pagadas/pendientes, fecha del próximo cargo, semáforo de riesgo (ya existe)
- Equipo asignado: coach de onboarding, tutor, vendedor que lo cerró (campo nuevo — imprescindible para cruzar morosidad por vendedor)
- Línea de tiempo completa: todas las interacciones, llamadas (con enlace a grabación), mensajes, tareas, cambios de estado — de la venta a hoy
- Health score (ver punto 5)

## 2. Pipeline de ciclo de vida (el eje del CRM)

`VENTA → ONBOARDING (D0-D30) → TUTORÍA ACTIVA → COMPLETADO/RENOVACIÓN → ALUMNI`
Ramas: `EN RIESGO` (señales), `PAUSADO` (pausa formal), `REACTIVACIÓN` (caídos), `BAJA` (con motivo obligatorio)

Regla: los estados los mueven las acciones registradas, nunca el drag & drop. Prohibido el maquillaje.

## 3. Módulo Onboarding D0-D30 (ya especificado — es la Fase 1)

- Alta automática desde webhook de venta → coach asignado en el minuto 0 (round-robin con tope de carga)
- Tareas automáticas: contacto <24h, llamada arranque D1-2, checkpoint victoria D3, llamada D7, salida al mercado D8-14, llamada recap D25 SIEMPRE antes del 2º cargo, cierre D30
- Registro de victoria D7/D21: qué construyó el alumno (texto + enlace/captura)
- Alerta roja si alta sin contactar en 24h

## 4. Módulo Tutoría (mes 2 en adelante)

- Traspaso formal coach → tutor con resumen (objetivo, victoria lograda, riesgos)
- Llamadas quincenales auto-programadas como tareas con vencimiento; en rojo si +3 días sin registrar
- Roadmap del alumno por meses: hito pactado para cada mes (el "porqué" de la siguiente cuota)
- Registro de resultados: primer cliente, primeros ingresos, € generados por el alumno — la métrica reina del producto

## 5. Health score y motor de alertas (el corazón anti-morosidad)

Semáforo automático por alumno (verde/ámbar/rojo) calculado con:

- Días sin login en la plataforma de cursos (requiere integración — ver punto 10)
- Asistencia a llamadas (faltó a la última / a dos seguidas)
- Tareas del programa sin entregar
- Fallo de cargo o tarjeta caducada (ya existe la señal en ERP)
- Sentimiento de la última interacción (ok / dudas / riesgo — lo marca el coach en 1 clic)
- Palabras clave en mensajes: dinero, tiempo, duda, cancelar → escalado automático

Cada rojo genera tarea con dueño y plazo (mismo día / 24h / 48h). Ninguna señal sin respuesta >24h laborables. El protocolo "no puedo pagar" (pausa → reestructura → nunca presión de cobro como primera respuesta) vive aquí como botones de acción que dejan registro.

## 6. Módulo Pagos (ya existe — se integra, no se duplica)

- El ERP ya tiene cuotas, mora, disputas, Recobrame. El CRM lo muestra dentro de la ficha del alumno
- Nuevo: alerta pre-2º cargo (si no hay llamada D25 registrada, bloqueo suave: avisa al coach y a admin)
- Nuevo: registro de pausas y reestructuras como objetos formales (quién, cuándo, condiciones, vencimiento de la pausa)

## 7. Módulo Reactivación (la cartera de 1.090)

- Pipeline paralelo con los segmentos A (caliente 15-30d) / B (riesgo 31-44d) / C (roto reciente 45-90d)
- Import inicial desde el Excel Plan_Reactivacion ya generado; después se alimenta solo (alumnos que cruzan 15 días sin pago entran automáticamente)
- Guiones por segmento visibles en la propia tarea (llamada de progreso / oferta de pausa / reincorporación por el Mes 1 nuevo)
- Resultado obligatorio: reactivado (cuota cobrada) / pausa / baja definitiva con motivo

## 8. Motivos de baja y voz del alumno

- Taxonomía de objeciones (ya existe en ERP: economía, falta de tiempo, no ve valor, desatendido...) — obligatoria en toda baja
- Registro de audios/testimonios de salida vinculados a la ficha (los que estás recopilando)
- Informe mensual automático: top motivos de baja por cohorte → alimenta las decisiones de producto

## 9. Victorias, testimonios y casos de éxito

- Muro de victorias: cada victoria D7/D21/mensual registrada puede marcarse como "publicable"
- Banco de testimonios y casos con € generados → alimenta marketing y ventas con prueba real
- Cierra el círculo: el mismo CRM que evita la morosidad fabrica la prueba social que abarata la captación

## 10. Integraciones

| Sistema | Estado | Para qué |
|---|---|---|
| Whop (webhook) | ✅ funciona | Altas y cuotas en tiempo real |
| Stripe (webhook) | ✅ funciona | Cuotas cartera antigua |
| Hotmart | ⚠️ verificar (0 altas en julio) | Altas y cuotas Hotmart |
| Plataforma de cursos | ❌ nueva | Logins y progreso → health score |
| WhatsApp Business API | ❌ nueva | Mensajes D0/recordatorios + registro automático en ficha |
| Calendario (Calendly/Google) | ❌ nueva | Agendado de llamadas D1/D7/D25 sin fricción |
| Zoom/Meet | manual | Campo de enlace a grabación en cada interacción (ya en spec) |

## 11. Paneles

1. **Mi cola** (coach/tutor): tareas hoy + vencidas, un clic para registrar
2. **Panel del Head**: cohortes semanales — % contactados <24h, asistencia D7/D25, % victoria D7, rotura cuota 2, cobro cuotas 2+, reactivaciones. Sus KPIs de bonus salen de aquí, sin discusión
3. **Panel de dirección (tú)**: la curva de cohortes + los 3 KPIs del Head + € generados por alumnos. La reunión semanal de 30 min se hace sobre esta pantalla

## 12. Roles y permisos

- Coach (Operario N1): su cola y sus fichas
- Tutor/Senior (N2): sus alumnos + traspaso
- Head de Éxito: todo el módulo + paneles + configuración de reglas
- Ventas: solo lectura de ficha básica + registro del campo "vendedor"
- Admin/Fundador: todo
- Recobrame: solo pipeline de recobro (como hasta ahora)

## 13. Reglas de oro (imprimir y colgar)

1. Registrar una interacción cuesta <30 segundos o la gente no lo hará
2. Una sola fuente de verdad: si no está en el CRM, no existe. Informes que no salen de aquí, a la basura
3. Los estados los mueven acciones, no opiniones
4. Ninguna señal roja duerme más de 24h laborables
5. La primera respuesta a "no puedo pagar" NUNCA es reclamar el pago
6. Cero contenido nuevo hasta que la curva lo pida — el CRM mide progreso, no consumo

## 14. Orden de construcción

- **Fase 1 (semanas 1-2):** módulo onboarding completo (spec ya entregada) + campo vendedor + ficha 360 básica
- **Fase 2 (semanas 3-4):** tutoría quincenal + health score v1 (con las señales que ya tiene el ERP: pagos, asistencia, sentimiento) + panel del Head
- **Fase 3 (semanas 5-6):** pipeline de reactivación con la lista 1.090 + motivos de baja obligatorios + pausas/reestructuras formales
- **Fase 4 (semanas 7-8):** integraciones plataforma de cursos y WhatsApp + muro de victorias + health score v2
- **Continuo:** arreglar webhook Hotmart (esta semana, no espera a ninguna fase)
