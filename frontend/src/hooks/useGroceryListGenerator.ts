import { useState, useCallback } from 'react';
import api from '../services/apiClient';
import { GenerateGroceryListRequest, SmartGroceryListDTO } from '../schemas/nutritionSchemas';

export function useGroceryListGenerator() {
  const [groceryList, setGroceryList] = useState<SmartGroceryListDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateList = useCallback(async (data: GenerateGroceryListRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.nutritionPlans.generateGroceryList(data);
      if (res.data) {
        setGroceryList(res.data);
      }
      return res.data;
    } catch (err: any) {
      setError(err.message || 'Error al generar la lista de compras inteligente');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { groceryList, generateList, isLoading, error };
}
