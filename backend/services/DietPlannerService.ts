/**
 * DietPlannerService — Fase 2.2 (PLAN_NUTRICION)
 *
 * Consolida macros y presupuesto financiero de un plan dietético a partir de
 * ítems con porción (g) + fila del catálogo TCA (`food_catalog`).
 *
 * Reglas:
 * - Nutrientes (por 100 g): (portion_g / 100) * nutrient_value
 * - Costo: (portion_g / purchase_unit_g) * purchase_price  (si ambos existen)
 */

/** Subconjunto del catálogo TCA necesario para el motor dietético. */
export interface FoodCatalogNutrients {
  id?: string;
  name?: string;
  energy_kcal?: number | null;
  protein_g?: number | null;
  lipids_g?: number | null;
  carbs_total_g?: number | null;
  carbs_available_g?: number | null;
  dietary_fiber_g?: number | null;
  /** Unidad de compra en gramos (o cc ≈ g). Puede venir como número o texto ("500", "500 g"). */
  purchase_unit?: number | string | null;
  purchase_price?: number | null;
}

/** Ítem de dieta ya resuelto (join diet_items ⋈ food_catalog). */
export interface DietItemWithFood {
  id?: string;
  meal_id?: string;
  food_id?: string;
  portion_g: number;
  /** Alimento completo del catálogo TCA. */
  food: FoodCatalogNutrients;
}

export interface DietItemBreakdown {
  food_id?: string;
  food_name?: string;
  portion_g: number;
  energy_kcal: number;
  protein_g: number;
  lipids_g: number;
  carbs_g: number;
  fiber_g: number;
  /** null si faltan purchase_unit o purchase_price. */
  cost: number | null;
}

export interface DietPlanTotals {
  total_kcal: number;
  total_protein_g: number;
  total_lipids_g: number;
  total_carbs_g: number;
  total_fiber_g: number;
  /**
   * Costo estimado total ($). Solo suma ítems con costo calculable;
   * si ningún ítem tiene precio, queda en 0.
   */
  total_cost: number;
  /** true si al menos un ítem no pudo costearse por falta de datos de compra. */
  cost_incomplete: boolean;
  items: DietItemBreakdown[];
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function asFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value)
    .trim()
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  // Extrae el primer número de textos tipo "500g" / "500 g o cc"
  const match = s.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Escala un nutriente reportado por 100 g a la porción indicada.
 * Retorna 0 si el catálogo no reporta el valor (null/undefined).
 */
export function scaleNutrientPer100g(
  portionG: number,
  nutrientPer100g: number | null | undefined
): number {
  if (!Number.isFinite(portionG) || portionG <= 0) return 0;
  const v = asFiniteNumber(nutrientPer100g);
  if (v == null) return 0;
  return (portionG / 100) * v;
}

/**
 * Costo de una porción:
 * (portion_g / purchase_unit_g) * purchase_price
 * Retorna null si faltan datos de compra o la unidad es ≤ 0.
 */
export function estimateItemCost(
  portionG: number,
  food: Pick<FoodCatalogNutrients, 'purchase_unit' | 'purchase_price'>
): number | null {
  if (!Number.isFinite(portionG) || portionG <= 0) return null;

  const unitG = asFiniteNumber(food.purchase_unit);
  const price = asFiniteNumber(food.purchase_price);

  if (unitG == null || unitG <= 0 || price == null || price < 0) {
    return null;
  }

  return (portionG / unitG) * price;
}

/**
 * Calcula el desglose y los totales consolidados de una lista de diet_items.
 * Pensado para actualizar `diet_plans.total_kcal` y `diet_plans.total_cost`.
 */
export function calculateDietPlanTotals(items: DietItemWithFood[]): DietPlanTotals {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total_kcal: 0,
      total_protein_g: 0,
      total_lipids_g: 0,
      total_carbs_g: 0,
      total_fiber_g: 0,
      total_cost: 0,
      cost_incomplete: false,
      items: [],
    };
  }

  const breakdown: DietItemBreakdown[] = [];
  let totalKcal = 0;
  let totalProtein = 0;
  let totalLipids = 0;
  let totalCarbs = 0;
  let totalFiber = 0;
  let totalCost = 0;
  let costIncomplete = false;

  for (const item of items) {
    const portion = Number(item.portion_g);
    if (!Number.isFinite(portion) || portion <= 0) {
      throw new Error(
        `portion_g inválido para food_id=${item.food_id ?? item.food?.id ?? '?'}: ${item.portion_g}`
      );
    }

    const food = item.food ?? {};
    // Preferir CHO disponibles si existen; si no, totales TCA.
    const carbsSource =
      food.carbs_available_g != null ? food.carbs_available_g : food.carbs_total_g;

    const energy = scaleNutrientPer100g(portion, food.energy_kcal);
    const protein = scaleNutrientPer100g(portion, food.protein_g);
    const lipids = scaleNutrientPer100g(portion, food.lipids_g);
    const carbs = scaleNutrientPer100g(portion, carbsSource);
    const fiber = scaleNutrientPer100g(portion, food.dietary_fiber_g);
    const cost = estimateItemCost(portion, food);

    if (cost == null) {
      costIncomplete = true;
    } else {
      totalCost += cost;
    }

    totalKcal += energy;
    totalProtein += protein;
    totalLipids += lipids;
    totalCarbs += carbs;
    totalFiber += fiber;

    breakdown.push({
      food_id: item.food_id ?? food.id,
      food_name: food.name,
      portion_g: round(portion, 2),
      energy_kcal: round(energy, 2),
      protein_g: round(protein, 2),
      lipids_g: round(lipids, 2),
      carbs_g: round(carbs, 2),
      fiber_g: round(fiber, 2),
      cost: cost == null ? null : round(cost, 2),
    });
  }

  return {
    total_kcal: round(totalKcal, 2),
    total_protein_g: round(totalProtein, 2),
    total_lipids_g: round(totalLipids, 2),
    total_carbs_g: round(totalCarbs, 2),
    total_fiber_g: round(totalFiber, 2),
    total_cost: round(totalCost, 2),
    cost_incomplete: costIncomplete,
    items: breakdown,
  };
}

/** Payload listo para upsert parcial de `kinesys.diet_plans`. */
export function toDietPlanUpdatePayload(totals: DietPlanTotals): {
  total_kcal: number;
  total_cost: number;
} {
  return {
    total_kcal: totals.total_kcal,
    total_cost: totals.total_cost,
  };
}

export const DietPlannerService = {
  scaleNutrientPer100g,
  estimateItemCost,
  calculateDietPlanTotals,
  toDietPlanUpdatePayload,
} as const;

export default DietPlannerService;
