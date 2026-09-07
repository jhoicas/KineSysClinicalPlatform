/**
 * Módulo Hardware Adapters — Fase 3 (PLAN_NUTRICION)
 *
 * Uso en controlador:
 *   const adapter = createHardwareAdapter('WITHINGS');
 *   const dto = await adapter.fetchEvaluation(patientId, { accessToken }, { dryRun: true });
 *   // persistir dto en kinesys.nutrition_evaluations (+ tenant_id)
 */

export * from './HardwareAdapter.interface';
export * from './WithingsAdapter';
export * from './InBodyAdapter';

import { INutritionHardwareAdapter, HardwareEvaluationSource } from './HardwareAdapter.interface';
import { WithingsAdapter, WithingsAdapterConfig } from './WithingsAdapter';
import { InBodyAdapter, InBodyAdapterConfig } from './InBodyAdapter';

export type HardwareAdapterFactoryOptions = {
  withings?: WithingsAdapterConfig;
  inbody?: InBodyAdapterConfig;
};

export function createHardwareAdapter(
  source: HardwareEvaluationSource,
  options: HardwareAdapterFactoryOptions = {}
): INutritionHardwareAdapter {
  switch (source) {
    case 'WITHINGS':
      return new WithingsAdapter(options.withings);
    case 'INBODY':
      return new InBodyAdapter(options.inbody);
    default: {
      const _exhaustive: never = source;
      throw new Error(`Adapter no soportado: ${String(_exhaustive)}`);
    }
  }
}
