import { useState, useEffect, useRef } from 'react';
import api from '../services/apiClient';
import { DietPlanTotalsDTO, CalculateDietPlanRequest } from '../schemas/nutritionSchemas';

export function useDietPlannerCalculations(planData: Omit<CalculateDietPlanRequest, 'tenant_id'>) {
  const [totals, setTotals] = useState<DietPlanTotalsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to store the latest planData to avoid excessive requests if only minor things change
  const stringifiedData = JSON.stringify(planData);

  useEffect(() => {
    const handler = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const req: CalculateDietPlanRequest = {
          ...planData,
        };
        const res = await api.nutritionPlans.calculateDietPlanTotals(req);
        if (res.data) {
          setTotals(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Error al calcular los totales del plan nutricional');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [stringifiedData]);

  return { totals, isLoading, error };
}
