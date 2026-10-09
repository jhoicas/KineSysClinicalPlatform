import { useCallback, useEffect, useRef, useState } from 'react';
import type { PacienteClinico, Tenant } from '../types';
import { downloadNutritionReportPdf, type GenerateNutritionReportPdfOptions } from '../utils/nutritionReportPdf';
import {
  buildNutritionReportPdfOptions,
  hasNutritionReportData,
  type NutritionReportData,
} from '../utils/nutritionReportExport';

export interface NutritionReportExportInput extends NutritionReportData {
  patient: PacienteClinico | null;
  nutritionistName: string;
  tenant: Tenant | null | undefined;
  /**
   * Recolección en vivo: guarda lo pendiente de los módulos (flush) y devuelve el snapshot consolidado
   * (ISAK + BIA + plan) leído AL MOMENTO DEL CLIC. Es la única vía de datos de descarga, vista previa
   * y correo. Sin ella se usan los datos del último render (isak/withings/plan).
   */
  collect?: () => Promise<NutritionReportData>;
}

export interface NutritionReportStatus {
  type: 'success' | 'error';
  text: string;
}

const STATUS_VISIBLE_MS = 5000;

/**
 * Informe nutricional integral (ISAK + Withings + plan): una sola lógica para todos los orígenes.
 *
 *  - `collect()`: flush de los módulos + snapshot fresco. Lo usan descarga, vista previa y correo.
 *  - `buildOptions(data)`: opciones del PDF (branding + los tres bloques) a partir de ese snapshot.
 *  - `download()`: collect + buildOptions + generación y descarga del PDF.
 *
 * Los datos de entrada se leen desde una referencia al render más reciente, de modo que ningún cierre
 * obsoleto pueda alimentar el PDF.
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

  const collect = useCallback(async (): Promise<NutritionReportData> => {
    const current = inputRef.current;
    if (current.collect) {
      const data = await current.collect();
      return { isak: data.isak ?? null, withings: data.withings ?? null, plan: data.plan ?? null };
    }
    return { isak: current.isak ?? null, withings: current.withings ?? null, plan: current.plan ?? null };
  }, []);

  const buildOptions = useCallback((data: NutritionReportData): GenerateNutritionReportPdfOptions => {
    const current = inputRef.current;
    if (!current.patient) throw new Error('Selecciona un paciente para generar el informe.');
    return buildNutritionReportPdfOptions({
      patient: current.patient,
      nutritionistName: current.nutritionistName,
      tenant: current.tenant,
      data,
    });
  }, []);

  const download = useCallback(async (): Promise<boolean> => {
    if (!inputRef.current.patient) return false;
    try {
      setIsDownloading(true);
      showStatus(null);
      // Cede el hilo para que el botón muestre "Generando PDF..." antes del trabajo pesado de jsPDF.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const data = await collect();
      if (!hasNutritionReportData(data)) {
        showStatus({ type: 'error', text: 'Aún no hay datos (ISAK, BIA o plan) para generar el reporte.' });
        return false;
      }
      await downloadNutritionReportPdf(buildOptions(data));
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
  }, [buildOptions, collect, showStatus]);

  return {
    download,
    collect,
    buildOptions,
    isDownloading,
    status,
    dismissStatus: () => showStatus(null),
    hasReportData: hasNutritionReportData(input),
  };
}

export type NutritionReportExport = ReturnType<typeof useNutritionReportExport>;
