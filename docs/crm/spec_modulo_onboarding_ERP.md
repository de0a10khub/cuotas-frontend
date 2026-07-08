# Especificación: Módulo Onboarding & Seguimiento (ERP Cuotas)

Para implementar sobre cuotas-backend (Django/DRF) + cuotas-frontend (Next.js). Objetivo: que ninguna venta nueva pase más de 24h sin dueño ni contacto, y que todo el Mes 1 (llamadas D1/D7/D25, victoria temprana, cadencia quincenal del tutor) quede registrado y medible. Es la infraestructura del Plan Mes 1 "Primera Victoria".

## 1. Disparador: alta automática de expediente

Cuando entra una suscripción nueva por los webhooks existentes de Stripe/Whop:

1. Se crea automáticamente un **Expediente de Onboarding** vinculado a la suscripción y al cliente unificado (unified_customer_id).
2. Se asigna automáticamente a un **coach de onboarding** por round-robin con límite de carga (máx. configurable de expedientes activos por coach; si todos llenos, cola + alerta a admin).
3. Se generan las **tareas del Mes 1** con fechas: contacto inicial (D0, vence en 24h), llamada de arranque (D1-2), checkpoint victoria (D3), llamada de progreso (D7), inicio salida al mercado (D8), llamada de recap (D25, SIEMPRE antes de la fecha del segundo cargo — calcularla desde el calendario de cuotas de la suscripción), cierre de mes (D30).
4. Notificación inmediata al coach asignado (sistema de notificaciones existente + email).

## 2. Pipeline del expediente (estados)

`NUEVO → CONTACTADO → LLAMADA ARRANQUE HECHA → VICTORIA D7 ✓/✗ → EN MERCADO → RECAP D25 HECHO → MES 1 COMPLETADO`

Estados terminales alternativos: `NO LOCALIZABLE` (tras 3 intentos en 5 días → escala a admin), `EN RIESGO` (ver alertas), `TRASPASADO A TUTOR` (fin de mes 1, arranca cadencia quincenal).

## 3. Registro de interacciones

Tabla `interactions`: expediente, autor (usuario), tipo (llamada / whatsapp / email / sesión), fecha-hora, **enlace a la grabación o llamada** (campo URL), resultado (asistió / no asistió / reprogramada), notas, sentimiento (ok / dudas / riesgo), próxima acción + fecha (obligatoria: ninguna interacción se cierra sin próxima acción o motivo de cierre).

Reglas de UX: registrar una interacción debe costar <30 segundos (formulario de 5 campos, defaults inteligentes). Todo lo que cueste más, no se rellenará.

## 4. Fase tutor (post mes 1)

Al pasar a `TRASPASADO A TUTOR`: asignación de tutor (manual o regla por producto) y generación automática de **llamadas quincenales recurrentes** como tareas con vencimiento. Si una llamada quincenal no se registra en +3 días de su fecha → tarea en rojo + notificación al tutor y a su responsable. El expediente mantiene el histórico completo: onboarding + tutoría en una sola línea de tiempo.

## 5. Alertas automáticas (motor de reglas)

| Señal | Acción | Plazo |
|---|---|---|
| Expediente NUEVO sin contacto | Rojo + notificación a coach y admin | 24h desde alta |
| No asistió a llamada D1/D7/D25 | Tarea de reintento auto-creada | mismo día |
| Sin victoria D7 registrada | Tarea "sesión de rescate" | 48h |
| Interacción marcada sentimiento "riesgo" o menciona dinero | Escalado a responsable de retención | mismo día |
| Fallo de cargo (webhook existente) en cuota 1-2 | Expediente a EN RIESGO + tarea de llamada de progreso (no de cobro) | mismo día |
| Sin login del alumno 5 días (si la plataforma de cursos expone API/webhook; si no, fase 2) | Tarea de mensaje personal | 24h |

## 6. Vistas (frontend)

1. **Mi cola (coach/tutor):** tareas de hoy y vencidas, ordenadas por urgencia. Un clic → expediente → registrar interacción.
2. **Kanban de pipeline:** expedientes por estado, filtrable por coach y cohorte. Arrastrar NO cambia estado (los estados los mueven las acciones registradas, no el drag — evita maquillaje).
3. **Panel de dirección:** por cohorte semanal — % contactados <24h, % llamada arranque hecha, % victoria D7, % recap D25 antes del 2º cargo, y cruce con rotura en cuota 2 (dato ya existente en el ERP). Es el dashboard de la reunión semanal de 30 min.

## 7. Modelo de datos (resumen)

- `onboarding_cases`: id, subscription_id, unified_customer_id, coach_id, tutor_id, estado, fecha_alta, fecha_segundo_cargo, victoria_d7 (bool + texto), fase (onboarding/tutoria), flags de riesgo.
- `interactions`: case_id, user_id, tipo, fecha, url_llamada, resultado, notas, sentimiento, next_action, next_action_date.
- `case_tasks`: case_id, tipo (D0/D1/D7/D25/quincenal/rescate), vence, estado, completada_por, completada_en.
- `assignment_rules`: coach_id, carga_max, activo.

Permisos con los roles existentes: Operario N1 = coach (ve su cola), N2 = tutor/senior, Admin = todo + panel.

## 8. Fases de implementación

- **Fase 1 (semana 1-2):** expedientes automáticos desde webhook + asignación + tareas D0-D30 + registro de interacciones + Mi cola + alerta de 24h. Con esto ya funciona el Plan Mes 1.
- **Fase 2 (semana 3-4):** fase tutor quincenal, kanban, panel de dirección, motor de alertas completo.
- **Fase 3:** importar cartera antigua — cargar la lista del Plan de Reactivación (1.090 clientes segmentados A/B/C) como expedientes en un pipeline paralelo "Reactivación" con sus propias tareas.

## 9. Criterio de éxito del módulo

No es "que exista": es que el panel de dirección muestre >90% de contactados en <24h y >85% de recaps D25 hechos antes del segundo cargo, y que la rotura en cuota 2 por cohorte empiece a bajar del 49%. El módulo existe para mover ese número.
