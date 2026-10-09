import { useCallback, useEffect, useRef, useState } from 'react';
import type { PacienteClinico, Tenant } from '../types';
import { downloadNutritionReportPdf } from '../utils/nutritionReportPdf';
import {
  buildNutritionReportPdfOptions,
  hasNutritionReportData,
  type NutritionReportData,
} from '../utils/nutritionReportExport';

export interface NutritionReportExportInput extends NutritionReportData {
  patient: PacienteClinico | null;
  nutritionistName: string;
  tenant: Tenant | null | undefined;
}

export interface NutritionReportStatus {
  type: 'success' | 'error';
  text: string;
}

const STATUS_VISIBLE_MS = 5000;

/**
 * Descarga del informe nutricional integral (ISAK + Withings + plan).
 *
 * Lee los datos desde una referencia al render más reciente: quien llama puede guardar y descargar en
 * el mismo gesto y, si el estado de React aún no se re-renderizó, pasar los bloques recién guardados en
 * `overrides` para que el PDF nunca salga con datos anteriores.
 */
export function useNutritionReportExport(input: NutritionReportExportInput) {
  const inputRef = useRef(input);
  inputRef.current = input;

  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState<NutritionReportStatus | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

  const showStatus = useCallback((next: NutritionReportStatus | null) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus(next);
    if (next) statusTimer.current = setTimeout(() => setStatus(null), STATUS_VISIBLE_MS);
  }, []);

  const download = useCallback(
    async (overrides: NutritionReportData = {}): Promise<boolean> => {
      const current = inputRef.current;
      if (!current.patient) return false;

      const data: NutritionReportData = {
        isak: overrides.isak ?? current.isak,
        withings: overrides.withings ?? current.withings,
        plan: overrides.plan ?? current.plan,
      };
      if (!hasNutritionReportData(data)) {
        showStatus({ type: 'error', text: 'Aún no hay datos (ISAK, BIA o plan) para generar el reporte.' });
        return false;
      }

      try {
        setIsDownloading(true);
        showStatus(null);
        // Cede el hilo para que el botón muestre "Generando PDF..." antes del trabajo pesado de jsPDF.
        await new Promise((resolve) => setTimeout(resolve, 80));
        await downloadNutritionReportPdf(
          buildNutritionReportPdfOptions({
            patient: current.patient,
            nutritionistName: current.nutritionistName,
            tenant: current.tenant,
            data,
          }),
        );
        showStatus({ type: 'success', text: 'Reporte PDF descargado.' });
        return true;
      } catch (error) {
        console.error('Error al generar el reporte PDF:', error);
        showStatus({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo generar el reporte PDF.',
        });
        return false;
      } finally {
        setIsDownloading(false);
      }
    },
    [showStatus],
  );

  return {
    download,
    isDownloading,
    status,
    dismissStatus: () => showStatus(null),
    hasReportData: hasNutritionReportData(input),
  };
}
