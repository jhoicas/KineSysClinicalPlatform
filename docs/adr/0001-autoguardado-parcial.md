# ADR 0001 — Autoguardado y guardado parcial en perfiles de Fisioterapia y Nutrición

- **Estado:** Aceptado
- **Fecha:** 2026-10-06

## Contexto

Los formularios clínicos (historia clínica, evaluación kinésica, antropometría ISAK) guardaban solo al
pulsar un botón y enviaban el registro completo. Un cierre de pestaña, una caída de red o un cambio de
paciente perdían información clínica, y dos guardados simultáneos podían pisarse entre sí.

Además, el módulo de Nutrición no mostraba la estatura que se captura al registrar al paciente: el
buscador de pacientes no la seleccionaba, el dashboard no la mapeaba, y el módulo ISAK caía a un valor
inventado de 160 cm.

El frontend ya persiste las tablas del esquema `kinesys` directamente con PostgREST bajo RLS; el
backend Go atiende únicamente `public.patients`.

## Decisión

1. **Autoguardado en el frontend** con un motor sin React (`AutosaveEngine`) y un hook fino
   (`useAutosave`):
   - debounce de 500 ms y guardado inmediato en `onBlur`, al ocultar la pestaña y al cambiar de contexto;
   - solo se envían los campos modificados (diff por clave de primer nivel);
   - guardados serializados por contexto: el primer guardado crea el registro y los siguientes lo
     actualizan, sin duplicados;
   - reintentos con backoff (2 s, 5 s, 10 s) y estado visible (`AutosaveIndicator`).
2. **Guardado parcial en Supabase (PostgREST + RLS)** para las tablas `kinesys.*`:
   `upsert ... ON CONFLICT (tenant_id, patient_id)` para la historia clínica y `PATCH` por id para la
   evaluación kinésica. No se crean endpoints Go que nadie consumiría.
3. **`PATCH /api/v1/patients/{id}` en Go**, exclusivamente para `public.patients`: `domain.PatientPatch`
   valida una lista blanca de campos, tipos y rangos (estatura 0–300 cm); el repositorio arma un
   `UPDATE` parametrizado solo con las columnas enviadas, filtrado por `tenant_id`. CORS permite `PATCH`.
4. **Borrador de antropometría en base de datos** (migración `021`): `evaluaciones_antropometricas`
   gana `status` (`draft` | `completed`) y `updated_at`. Un índice único parcial garantiza un solo
   borrador por paciente y nutricionista. El JSONB `data` se fusiona con la RPC
   `kinesys.patch_antropometria_draft` (`SECURITY INVOKER`, por lo que RLS sigue aplicando). Al
   finalizar, la misma fila pasa a `completed`.
5. **Estatura base del paciente:** `pacientes_clinicos.height_cm` es la fuente de verdad en Nutrición.
   `PatientSearchCombobox` la trae, el dashboard la refresca desde la base al abrir al paciente, las
   evaluaciones previas solo se usan si el paciente no tiene estatura, y editarla en el módulo ISAK la
   guarda en la ficha. Se elimina el fallback de 160 cm.

## Consecuencias

- **Orden de despliegue:** aplicar `021_autosave_partial_updates.sql` **antes** del frontend; el
  dashboard filtra por `status = 'completed'` y el borrador usa esa columna.
- Un borrador es por nutricionista: dos nutricionistas del mismo paciente no comparten borrador.
- El "botón Guardar" desaparece; en Nutrición queda "Finalizar Evaluación", que convierte el borrador
  en evaluación definitiva.
- Las restricciones nuevas de estatura (`<= 300`) se crean `NOT VALID`: no bloquean datos existentes.
  Validarlas con `ALTER TABLE ... VALIDATE CONSTRAINT` tras revisar los datos.

## Alternativas descartadas

- *Endpoints Go para las tablas `kinesys.*`:* duplican la lógica que ya resuelven PostgREST y RLS.
- *Mantener el borrador solo en Zustand:* se pierde al recargar y no se comparte entre dispositivos.
- *Un solo `PATCH` con JSON Merge Patch genérico en Go:* permitiría modificar columnas no previstas; se
  prefirió una lista blanca explícita.
