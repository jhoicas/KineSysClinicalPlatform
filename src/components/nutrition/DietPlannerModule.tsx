import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  PacienteClinico,
  PlanNutricional,
  TiempoComida,
  AlimentoItem,
  OrdenNutricionFHIR,
  EvaluacionAntropometrica,
} from '../../types';
import { FOOD_DATABASE } from '../../data/nutritionCatalog';
import { convertMacroPctToGrams } from '../../utils/nutritionCalculations';
import { EcoExportActions } from '../common/EcoExportActions';
import { dietPlanFormSchema, DietPlanFormData } from '../../schemas/nutritionSchemas';

interface DietPlannerModuleProps {
  patient: PacienteClinico;
  nutritionistId: string;
  nutritionistName: string;
  tenantId: string;
  activeFhirOrders: OrdenNutricionFHIR[];
  latestEvaluation?: EvaluacionAntropometrica | null;
  onSavePlan: (plan: PlanNutricional) => Promise<void>;
}

export const DietPlannerModule: React.FC<DietPlannerModuleProps> = ({
  patient,
  nutritionistId,
  nutritionistName,
  tenantId,
  activeFhirOrders,
  latestEvaluation,
  onSavePlan,
}) => {
  const baseTdee = latestEvaluation?.tdee_kcal || 2200;

  // React Hook Form for Diet Plan configuration & validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DietPlanFormData>({
    resolver: zodResolver(dietPlanFormSchema),
    defaultValues: {
      plan_name: `Pauta Nutricional ${
        latestEvaluation ? 'DASH / Recomposición' : 'Personalizada'
      } - ${patient.first_name}`,
      plan_type: 'terapeutico_clinico',
      caloric_target_kcal: baseTdee,
      protein_pct: 25,
      carbs_pct: 45,
      fats_pct: 30,
      hydration_target_liters: 2.5,
      notes_and_recommendations:
        'Pauta ajustada según evaluación antropométrica y orden médica FHIR. Mantener ingesta regular cada 3-4 horas y evitar sodio añadido.',
    },
    mode: 'onChange',
  });

  const formValues = watch();
  const caloricTarget = formValues.caloric_target_kcal || baseTdee;
  const proteinPct = formValues.protein_pct || 25;
  const carbsPct = formValues.carbs_pct || 45;
  const fatsPct = formValues.fats_pct || 30;
  const hydrationLiters = formValues.hydration_target_liters || 2.5;
  const planName = formValues.plan_name || '';
  const planType = formValues.plan_type || 'terapeutico_clinico';
  const clinicalNotes = formValues.notes_and_recommendations || '';

  // Sum of macro percentages check for feedback
  const totalMacroPct = proteinPct + carbsPct + fatsPct;

  // Meals schedule state
  const [meals, setMeals] = useState<TiempoComida[]>([
    {
      id: 'meal_1',
      name: 'Desayuno',
      time_suggestion: '07:30',
      items: [
        {
          id: 'item_init_1',
          food_id: 'food_avena_integral',
          name: 'Avena en Hojuelas Integral',
          category: 'carbohidrato',
          portion_size: 50,
          unit: 'g',
          calories_kcal: 190,
          protein_g: 6.8,
          carbs_g: 33.0,
          fats_g: 3.5,
          sodium_mg: 3,
        },
        {
          id: 'item_init_2',
          food_id: 'food_yogurt_griego_natural',
          name: 'Yogurt Griego Natural 0%',
          category: 'lacteo',
          portion_size: 170,
          unit: 'g',
          calories_kcal: 100,
          protein_g: 17.0,
          carbs_g: 6.0,
          fats_g: 0.5,
          sodium_mg: 60,
        },
      ],
      total_calories: 290,
      total_protein: 23.8,
      total_carbs: 39.0,
      total_fats: 4.0,
      total_sodium: 63,
    },
    {
      id: 'meal_2',
      name: 'Almuerzo',
      time_suggestion: '13:00',
      items: [
        {
          id: 'item_init_3',
          food_id: 'food_pechuga_pollo',
          name: 'Pechuga de Pollo a la Plancha',
          category: 'proteina',
          portion_size: 150,
          unit: 'g',
          calories_kcal: 247,
          protein_g: 46.5,
          carbs_g: 0,
          fats_g: 5.4,
          sodium_mg: 110,
        },
        {
          id: 'item_init_4',
          food_id: 'food_arroz_jazmin',
          name: 'Arroz Integral Cocido',
          category: 'carbohidrato',
          portion_size: 150,
          unit: 'g',
          calories_kcal: 195,
          protein_g: 4.2,
          carbs_g: 42.0,
          fats_g: 0.8,
          sodium_mg: 5,
        },
        {
          id: 'item_init_5',
          food_id: 'food_espinacas_frescas',
          name: 'Espinacas Baby Crudas',
          category: 'vegetal',
          portion_size: 100,
          unit: 'g',
          calories_kcal: 23,
          protein_g: 2.9,
          carbs_g: 3.6,
          fats_g: 0.4,
          sodium_mg: 24,
        },
      ],
      total_calories: 465,
      total_protein: 53.6,
      total_carbs: 45.6,
      total_fats: 6.6,
      total_sodium: 139,
    },
    {
      id: 'meal_3',
      name: 'Cena',
      time_suggestion: '20:00',
      items: [
        {
          id: 'item_init_6',
          food_id: 'food_salmon_fresco',
          name: 'Filete de Salmón al Horno',
          category: 'proteina',
          portion_size: 140,
          unit: 'g',
          calories_kcal: 291,
          protein_g: 31.7,
          carbs_g: 0,
          fats_g: 18.2,
          sodium_mg: 84,
        },
        {
          id: 'item_init_7',
          food_id: 'food_brocoli_vapor',
          name: 'Brócoli al Vapor',
          category: 'vegetal',
          portion_size: 150,
          unit: 'g',
          calories_kcal: 50,
          protein_g: 4.2,
          carbs_g: 9.8,
          fats_g: 0.6,
          sodium_mg: 45,
        },
      ],
      total_calories: 341,
      total_protein: 35.9,
      total_carbs: 9.8,
      total_fats: 18.8,
      total_sodium: 129,
    },
  ]);

  // Food Search & Selection Modal/Drawer state
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Recalculate target macro grams
  const macroGrams = convertMacroPctToGrams(caloricTarget, proteinPct, carbsPct, fatsPct);

  // Calculate actual plan totals
  const totalPlannedCalories = meals.reduce((sum, m) => sum + m.total_calories, 0);
  const totalPlannedProtein = Math.round(meals.reduce((sum, m) => sum + m.total_protein, 0));
  const totalPlannedCarbs = Math.round(meals.reduce((sum, m) => sum + m.total_carbs, 0));
  const totalPlannedFats = Math.round(meals.reduce((sum, m) => sum + m.total_fats, 0));
  const totalPlannedSodium = Math.round(meals.reduce((sum, m) => sum + m.total_sodium, 0));

  // Cross-check with FHIR NutritionOrder Restrictions
  const patientFhirOrder = activeFhirOrders.find((o) => o.patient_id === patient.id && o.status === 'active');
  const sodiumRestriction = patientFhirOrder?.restrictions.find((r) => r.type === 'sodium_limit' && r.enforced);
  const maxAllowedSodium = sodiumRestriction?.max_limit_value || 2300;
  const isSodiumViolated = totalPlannedSodium > maxAllowedSodium;

  // Add a new empty meal time
  const handleAddMeal = () => {
    const newMeal: TiempoComida = {
      id: `meal_${Date.now()}`,
      name: `Colación / Merienda ${meals.length + 1}`,
      time_suggestion: '16:30',
      items: [],
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fats: 0,
      total_sodium: 0,
    };
    setMeals([...meals, newMeal]);
  };

  // Remove a meal time
  const handleRemoveMeal = (mealId: string) => {
    setMeals(meals.filter((m) => m.id !== mealId));
  };

  // Add food item to selected meal
  const handleAddFoodToMeal = (food: Omit<AlimentoItem, 'id'>) => {
    if (!selectedMealId) return;

    setMeals((prevMeals) =>
      prevMeals.map((meal) => {
        if (meal.id !== selectedMealId) return meal;

        const newItem: AlimentoItem = {
          ...food,
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        };

        const updatedItems = [...meal.items, newItem];
        return {
          ...meal,
          items: updatedItems,
          total_calories: Math.round(updatedItems.reduce((s, i) => s + i.calories_kcal, 0)),
          total_protein: parseFloat(updatedItems.reduce((s, i) => s + i.protein_g, 0).toFixed(1)),
          total_carbs: parseFloat(updatedItems.reduce((s, i) => s + i.carbs_g, 0).toFixed(1)),
          total_fats: parseFloat(updatedItems.reduce((s, i) => s + i.fats_g, 0).toFixed(1)),
          total_sodium: Math.round(updatedItems.reduce((s, i) => s + i.sodium_mg, 0)),
        };
      })
    );
  };

  // Remove an item from a meal
  const handleRemoveFoodItem = (mealId: string, itemId: string) => {
    setMeals((prevMeals) =>
      prevMeals.map((meal) => {
        if (meal.id !== mealId) return meal;
        const updatedItems = meal.items.filter((i) => i.id !== itemId);
        return {
          ...meal,
          items: updatedItems,
          total_calories: Math.round(updatedItems.reduce((s, i) => s + i.calories_kcal, 0)),
          total_protein: parseFloat(updatedItems.reduce((s, i) => s + i.protein_g, 0).toFixed(1)),
          total_carbs: parseFloat(updatedItems.reduce((s, i) => s + i.carbs_g, 0).toFixed(1)),
          total_fats: parseFloat(updatedItems.reduce((s, i) => s + i.fats_g, 0).toFixed(1)),
          total_sodium: Math.round(updatedItems.reduce((s, i) => s + i.sodium_mg, 0)),
        };
      })
    );
  };

  // Filter food catalog
  const filteredFoods = FOOD_DATABASE.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const onValidSubmit = async (data: DietPlanFormData) => {
    try {
      const plan: PlanNutricional = {
        id: `plan_nutri_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tenant_id: tenantId,
        patient_id: patient.id,
        nutritionist_id: nutritionistId,
        nutritionist_name: nutritionistName,
        plan_name: data.plan_name,
        plan_type: data.plan_type,
        status: 'active',
        caloric_target_kcal: data.caloric_target_kcal,
        macros_target: {
          protein_grams: macroGrams.protein_grams,
          protein_pct: data.protein_pct,
          carbs_grams: macroGrams.carbs_grams,
          carbs_pct: data.carbs_pct,
          fats_grams: macroGrams.fats_grams,
          fats_pct: data.fats_pct,
          sodium_mg_max: maxAllowedSodium,
        },
        meals,
        clinical_restrictions: patientFhirOrder ? [patientFhirOrder.clinical_indication] : [],
        active_fhir_order_id: patientFhirOrder?.id,
        notes_and_recommendations: data.notes_and_recommendations || '',
        hydration_target_liters: data.hydration_target_liters || 2.5,
        created_at: new Date().toISOString(),
      };

      await onSavePlan(plan);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving nutrition plan:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-6">
      {/* Top Clinical & FHIR Validation Alert Banner */}
      {patientFhirOrder && (
        <div
          className={`p-4 rounded-3xl border flex items-start gap-3 transition-all ${
            isSodiumViolated
              ? 'bg-error-container/40 border-error/30 text-on-error-container'
              : 'bg-secondary-fixed/30 border-secondary-fixed-dim text-on-secondary-fixed'
          }`}
        >
          <span
            className={`material-symbols-outlined text-2xl ${
              isSodiumViolated ? 'text-error' : 'text-secondary'
            }`}
          >
            {isSodiumViolated ? 'gpp_bad' : 'verified_user'}
          </span>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">
                Interoperabilidad Semántica Activa: FHIR NutritionOrder ({patientFhirOrder.id})
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface">
                Emisor: {patientFhirOrder.practitioner_name}
              </span>
            </div>
            <p className="text-xs font-medium">
              <strong>Indicación Médica:</strong> {patientFhirOrder.clinical_indication}
            </p>
            {sodiumRestriction && (
              <div className="flex items-center gap-4 text-xs mt-1">
                <span>
                  Límite de Sodio Dietético:{' '}
                  <strong>
                    {maxAllowedSodium} {sodiumRestriction.unit}
                  </strong>
                </span>
                <span>
                  Sodio Planificado Actual:{' '}
                  <strong
                    className={
                      isSodiumViolated ? 'text-error underline font-black' : 'text-secondary font-bold'
                    }
                  >
                    {totalPlannedSodium} mg/día
                  </strong>
                </span>
              </div>
            )}
            {isSodiumViolated && (
              <p className="text-[11px] font-bold text-error mt-1">
                ⚠️ BLOQUEO CLÍNICO: La suma de alimentos supera el límite máximo de sodio prescrito por el médico.
                Reemplace o reduzca los ingredientes procesados antes de dispensar la pauta.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Target Macros & Calories Control Panel */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">tune</span>
              <span>Calibración de Objetivos Calóricos & Macronutrientes</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Gasto TDEE referencial de la evaluación: <strong>{baseTdee} kcal</strong>
            </p>
          </div>

          {/* Quick Adjustment Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setValue('caloric_target_kcal', Math.round(baseTdee - 500), { shouldValidate: true })}
              className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold rounded-xl border border-outline-variant/40 cursor-pointer transition-colors"
            >
              Déficit -500 kcal
            </button>
            <button
              type="button"
              onClick={() => setValue('caloric_target_kcal', Math.round(baseTdee - 300), { shouldValidate: true })}
              className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold rounded-xl border border-outline-variant/40 cursor-pointer transition-colors"
            >
              Déficit -300 kcal
            </button>
            <button
              type="button"
              onClick={() => setValue('caloric_target_kcal', baseTdee, { shouldValidate: true })}
              className="px-2.5 py-1 bg-primary-fixed/40 hover:bg-primary-fixed text-on-primary-fixed text-[11px] font-bold rounded-xl border border-primary-fixed-dim cursor-pointer transition-colors"
            >
              Normocalórica ({baseTdee})
            </button>
            <button
              type="button"
              onClick={() => setValue('caloric_target_kcal', Math.round(baseTdee + 300), { shouldValidate: true })}
              className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold rounded-xl border border-outline-variant/40 cursor-pointer transition-colors"
            >
              Superávit +300 kcal
            </button>
          </div>
        </div>

        {/* Sliders & Values */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
          {/* Target Calories */}
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
            <label className="block text-xs font-bold text-on-surface-variant">
              Calorías Objetivo Diarias*
            </label>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="50"
                {...register('caloric_target_kcal', { valueAsNumber: true })}
                className="w-24 bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2 py-1 text-lg font-black text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-xs font-bold text-on-surface-variant">kcal / día</span>
            </div>
            <input
              type="range"
              min="800"
              max="5000"
              step="50"
              value={caloricTarget}
              onChange={(e) =>
                setValue('caloric_target_kcal', parseInt(e.target.value) || 2000, { shouldValidate: true })
              }
              className="w-full accent-primary cursor-pointer"
            />
            {errors.caloric_target_kcal && (
              <span className="text-[10px] text-error font-bold block">{errors.caloric_target_kcal.message}</span>
            )}
          </div>

          {/* Protein % */}
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-on-surface">Proteínas ({proteinPct}%)</span>
              <span className="font-black text-primary">{macroGrams.protein_grams} g</span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-mono block">
              {(macroGrams.protein_grams / (latestEvaluation?.weight_kg || 70)).toFixed(1)} g/kg de peso
            </span>
            <input
              type="range"
              min="5"
              max="60"
              value={proteinPct}
              onChange={(e) => setValue('protein_pct', parseInt(e.target.value) || 25, { shouldValidate: true })}
              className="w-full accent-primary cursor-pointer"
            />
            {errors.protein_pct && (
              <span className="text-[10px] text-error font-bold block">{errors.protein_pct.message}</span>
            )}
          </div>

          {/* Carbs % */}
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-on-surface">Carbohidratos ({carbsPct}%)</span>
              <span className="font-black text-secondary">{macroGrams.carbs_grams} g</span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-mono block">
              {macroGrams.carbs_kcal} kcal aportadas
            </span>
            <input
              type="range"
              min="5"
              max="80"
              value={carbsPct}
              onChange={(e) => setValue('carbs_pct', parseInt(e.target.value) || 45, { shouldValidate: true })}
              className="w-full accent-secondary cursor-pointer"
            />
            {errors.carbs_pct && (
              <span className="text-[10px] text-error font-bold block">{errors.carbs_pct.message}</span>
            )}
          </div>

          {/* Fats % */}
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-on-surface">Grasas ({fatsPct}%)</span>
              <span className="font-black text-tertiary">{macroGrams.fats_grams} g</span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-mono block">
              {macroGrams.fats_kcal} kcal aportadas
            </span>
            <input
              type="range"
              min="5"
              max="60"
              value={fatsPct}
              onChange={(e) => setValue('fats_pct', parseInt(e.target.value) || 30, { shouldValidate: true })}
              className="w-full accent-tertiary cursor-pointer"
            />
            {errors.fats_pct && (
              <span className="text-[10px] text-error font-bold block">{errors.fats_pct.message}</span>
            )}
          </div>
        </div>

        {/* Macro Distribution Sum Alert */}
        <div className="flex items-center justify-between text-xs px-2 pt-1">
          <span className="text-on-surface-variant font-medium">
            Suma de macronutrientes:{' '}
            <strong
              className={
                totalMacroPct === 100
                  ? 'text-on-secondary-fixed bg-secondary-fixed px-2 py-0.5 rounded font-bold'
                  : 'text-error font-black'
              }
            >
              {totalMacroPct}%
            </strong>
          </span>
          {totalMacroPct !== 100 && (
            <span className="text-[11px] font-bold text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              La distribución debe sumar exactamente 100% (actualmente {totalMacroPct}%).
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Meals Builder Left (8 Cols), Macros Monitor Right (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic Meals & Foods Builder (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">restaurant</span>
                  <span>Estructura de Tiempos de Comida</span>
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Planifique los alimentos prescritos para alcanzar el balance calórico del paciente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddMeal}
                className="px-3.5 py-1.5 bg-primary-fixed/30 hover:bg-primary-fixed text-on-primary-fixed font-black text-xs rounded-xl border border-primary-fixed-dim flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>+ Tiempo de Comida</span>
              </button>
            </div>

            {/* List of Meal Times */}
            <div className="space-y-4 pt-2">
              {meals.map((meal, mIndex) => (
                <div
                  key={meal.id}
                  className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center font-black text-xs">
                        {mIndex + 1}
                      </span>
                      <input
                        type="text"
                        value={meal.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMeals(meals.map((m) => (m.id === meal.id ? { ...m, name: val } : m)));
                        }}
                        className="font-black text-sm text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-1"
                      />
                      <span className="text-xs text-on-surface-variant font-mono">
                        ({meal.time_suggestion})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-on-surface bg-surface-container-lowest px-2.5 py-1 rounded-xl border border-outline-variant/30">
                        {meal.total_calories} kcal
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedMealId(meal.id)}
                        className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold text-xs rounded-xl border border-outline-variant/40 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        <span>Alimento</span>
                      </button>

                      {meals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="p-1 text-on-surface-variant hover:text-error cursor-pointer transition-colors"
                          title="Eliminar tiempo de comida"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meal Items List */}
                  {meal.items.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic py-2">
                      No hay alimentos en este tiempo. Haga clic en "+ Alimento" para seleccionar del catálogo.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {meal.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface">{item.name}</span>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              ({item.portion_size} {item.unit})
                            </span>
                            {item.sodium_mg > 400 && (
                              <span className="px-1.5 py-0.5 bg-error-container text-on-error-container text-[10px] font-bold rounded border border-error/30">
                                Alto Na ({item.sodium_mg}mg)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-on-surface">{item.calories_kcal} kcal</span>
                            <span className="text-[11px] text-on-surface-variant font-mono">
                              P:{item.protein_g}g C:{item.carbs_g}g G:{item.fats_g}g
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFoodItem(meal.id, item.id)}
                              className="text-on-surface-variant hover:text-error cursor-pointer p-0.5 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Plan Metadata & Recommendations Form */}
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
            <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">
              Indicaciones Clínicas & Pautas Conductuales
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">
                  Nombre de la Pauta*
                </label>
                <input
                  type="text"
                  {...register('plan_name')}
                  className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    errors.plan_name ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50'
                  }`}
                />
                {errors.plan_name && (
                  <span className="text-[10px] text-error font-bold mt-1 block">{errors.plan_name.message}</span>
                )}
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Tipo de Abordaje</label>
                <select
                  {...register('plan_type')}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-2 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="terapeutico_clinico">Terapéutico Clínico (FHIR)</option>
                  <option value="dieta_dash">Dieta DASH (Antihipertensiva)</option>
                  <option value="recomposicion">Recomposición Corporal / Hipertrofia</option>
                  <option value="deficit_controlado">Déficit Calórico Controlado</option>
                  <option value="blanda_gastrica">Blanda Gástrica No Irritante</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant mb-1 text-xs">
                Meta de Hidratación Diaria (Litros)
              </label>
              <input
                type="number"
                step="0.1"
                {...register('hydration_target_liters', { valueAsNumber: true })}
                className="w-48 bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant mb-1 text-xs">
                Recomendaciones Conductuales & Pautas de Cocción
              </label>
              <textarea
                rows={3}
                {...register('notes_and_recommendations')}
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl p-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                placeholder="Ejemplo: Preferir cocciones al vapor, sazonar con orégano y cúrcuma en vez de sal..."
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-outline-variant/30">
              <div>
                <EcoExportActions
                  patient={patient}
                  documentType="plan_nutricional"
                  plan={{
                    id: `draft_plan_${patient.id}`,
                    tenant_id: tenantId,
                    patient_id: patient.id,
                    nutritionist_id: nutritionistId,
                    nutritionist_name: nutritionistName,
                    plan_name: planName,
                    plan_type: planType,
                    status: 'active',
                    caloric_target_kcal: caloricTarget,
                    macros_target: {
                      protein_grams: macroGrams.protein_grams,
                      protein_pct: proteinPct,
                      carbs_grams: macroGrams.carbs_grams,
                      carbs_pct: carbsPct,
                      fats_grams: macroGrams.fats_grams,
                      fats_pct: fatsPct,
                      sodium_mg_max: maxAllowedSodium,
                    },
                    meals,
                    clinical_restrictions: patientFhirOrder ? [patientFhirOrder.clinical_indication] : [],
                    active_fhir_order_id: patientFhirOrder?.id,
                    notes_and_recommendations: clinicalNotes,
                    hydration_target_liters: hydrationLiters,
                    created_at: new Date().toISOString(),
                  }}
                  evaluation={latestEvaluation}
                  nutritionistName={nutritionistName}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs font-extrabold text-on-secondary-fixed bg-secondary-fixed px-3 py-1.5 rounded-xl border border-secondary-fixed-dim flex items-center gap-1 shadow-2xs">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>¡Pauta guardada en base de datos!</span>
                  </span>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isSodiumViolated}
                  className={`px-6 py-2.5 font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isSodiumViolated
                      ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-60'
                      : 'bg-primary hover:bg-primary-container text-white shadow-xs'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isSubmitting ? 'hourglass_top' : 'task_alt'}
                  </span>
                  <span>{isSubmitting ? 'Prescribiendo...' : 'Prescribir & Guardar Pauta'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Dynamic Macro Progress & Target Compliance (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-6">
            <h4 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">analytics</span>
              <span>Balance Planificado vs Meta</span>
            </h4>

            {/* Total Calories Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-on-surface">Calorías Totales</span>
                <span className="font-mono">
                  <strong>{totalPlannedCalories}</strong> / {caloricTarget} kcal
                </span>
              </div>
              <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (totalPlannedCalories / (caloricTarget || 1)) * 100)}%` }}
                  className={`h-full transition-all duration-300 ${
                    totalPlannedCalories > caloricTarget * 1.05
                      ? 'bg-tertiary-fixed-dim'
                      : totalPlannedCalories < caloricTarget * 0.95
                      ? 'bg-secondary-fixed-dim'
                      : 'bg-primary'
                  }`}
                ></div>
              </div>
              <span className="text-[10px] text-on-surface-variant font-mono block text-right">
                {Math.round((totalPlannedCalories / (caloricTarget || 1)) * 100)}% de la meta
              </span>
            </div>

            {/* Protein Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-primary font-bold">Proteína</span>
                <span className="font-mono">
                  <strong>{totalPlannedProtein}g</strong> / {macroGrams.protein_grams}g
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, (totalPlannedProtein / (macroGrams.protein_grams || 1)) * 100)}%`,
                  }}
                  className="h-full bg-primary transition-all duration-300"
                ></div>
              </div>
            </div>

            {/* Carbs Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-secondary font-bold">Carbohidratos</span>
                <span className="font-mono">
                  <strong>{totalPlannedCarbs}g</strong> / {macroGrams.carbs_grams}g
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, (totalPlannedCarbs / (macroGrams.carbs_grams || 1)) * 100)}%`,
                  }}
                  className="h-full bg-secondary transition-all duration-300"
                ></div>
              </div>
            </div>

            {/* Fats Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-tertiary font-bold">Grasas</span>
                <span className="font-mono">
                  <strong>{totalPlannedFats}g</strong> / {macroGrams.fats_grams}g
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, (totalPlannedFats / (macroGrams.fats_grams || 1)) * 100)}%`,
                  }}
                  className="h-full bg-tertiary-fixed-dim transition-all duration-300"
                ></div>
              </div>
            </div>

            {/* Sodium Clinical Restriction Bar */}
            <div className="space-y-2 pt-2 border-t border-outline-variant/30">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-on-surface flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">science</span>
                  <span>Sodio Dietético</span>
                </span>
                <span className={`font-mono ${isSodiumViolated ? 'text-error font-black' : 'text-on-surface'}`}>
                  <strong>{totalPlannedSodium}mg</strong> / max {maxAllowedSodium}mg
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (totalPlannedSodium / (maxAllowedSodium || 1)) * 100)}%` }}
                  className={`h-full transition-all duration-300 ${
                    isSodiumViolated ? 'bg-error' : 'bg-secondary'
                  }`}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Food Selection Modal / Drawer */}
      {selectedMealId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div>
                <h3 className="text-sm font-black text-on-surface">Catálogo de Alimentos & Macronutrientes</h3>
                <p className="text-xs text-on-surface-variant">
                  Agregando a:{' '}
                  <strong>{meals.find((m) => m.id === selectedMealId)?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMealId(null)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Buscar alimento (ej. Pollo, Avena, Salmón...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-2 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="proteina">Proteínas</option>
                  <option value="carbohidrato">Carbohidratos</option>
                  <option value="grasa">Grasas saludables</option>
                  <option value="vegetal">Vegetales</option>
                  <option value="fruta">Frutas</option>
                  <option value="lacteo">Lácteos</option>
                  <option value="suplemento">Suplementos</option>
                </select>
              </div>
            </div>

            {/* Food items list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredFoods.map((food) => (
                <div
                  key={food.food_id}
                  className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex items-center justify-between gap-3 text-xs hover:border-primary/50 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface">{food.name}</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        ({food.portion_size} {food.unit})
                      </span>
                      {food.sodium_mg > 400 && (
                        <span className="px-1.5 py-0.5 bg-error-container text-on-error-container text-[9px] font-bold rounded border border-error/30">
                          Alto Na ({food.sodium_mg}mg)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                      {food.calories_kcal} kcal • P: {food.protein_g}g • C: {food.carbs_g}g • G: {food.fats_g}g • Na:{' '}
                      {food.sodium_mg}mg
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleAddFoodToMeal(food);
                      setSelectedMealId(null);
                    }}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Agregar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
