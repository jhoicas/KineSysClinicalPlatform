/**
 * DietBuilder — Fase 4.2 (PLAN_NUTRICION)
 * Ingeniería de menús: buscador TCA + comidas (estructura DnD) + panel de resumen.
 */
import React, { useMemo, useState } from 'react';
import { FoodItem } from '../../types';
import { FoodSearchCombobox } from './FoodSearchCombobox';

export type MealSlotId = 'desayuno' | 'media_manana' | 'almuerzo' | 'merienda' | 'cena';

export interface DietBuilderFoodRef {
  /** id del catálogo TCA */
  food_id: string;
  name: string;
  portion_g: number;
  energy_kcal: number | null;
  protein_g: number | null;
  lipids_g: number | null;
  carbs_total_g: number | null;
}

export interface DietMealSlot {
  id: MealSlotId;
  name: string;
  order_index: number;
  items: DietBuilderFoodRef[];
}

export interface DietBuilderProps {
  targetKcal?: number;
  targetProteinG?: number;
  targetCarbsG?: number;
  targetLipidsG?: number;
  initialMeals?: DietMealSlot[];
  readOnly?: boolean;
  onMealsChange?: (meals: DietMealSlot[]) => void;
  className?: string;
}

const DEFAULT_MEALS: DietMealSlot[] = [
  { id: 'desayuno', name: 'Desayuno', order_index: 0, items: [] },
  { id: 'media_manana', name: 'Media mañana', order_index: 1, items: [] },
  { id: 'almuerzo', name: 'Almuerzo', order_index: 2, items: [] },
  { id: 'merienda', name: 'Merienda', order_index: 3, items: [] },
  { id: 'cena', name: 'Cena', order_index: 4, items: [] },
];

function scale(portionG: number, per100: number | null | undefined): number {
  if (per100 == null || !Number.isFinite(per100) || !Number.isFinite(portionG) || portionG <= 0) return 0;
  return (portionG / 100) * per100;
}

function foodToRef(food: FoodItem, grams: number): DietBuilderFoodRef {
  return {
    food_id: food.id,
    name: food.name,
    portion_g: grams,
    energy_kcal: food.energy_kcal,
    protein_g: food.protein_g,
    lipids_g: food.lipids_g,
    carbs_total_g: food.carbs_total_g,
  };
}

function MacroBar({
  label,
  current,
  target,
  colorClass,
  unit = 'g',
}: {
  label: string;
  current: number;
  target: number;
  colorClass: string;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const over = target > 0 && current > target * 1.05;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold text-on-surface-variant">{label}</span>
        <span className={`text-[11px] font-black tabular-nums ${over ? 'text-amber-700' : 'text-on-surface'}`}>
          {current.toFixed(0)}
          {target > 0 ? ` / ${target.toFixed(0)}` : ''} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div className={`h-full rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const DietBuilder: React.FC<DietBuilderProps> = ({
  targetKcal = 2000,
  targetProteinG = 120,
  targetCarbsG = 220,
  targetLipidsG = 65,
  initialMeals,
  readOnly = false,
  onMealsChange,
  className = '',
}) => {
  const [meals, setMeals] = useState<DietMealSlot[]>(() =>
    initialMeals?.length ? initialMeals : DEFAULT_MEALS.map((m) => ({ ...m, items: [] }))
  );
  const [activeMealId, setActiveMealId] = useState<MealSlotId>('desayuno');
  const [dragFoodId, setDragFoodId] = useState<string | null>(null);
  const [dragFromMeal, setDragFromMeal] = useState<MealSlotId | null>(null);

  const commit = (next: DietMealSlot[]) => {
    setMeals(next);
    onMealsChange?.(next);
  };

  const addFoodToMeal = (mealId: MealSlotId, food: FoodItem, grams: number) => {
    if (readOnly) return;
    const ref = foodToRef(food, grams);
    commit(
      meals.map((m) => (m.id === mealId ? { ...m, items: [...m.items, ref] } : m))
    );
  };

  const updatePortion = (mealId: MealSlotId, index: number, portion_g: number) => {
    if (readOnly) return;
    commit(
      meals.map((m) => {
        if (m.id !== mealId) return m;
        return {
          ...m,
          items: m.items.map((it, i) => (i === index ? { ...it, portion_g } : it)),
        };
      })
    );
  };

  const removeItem = (mealId: MealSlotId, index: number) => {
    if (readOnly) return;
    commit(
      meals.map((m) =>
        m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== index) } : m
      )
    );
  };

  const moveItem = (fromMeal: MealSlotId, foodId: string, toMeal: MealSlotId) => {
    if (readOnly || fromMeal === toMeal) return;
    let moved: DietBuilderFoodRef | null = null;
    const without = meals.map((m) => {
      if (m.id !== fromMeal) return m;
      const idx = m.items.findIndex((it) => it.food_id === foodId);
      if (idx < 0) return m;
      moved = m.items[idx];
      return { ...m, items: m.items.filter((_, i) => i !== idx) };
    });
    if (!moved) return;
    commit(
      without.map((m) => (m.id === toMeal ? { ...m, items: [...m.items, moved as DietBuilderFoodRef] } : m))
    );
  };

  const totals = useMemo(() => {
    let kcal = 0;
    let protein = 0;
    let carbs = 0;
    let lipids = 0;
    for (const meal of meals) {
      for (const it of meal.items) {
        kcal += scale(it.portion_g, it.energy_kcal);
        protein += scale(it.portion_g, it.protein_g);
        carbs += scale(it.portion_g, it.carbs_total_g);
        lipids += scale(it.portion_g, it.lipids_g);
      }
    }
    return { kcal, protein, carbs, lipids };
  }, [meals]);

  const kcalPct = targetKcal > 0 ? Math.min(100, (totals.kcal / targetKcal) * 100) : 0;

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start ${className}`}>
      {/* Columna principal */}
      <div className="space-y-4 min-w-0">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Ingeniería de menús</p>
          <h2 className="text-lg font-black text-on-surface">Constructor de plan dietético</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Busca en la TCA, añade a cada tiempo de comida. Arrastra ítems entre comidas (HTML5 DnD).
          </p>
        </header>

        {/* Buscador → comida activa */}
        <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4 clinical-shadow space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant">Añadir a:</span>
            {meals.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={readOnly}
                onClick={() => setActiveMealId(m.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeMealId === m.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
          {!readOnly && (
            <FoodSearchCombobox
              onAddFood={(food, grams) => addFoodToMeal(activeMealId, food, grams)}
              placeholder="Buscar en catálogo TCA (ej. arroz, huevo, lenteja)…"
            />
          )}
        </div>

        {/* Comidas — drop zones */}
        <div className="space-y-3">
          {meals.map((meal) => {
            const mealKcal = meal.items.reduce((s, it) => s + scale(it.portion_g, it.energy_kcal), 0);
            return (
              <section
                key={meal.id}
                data-meal-id={meal.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const foodId = e.dataTransfer.getData('text/food-id') || dragFoodId;
                  const from = (e.dataTransfer.getData('text/from-meal') || dragFromMeal) as MealSlotId | null;
                  if (foodId && from) moveItem(from, foodId, meal.id);
                  setDragFoodId(null);
                  setDragFromMeal(null);
                }}
                className={`rounded-3xl border bg-surface-container-lowest clinical-shadow overflow-hidden ${
                  activeMealId === meal.id ? 'border-primary/50' : 'border-outline-variant/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-outline-variant/20 px-4 py-3 bg-surface-container-low/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">restaurant</span>
                    <h3 className="text-sm font-extrabold text-on-surface">{meal.name}</h3>
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {meal.items.length} ítem{meal.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="text-xs font-black tabular-nums text-on-surface">{mealKcal.toFixed(0)} kcal</span>
                </div>

                <ul className="divide-y divide-outline-variant/15 min-h-[72px]">
                  {meal.items.length === 0 ? (
                    <li className="px-4 py-6 text-center text-xs text-on-surface-variant">
                      Zona de soltar · añade alimentos desde el buscador o arrastra desde otra comida
                    </li>
                  ) : (
                    meal.items.map((item, index) => {
                      const rowKcal = scale(item.portion_g, item.energy_kcal);
                      return (
                        <li
                          key={`${meal.id}-${item.food_id}-${index}`}
                          draggable={!readOnly}
                          onDragStart={(e) => {
                            setDragFoodId(item.food_id);
                            setDragFromMeal(meal.id);
                            e.dataTransfer.setData('text/food-id', item.food_id);
                            e.dataTransfer.setData('text/from-meal', meal.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-container-low/40 cursor-grab active:cursor-grabbing"
                        >
                          <span className="material-symbols-outlined text-on-surface-variant text-base">drag_indicator</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              {rowKcal.toFixed(0)} kcal · P {scale(item.portion_g, item.protein_g).toFixed(1)}g · C{' '}
                              {scale(item.portion_g, item.carbs_total_g).toFixed(1)}g · L{' '}
                              {scale(item.portion_g, item.lipids_g).toFixed(1)}g
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              disabled={readOnly}
                              value={item.portion_g}
                              onChange={(e) => updatePortion(meal.id, index, Number(e.target.value) || 0)}
                              className="w-20 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-2 py-1.5 text-xs font-bold tabular-nums"
                            />
                            <span className="text-[10px] font-bold text-on-surface-variant">g</span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removeItem(meal.id, index)}
                                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-rose-50 hover:text-rose-600"
                                title="Quitar"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {/* Panel resumen fijo */}
      <aside className="xl:sticky xl:top-24 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 clinical-shadow space-y-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">monitoring</span>
          <h3 className="text-sm font-extrabold text-on-surface">Resumen del plan</h3>
        </div>

        {/* Calorías vs objetivo */}
        <div className="text-center rounded-2xl bg-surface-container-low px-4 py-4">
          <p className="text-[10px] font-bold uppercase text-on-surface-variant">Calorías totales</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-on-surface">{totals.kcal.toFixed(0)}</p>
          <p className="text-xs text-on-surface-variant">
            objetivo <span className="font-bold text-on-surface">{targetKcal}</span> kcal
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className={`h-full rounded-full transition-all ${kcalPct > 105 ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${kcalPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <MacroBar label="Proteína" current={totals.protein} target={targetProteinG} colorClass="bg-sky-500" />
          <MacroBar label="Carbohidratos" current={totals.carbs} target={targetCarbsG} colorClass="bg-emerald-500" />
          <MacroBar label="Lípidos" current={totals.lipids} target={targetLipidsG} colorClass="bg-violet-500" />
        </div>

        <p className="text-[10px] leading-relaxed text-on-surface-variant">
          Los totales se recalculan al cambiar gramos (calorías y macronutrientes).
        </p>
      </aside>
    </div>
  );
};

export default DietBuilder;
