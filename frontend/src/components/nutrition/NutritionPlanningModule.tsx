import React, { useMemo, useState } from 'react';
import {
  Patient,
  NutritionPlan,
  MealTimeType,
  MealFoodEntry,
} from '../../types/coreBodyNutrition';
import type { FoodItem } from '../../types';
import { FoodSearchCombobox } from './FoodSearchCombobox';
import { scaleNutrientPer100g, roundNutrient } from '../../utils/nutritionCalculations';
import {
  Apple,
  DollarSign,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Flame,
  PieChart,
  ShoppingBag,
  Utensils,
} from 'lucide-react';

interface NutritionPlanningModuleProps {
  patient: Patient;
  plan?: NutritionPlan;
  onSave: (plan: NutritionPlan) => void;
}

const EMPTY_MEALS: NutritionPlan['meals'] = [
  { mealTime: 'Desayuno', recommendedHour: '07:30 AM', clinicalTip: '', entries: [] },
  { mealTime: 'Media Mañana', recommendedHour: '10:30 AM', clinicalTip: '', entries: [] },
  { mealTime: 'Almuerzo', recommendedHour: '01:30 PM', clinicalTip: '', entries: [] },
  { mealTime: 'Media Tarde', recommendedHour: '04:45 PM', clinicalTip: '', entries: [] },
  { mealTime: 'Cena', recommendedHour: '08:00 PM', clinicalTip: '', entries: [] },
];

function buildEmptyPlan(patient: Patient): NutritionPlan {
  const weight = patient.weightKg || 70;
  const targetCalories = 0;
  return {
    id: crypto.randomUUID(),
    patientId: patient.id,
    date: new Date().toISOString().slice(0, 10),
    nutritionist: patient.nutritionist || '',
    nutritionistId: patient.nutritionistId || '',
    targetObjective: 'Recomposición Corporal',
    basalMetabolicRateKcal: 0,
    totalDailyEnergyExpenditureKcal: 0,
    targetCaloriesKcal: targetCalories,
    macroTargets: {
      proteinPct: 30,
      proteinGrams: Math.round(weight * 1.6),
      carbsPct: 40,
      carbsGrams: 0,
      lipidsPct: 30,
      lipidsGrams: 0,
    },
    hydrationDailyLiters: 0,
    micronutrientAlerts: { calciumMg: 0, ironMg: 0, sodiumMg: 0 },
    dailyBasketEstimatedCostCOP: 0,
    monthlyBasketEstimatedCostCOP: 0,
    generalIndications: '',
    meals: EMPTY_MEALS.map((m) => ({ ...m, entries: [] })),
  };
}

export const NutritionPlanningModule: React.FC<NutritionPlanningModuleProps> = ({
  patient,
  plan,
  onSave,
}) => {
  const [currentPlan, setCurrentPlan] = useState<NutritionPlan>(
    plan || buildEmptyPlan(patient),
  );
  const [selectedMealForAdd, setSelectedMealForAdd] = useState<MealTimeType>('Desayuno');
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const allEntries = currentPlan.meals.flatMap((m) => m.entries);
  const totalCalories = allEntries.reduce((acc, curr) => acc + curr.caloriesKcal, 0);
  const totalProteinG = Number(allEntries.reduce((acc, curr) => acc + curr.proteinG, 0).toFixed(1));
  const totalLipidsG = Number(allEntries.reduce((acc, curr) => acc + curr.lipidsG, 0).toFixed(1));
  const totalCarbsG = Number(allEntries.reduce((acc, curr) => acc + curr.carbsTotalG, 0).toFixed(1));
  const totalCostDailyCOP = allEntries.reduce((acc, curr) => acc + curr.estimatedCostCOP, 0);
  const totalCostMonthlyCOP = totalCostDailyCOP * 30;

  const proteinPerKg = useMemo(() => {
    const w = patient.weightKg;
    if (!w || w <= 0) return null;
    return Number((totalProteinG / w).toFixed(1));
  }, [patient.weightKg, totalProteinG]);

  /** Catálogo real kinesys.food_catalog (valores por 100 g). Sin precio en schema → costeo 0. */
  const handleAddFoodFromCatalog = (food: FoodItem, grams: number) => {
    const factor = grams / 100;
    const newEntry: MealFoodEntry = {
      id: crypto.randomUUID(),
      foodId: food.id,
      foodName: food.name,
      grams: Math.round(grams),
      portionCount: Number(factor.toFixed(2)),
      caloriesKcal: Math.round(scaleNutrientPer100g(food.energy_kcal, grams)),
      proteinG: roundNutrient(scaleNutrientPer100g(food.protein_g, grams)),
      lipidsG: roundNutrient(scaleNutrientPer100g(food.lipids_g, grams)),
      carbsTotalG: roundNutrient(scaleNutrientPer100g(food.carbs_total_g, grams)),
      estimatedCostCOP: 0,
    };

    setCurrentPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.mealTime === selectedMealForAdd
          ? { ...m, entries: [...m.entries, newEntry] }
          : m,
      ),
    }));
    setShowAddFoodModal(false);
    setIsSaved(false);
  };

  const handleRemoveEntry = (mealTime: MealTimeType, entryId: string) => {
    setCurrentPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.mealTime === mealTime
          ? { ...m, entries: m.entries.filter((e) => e.id !== entryId) }
          : m,
      ),
    }));
    setIsSaved(false);
  };

  const handleSavePlan = () => {
    const updatedPlan: NutritionPlan = {
      ...currentPlan,
      dailyBasketEstimatedCostCOP: totalCostDailyCOP,
      monthlyBasketEstimatedCostCOP: totalCostMonthlyCOP,
    };
    onSave(updatedPlan);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div id="nutrition-planning-module" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold text-lg">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Planificación Dietética (TCA 2018 Colombia)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Catálogo Supabase
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Minuta basada en <strong>kinesys.food_catalog</strong> · Clínica KineSys Demo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-add-food-modal"
              type="button"
              onClick={() => setShowAddFoodModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              Añadir Alimento
            </button>
            <button
              id="btn-save-nutrition-plan"
              type="button"
              onClick={handleSavePlan}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Plan Guardado' : 'Guardar Minuta'}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-2xs text-slate-400 block font-semibold uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3" /> Calorías
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-slate-900">{totalCalories || '—'}</span>
              <span className="text-2xs text-slate-500 font-bold">
                / {currentPlan.targetCaloriesKcal || '—'} kcal
              </span>
            </div>
          </div>
          <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
            <span className="text-2xs text-blue-700 block font-semibold uppercase tracking-wider">
              Proteína
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-blue-900">{totalProteinG || '—'}g</span>
            </div>
            <span className="text-3xs text-blue-700 block mt-1 font-medium">
              {proteinPerKg != null ? `${proteinPerKg} g/kg peso` : 'Sin peso paciente'}
            </span>
          </div>
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
            <span className="text-2xs text-amber-800 block font-semibold uppercase tracking-wider">
              Carbohidratos
            </span>
            <span className="text-lg font-black text-amber-900 mt-0.5 block">{totalCarbsG || '—'}g</span>
          </div>
          <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-3">
            <span className="text-2xs text-orange-800 block font-semibold uppercase tracking-wider flex items-center gap-1">
              <PieChart className="w-3 h-3" /> Grasas
            </span>
            <span className="text-lg font-black text-orange-900 mt-0.5 block">{totalLipidsG || '—'}g</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
            <span className="text-2xs text-emerald-800 block font-semibold uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Canasta / día
            </span>
            <span className="text-lg font-black text-emerald-900 mt-0.5 block">
              ${totalCostDailyCOP.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
            <span className="text-2xs text-emerald-800 block font-semibold uppercase tracking-wider flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" /> Mensual
            </span>
            <span className="text-lg font-black text-emerald-900 mt-0.5 block">
              ${totalCostMonthlyCOP.toLocaleString('es-CO')}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {currentPlan.meals.map((meal) => {
          const mealKcal = meal.entries.reduce((s, e) => s + e.caloriesKcal, 0);
          const mealProt = meal.entries.reduce((s, e) => s + e.proteinG, 0);
          const mealCost = meal.entries.reduce((s, e) => s + e.estimatedCostCOP, 0);
          return (
            <div
              key={meal.mealTime}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">{meal.mealTime}</h3>
                  <span className="text-2xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {meal.recommendedHour}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-2xs font-semibold text-slate-600">
                  <span>{mealKcal} kcal</span>
                  <span>P {mealProt.toFixed(1)}g</span>
                  <span className="text-emerald-700">${mealCost.toLocaleString('es-CO')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMealForAdd(meal.mealTime);
                      setShowAddFoodModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-2xs font-bold"
                  >
                    <Plus className="w-3 h-3" /> Alimento
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {meal.entries.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Sin alimentos. Use «Añadir» para buscar en el catálogo TCA (Supabase).
                  </p>
                ) : (
                  meal.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 py-2 px-2 rounded-lg hover:bg-slate-50"
                    >
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{entry.foodName}</span>
                        <span className="text-3xs text-slate-400">Porción: {entry.grams} g</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {entry.caloriesKcal} kcal
                          </span>
                          <span className="text-3xs text-slate-400">
                            P: {entry.proteinG}g · C: {entry.carbsTotalG}g · G: {entry.lipidsG}g
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(meal.mealTime, entry.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Añadir a: <span className="text-emerald-700">{selectedMealForAdd}</span>
                </h3>
                <p className="text-2xs text-slate-500">
                  Búsqueda en tiempo real · tabla <code>food_catalog</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFoodModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <label className="block text-2xs font-bold text-slate-500 mb-2 uppercase">
                Tiempo de comida
              </label>
              <select
                value={selectedMealForAdd}
                onChange={(e) => setSelectedMealForAdd(e.target.value as MealTimeType)}
                className="w-full mb-3 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2"
              >
                {currentPlan.meals.map((m) => (
                  <option key={m.mealTime} value={m.mealTime}>
                    {m.mealTime}
                  </option>
                ))}
              </select>
              <FoodSearchCombobox
                onAddFood={handleAddFoodFromCatalog}
                placeholder="Buscar en food_catalog (ej. pollo, arepa, lenteja)..."
                defaultGrams={100}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionPlanningModule;
