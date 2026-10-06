/**
 * KineSys — Borrador de evaluación antropométrica (autoguardado en base de datos).
 *
 * Un "saver" acompaña a un paciente mientras el nutricionista edita: el primer
 * guardado crea la fila `status = 'draft'`, los siguientes fusionan solo los
 * campos modificados y, al finalizar, la misma fila pasa a `completed`. Así el
 * borrador sobrevive a recargas y nunca queda duplicado.
 *
 * La capa de datos se inyecta (`AnthropometryDraftApi`) para mantener este
 * servicio libre de dependencias de Supabase.
 */
import type { AnthropometryDraftForm } from '../../types/coreBodyNutrition';

export interface AnthropometryDraftRow {
  id: string;
  data: Partial<AnthropometryDraftForm>;
}

export interface AnthropometryDraftApi {
  getDraft(tenantId: string, patientId: string, nutritionistId: string): Promise<AnthropometryDraftRow | null>;
  createDraft(
    tenantId: string,
    patientId: string,
    nutritionistId: string,
    form: AnthropometryDraftForm
  ): Promise<AnthropometryDraftRow>;
  patchDraft(id: string, changes: Partial<AnthropometryDraftForm>): Promise<void>;
  completeDraft(id: string, payload: Record<string, unknown>): Promise<void>;
  isUniqueViolation(error: unknown): boolean;
}

export interface AnthropometryDraftSaverParams {
  tenantId: string;
  patientId: string;
  nutritionistId: string;
  /** Borrador existente cargado al abrir al paciente (si lo hay). */
  initialDraft?: AnthropometryDraftRow | null;
}

export interface AnthropometryDraftSaver {
  readonly patientId: string;
  /** Datos del borrador para hidratar el formulario (incluye cambios aún en vuelo). */
  getData(): Partial<AnthropometryDraftForm> | null;
  /** Función de autoguardado: crea en el primer cambio, luego fusiona solo lo modificado. */
  save(changes: Partial<AnthropometryDraftForm>, snapshot: AnthropometryDraftForm): Promise<void>;
  /**
   * Convierte el borrador en evaluación definitiva. Devuelve false si no hay
   * borrador persistido (el llamador debe insertar la evaluación por su cuenta).
   */
  complete(payload: Record<string, unknown>): Promise<boolean>;
}

export function createAnthropometryDraftSaver(
  params: AnthropometryDraftSaverParams,
  api: AnthropometryDraftApi
): AnthropometryDraftSaver {
  const { tenantId, patientId, nutritionistId } = params;
  let draftId: string | undefined = params.initialDraft?.id;
  let data: Partial<AnthropometryDraftForm> | null = params.initialDraft?.data ?? null;

  // Los cambios se reflejan en `data` antes de esperar a la red, para que un
  // formulario que se remonte durante el guardado no vea datos anteriores.
  const remember = (changes: Partial<AnthropometryDraftForm>) => {
    data = { ...(data ?? {}), ...changes };
  };

  return {
    patientId,

    getData: () => data,

    async save(changes, snapshot) {
      remember(changes);

      if (draftId) {
        await api.patchDraft(draftId, changes);
        return;
      }

      try {
        const created = await api.createDraft(tenantId, patientId, nutritionistId, snapshot);
        draftId = created.id;
      } catch (error) {
        if (!api.isUniqueViolation(error)) throw error;
        // Otra pestaña/sesión ya creó el borrador: se adopta y se actualiza con el estado completo.
        const existing = await api.getDraft(tenantId, patientId, nutritionistId);
        if (!existing) throw error;
        draftId = existing.id;
        await api.patchDraft(draftId, snapshot);
      }
    },

    async complete(payload) {
      if (!draftId) return false;
      await api.completeDraft(draftId, payload);
      draftId = undefined;
      data = null;
      return true;
    },
  };
}
