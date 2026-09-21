import { useState, useEffect } from 'react';
import api from '../services/apiClient';
import {
  SomatotypeResultDTO,
  BodyCompositionResultDTO,
  BmrResultDTO,
} from '../schemas/nutritionSchemas';

interface UseAnthropometryCalculationsProps {
  gender: 'male' | 'female' | 'other';
  age_years: number;
  weight_kg: number;
  height_cm: number;
  measures: {
    triceps?: number;
    subscapular?: number;
    biceps?: number;
    iliac_crest?: number;
    suprailiac?: number;
    abdominal?: number;
    thigh_sf?: number;
    calf_sf?: number;
    humerus?: number;
    femur?: number;
    arm_flexed?: number;
    calf_cir?: number;
  };
  equation: string;
}

export function useAnthropometryCalculations({
  gender,
  age_years,
  weight_kg,
  height_cm,
  measures,
  equation,
}: UseAnthropometryCalculationsProps) {
  const [somatotype, setSomatotype] = useState<SomatotypeResultDTO | null>(null);
  const [composition, setComposition] = useState<BodyCompositionResultDTO | null>(null);
  const [bmr, setBmr] = useState<BmrResultDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debounce to prevent excessive API calls
    const handler = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Calculate Somatotype
        const somaRes = await api.anthropometry.calculateSomatotype({
          triceps_mm: measures.triceps || 0,
          subscapular_mm: measures.subscapular || 0,
          suprailiac_mm: measures.suprailiac || 0,
          calf_mm: measures.calf_sf || 0,
          height_cm: height_cm || 0,
          humerus_cm: measures.humerus || 0,
          femur_cm: measures.femur || 0,
          arm_cm: measures.arm_flexed || 0,
        });

        if (somaRes.data) setSomatotype(somaRes.data);

        // Calculate Composition
        const compRes = await api.anthropometry.calculateComposition({
          gender,
          age_years,
          weight_kg,
          triceps_mm: measures.triceps || 0,
          subscapular_mm: measures.subscapular || 0,
          suprailiac_mm: measures.suprailiac || 0,
          abdominal_mm: measures.abdominal || 0,
        });

        if (compRes.data) setComposition(compRes.data);

        // Calculate BMR
        const bmrRes = await api.anthropometry.calculateBmr({
          weight_kg,
          height_cm,
          age_years,
          gender,
          equation,
        });

        if (bmrRes.data) setBmr(bmrRes.data);
      } catch (err: any) {
        setError(err.message || 'Error al calcular parámetros antropométricos');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [
    gender,
    age_years,
    weight_kg,
    height_cm,
    measures.triceps,
    measures.subscapular,
    measures.suprailiac,
    measures.abdominal,
    measures.calf_sf,
    measures.humerus,
    measures.femur,
    measures.arm_flexed,
    equation,
  ]);

  return { somatotype, composition, bmr, isLoading, error };
}
