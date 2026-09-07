import React, { useState } from 'react';
import {
  Patient,
  NutritionPlan,
  TcaFoodItem,
  MealTimeType,
  MealPlanSection,
  MealFoodEntry,
} from '../../types/coreBodyNutrition';
import { TCA_2018_DATABASE } from '../../data/tca2018Catalog';
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
  Sparkles,
  Search,
  Filter,
  Utensils,
  ChevronDown,
  Info,
} from 'lucide-react';

interface NutritionPlanningModuleProps {
  patient: Patient;
  plan?: NutritionPlan;
  onSave: (plan: NutritionPlan) => void;
}

export const NutritionPlanningModule: React.FC<NutritionPlanningModuleProps> = ({
  patient,
  plan,
  onSave,
}) => {
  // State for nutrition plan
  const [currentPlan, setCurrentPlan] = useState<NutritionPlan>(
    plan || {
      id: `nutri-${patient.id}`,
      patientId: patient.id,
      date: '2026-07-11',
      nutritionist: patient.nutritionist || 'Dra. Juliana Mesa V.',
      nutritionistId: patient.nutritionistId || 'T.P. NUT-98421',
      targetObjective: 'Recomposición Corporal',
      basalMetabolicRateKcal: 1280,
      totalDailyEnergyExpenditureKcal: 1850,
      targetCaloriesKcal: 1720,
      macroTargets: {
        proteinPct: 28,
        proteinGrams: 120,
        carbsPct: 47,
        carbsGrams: 202,
        lipidsPct: 25,
        lipidsGrams: 48,
      },
      hydrationDailyLiters: 2.2,
      micronutrientAlerts: {
        calciumMg: 950,
        ironMg: 15.5,
        sodiumMg: 1650,
      },
      dailyBasketEstimatedCostCOP: 21900,
      monthlyBasketEstimatedCostCOP: 657000,
      generalIndications:
        'Plan estructurado con alimentos locales de la TCA 2018 para maximizar la síntesis proteica post-calistenia y mantener energía sostenida.',
      meals: [
        {
          mealTime: 'Desayuno',
          recommendedHour: '07:30 AM',
          clinicalTip: 'Priorizar hidratación y absorción de proteína magra.',
          entries: [],
        },
        {
          mealTime: 'Media Mañana',
          recommendedHour: '10:30 AM',
          clinicalTip: 'Snack previo a sesión de movilidad articular.',
          entries: [],
        },
        {
          mealTime: 'Almuerzo',
          recommendedHour: '01:30 PM',
          clinicalTip: 'Comida principal con carbohidratos complejos y micronutrientes.',
          entries: [],
        },
        {
          mealTime: 'Media Tarde',
          recommendedHour: '04:45 PM',
          clinicalTip: 'Volumen y fibra antes de la práctica de dominadas y fondos.',
          entries: [],
        },
        {
          mealTime: 'Cena',
          recommendedHour: '08:00 PM',
          clinicalTip: 'Cena ligera facilitadora del descanso y recuperación nocturna.',
          entries: [],
        },
      ],
    }
  );

  const [searchFoodQuery, setSearchFoodQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMealForAdd, setSelectedMealForAdd] = useState<MealTimeType>('Desayuno');
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Filtered food catalog
  const filteredTcaFoods = TCA_2018_DATABASE.filter((food) => {
    const matchesQuery =
      food.name.toLowerCase().includes(searchFoodQuery.toLowerCase()) ||
      food.category.toLowerCase().includes(searchFoodQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || food.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  // Calculate totals from meal entries
  const allEntries = currentPlan.meals.flatMap((m) => m.entries);
  const totalCalories = allEntries.reduce((acc, curr) => acc + curr.caloriesKcal, 0);
  const totalProteinG = Number(allEntries.reduce((acc, curr) => acc + curr.proteinG, 0).toFixed(1));
  const totalLipidsG = Number(allEntries.reduce((acc, curr) => acc + curr.lipidsG, 0).toFixed(1));
  const totalCarbsG = Number(allEntries.reduce((acc, curr) => acc + curr.carbsTotalG, 0).toFixed(1));
  const totalCostDailyCOP = allEntries.reduce((acc, curr) => acc + curr.estimatedCostCOP, 0);
  const totalCostMonthlyCOP = totalCostDailyCOP * 30;

  // Add food to meal
  const handleAddFoodToMeal = (food: TcaFoodItem, portionFactor: number = 1) => {
    const newEntry: MealFoodEntry = {
      id: `mfe-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      foodId: food.id,
      foodName: food.name,
      grams: Math.round(food.portionGrams * portionFactor),
      portionCount: Number(portionFactor.toFixed(2)),
      caloriesKcal: Math.round(food.caloriesKcal * portionFactor),
      proteinG: Number((food.proteinG * portionFactor).toFixed(1)),
      lipidsG: Number((food.lipidsG * portionFactor).toFixed(1)),
      carbsTotalG: Number((food.carbsTotalG * portionFactor).toFixed(1)),
      estimatedCostCOP: Math.round(food.estimatedPricePerPortionCOP * portionFactor),
    };

    setCurrentPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => {
        if (m.mealTime === selectedMealForAdd) {
          return {
            ...m,
            entries: [...m.entries, newEntry],
          };
        }
        return m;
      }),
    }));

    setShowAddFoodModal(false);
    setIsSaved(false);
  };

  // Remove food from meal
  const handleRemoveEntry = (mealTime: MealTimeType, entryId: string) => {
    setCurrentPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => {
        if (m.mealTime === mealTime) {
          return {
            ...m,
            entries: m.entries.filter((e) => e.id !== entryId),
          };
        }
        return m;
      }),
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
      {/* Top Header */}
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
                  Costeo en COP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Minuta individualizada basada en la Tabla de Composición de Alimentos de Colombia y costeo de canasta sugerida
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-add-food-modal"
              onClick={() => setShowAddFoodModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              Añadir Alimento TCA
            </button>

            <button
              id="btn-save-nutrition-plan"
              onClick={handleSavePlan}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all ${
                isSaved
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Plan Guardado' : 'Guardar Minuta'}
            </button>
          </div>
        </div>

        {/* Nutritional Summary Dashboard Ribbon */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Calorías */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-2xs text-slate-400 block font-semibold uppercase tracking-wider">
              Calorías / Meta
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-slate-900">{totalCalories}</span>
              <span className="text-2xs text-slate-500 font-bold">/ {currentPlan.targetCaloriesKcal} kcal</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalCalories / currentPlan.targetCaloriesKcal) * 100)}%` }}
              />
            </div>
          </div>

          {/* Proteína */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
            <span className="text-2xs text-blue-700 block font-semibold uppercase tracking-wider">
              Proteína (P)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-blue-900">{totalProteinG}g</span>
              <span className="text-2xs text-blue-600 font-bold">/ {currentPlan.macroTargets.proteinGrams}g</span>
            </div>
            <span className="text-3xs text-blue-700 block mt-1 font-medium">
              {patient.weightKg ? (totalProteinG / patient.weightKg).toFixed(1) : '2.2'} g/kg peso
            </span>
          </div>

          {/* Carbohidratos */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
            <span className="text-2xs text-amber-800 block font-semibold uppercase tracking-wider">
              Carbohidratos (C)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-amber-950">{totalCarbsG}g</span>
              <span className="text-2xs text-amber-700 font-bold">/ {currentPlan.macroTargets.carbsGrams}g</span>
            </div>
            <span className="text-3xs text-amber-750 block mt-1 font-medium">Energía glucolítica</span>
          </div>

          {/* Grasas / Lípidos */}
          <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-3">
            <span className="text-2xs text-orange-800 block font-semibold uppercase tracking-wider">
              Lípidos (G)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-orange-950">{totalLipidsG}g</span>
              <span className="text-2xs text-orange-700 font-bold">/ {currentPlan.macroTargets.lipidsGrams}g</span>
            </div>
            <span className="text-3xs text-orange-750 block mt-1 font-medium">Ácidos mono/poliinsaturados</span>
          </div>

          {/* Costo Diario COP (Innovación Financiera) */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3">
            <span className="text-2xs text-emerald-800 block font-bold uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-700" />
              Canasta Diaria
            </span>
            <div className="text-lg font-black text-emerald-950 mt-0.5">
              ${totalCostDailyCOP.toLocaleString('es-CO')}{' '}
              <span className="text-3xs font-semibold text-emerald-700">COP</span>
            </div>
            <span className="text-3xs text-emerald-700 block mt-1">Alimentos locales frescos</span>
          </div>

          {/* Costo Mensual Estimado */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
            <span className="text-2xs text-emerald-800 block font-bold uppercase tracking-wider flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-emerald-700" />
              Presupuesto Mes
            </span>
            <div className="text-lg font-black text-emerald-950 mt-0.5">
              ${totalCostMonthlyCOP.toLocaleString('es-CO')}{' '}
              <span className="text-3xs font-semibold text-emerald-700">COP</span>
            </div>
            <span className="text-3xs text-emerald-750 block mt-1">Base mensual estimada</span>
          </div>
        </div>
      </div>

      {/* Main Meal Planner Sections */}
      <div className="space-y-4">
        {currentPlan.meals.map((meal) => {
          const mealCalories = meal.entries.reduce((acc, curr) => acc + curr.caloriesKcal, 0);
          const mealProtein = meal.entries.reduce((acc, curr) => acc + curr.proteinG, 0);
          const mealCost = meal.entries.reduce((acc, curr) => acc + curr.estimatedCostCOP, 0);

          return (
            <div
              key={meal.mealTime}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
            >
              {/* Meal Header */}
              <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{meal.mealTime}</h3>
                      <span className="text-2xs text-slate-500 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {meal.recommendedHour}
                      </span>
                    </div>
                    {meal.clinicalTip && (
                      <p className="text-2xs text-slate-500">{meal.clinicalTip}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-slate-700">
                      <strong>{mealCalories}</strong> kcal
                    </span>
                    <span className="text-blue-700">
                      <strong>{mealProtein.toFixed(1)}g</strong> prot
                    </span>
                    <span className="text-emerald-800 font-bold">
                      ${mealCost.toLocaleString('es-CO')} COP
                    </span>
                  </div>

                  <button
                    id={`btn-add-to-${meal.mealTime}`}
                    onClick={() => {
                      setSelectedMealForAdd(meal.mealTime);
                      setShowAddFoodModal(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-2xs font-semibold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    Añadir alimento
                  </button>
                </div>
              </div>

              {/* Meal Food Entries Table */}
              <div className="p-3">
                {meal.entries.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No hay alimentos asignados a esta toma. Haz clic en "Añadir alimento" para seleccionar de la TCA 2018.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {meal.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">{entry.foodName}</div>
                          <div className="text-2xs text-slate-400">
                            Porción: {entry.grams}g ({entry.portionCount}x unidad estándar)
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="font-bold text-slate-900 block">{entry.caloriesKcal} kcal</span>
                            <span className="text-3xs text-slate-400">
                              P: {entry.proteinG}g • C: {entry.carbsTotalG}g • G: {entry.lipidsG}g
                            </span>
                          </div>

                          <div className="min-w-20 text-right">
                            <span className="font-bold text-emerald-700 block">
                              ${entry.estimatedCostCOP.toLocaleString('es-CO')}
                            </span>
                            <span className="text-3xs text-slate-400">COP</span>
                          </div>

                          <button
                            id={`btn-remove-entry-${entry.id}`}
                            onClick={() => handleRemoveEntry(meal.mealTime, entry.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="Eliminar alimento de la minuta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: TCA 2018 Food Selector */}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Apple className="w-4 h-4 text-emerald-600" />
                  Añadir alimento a: <span className="text-emerald-700">{selectedMealForAdd}</span>
                </h3>
                <p className="text-2xs text-slate-500">
                  Tabla de Composición de Alimentos de Colombia (TCA 2018) con costeo en COP
                </p>
              </div>
              <button
                onClick={() => setShowAddFoodModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                ✕
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar arepa, pollo, ahuyama, frijoles..."
                  value={searchFoodQuery}
                  onChange={(e) => setSearchFoodQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-hidden"
              >
                <option value="all">Todas las categorías</option>
                <option value="Cereales y Raíces">Cereales y Raíces</option>
                <option value="Carnes, Huevos y Leguminosas">Carnes y Leguminosas</option>
                <option value="Platos Típicos Tradicionales">Platos Típicos</option>
                <option value="Frutas y Verduras">Frutas y Verduras</option>
                <option value="Lácteos y Derivados">Lácteos</option>
                <option value="Grasas y Aceites">Grasas y Aceites</option>
              </select>
            </div>

            {/* Food List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {filteredTcaFoods.map((food) => (
                <div
                  key={food.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{food.name}</span>
                      <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {food.category}
                      </span>
                    </div>
                    <div className="text-2xs text-slate-500 mt-0.5">
                      Porción estándar: <strong>{food.servingPortionName}</strong> • {food.notes}
                    </div>
                    <div className="text-3xs text-slate-400 mt-0.5">
                      P: {food.proteinG}g • C: {food.carbsTotalG}g • G: {food.lipidsG}g • Calcio: {food.calciumMg}mg • Hierro: {food.ironMg}mg
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-800 block">
                      ${food.estimatedPricePerPortionCOP.toLocaleString('es-CO')} COP
                    </span>
                    <span className="text-3xs text-slate-400 block">{food.caloriesKcal} kcal</span>

                    <button
                      id={`btn-add-food-${food.id}`}
                      onClick={() => handleAddFoodToMeal(food, 1)}
                      className="mt-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-bold transition-all shadow-2xs"
                    >
                      + Añadir (1x)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
