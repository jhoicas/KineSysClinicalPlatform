/**
 * GroceryListService — Fase 5.2 (PLAN_NUTRICION)
 * Espejo frontend del servicio en `backend/services/GroceryListService.ts`
 * para que el PDF (jsPDF) pueda consolidar la canasta en el cliente.
 *
 * Consolida ítems de un plan diario en una lista de mercado inteligente
 * para N días, agrupando por food_id y costando con precios TCA 2018.
 */

export interface GroceryPlanItem {
  food_id: string;
  name?: string;
  /** Porción en gramos de UNA jornada (suma de todas las comidas del día). */
  portion_g: number;
  purchase_unit?: number | string | null;
  purchase_price?: number | null;
  /** Categoría opcional para ordenar (ej. proteína, cereal). */
  category?: string | null;
}

export interface GroceryListLine {
  food_id: string;
  name: string;
  category: string | null;
  daily_portion_g: number;
  total_grams: number;
  purchase_unit_g: number | null;
  purchase_price: number | null;
  units_to_buy: number | null;
  line_cost: number | null;
  purchase_grams_rounded: number | null;
}

export interface SmartGroceryList {
  days: number;
  item_count: number;
  lines_with_price: number;
  lines_missing_price: number;
  grand_total: number;
  currency_note: string;
  lines: GroceryListLine[];
  generated_at: string;
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function parsePurchaseUnitGrams(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  const match = String(raw)
    .trim()
    .replace(',', '.')
    .match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asPrice(raw: number | null | undefined): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function generateSmartGroceryList(
  planItems: GroceryPlanItem[],
  days = 7
): SmartGroceryList {
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('days debe ser un entero ≥ 1.');
  }
  const periodDays = Math.floor(days);

  const byFood = new Map<
    string,
    {
      name: string;
      category: string | null;
      daily_portion_g: number;
      purchase_unit: number | string | null | undefined;
      purchase_price: number | null | undefined;
    }
  >();

  for (const item of planItems) {
    if (!item?.food_id) continue;
    const portion = Number(item.portion_g);
    if (!Number.isFinite(portion) || portion <= 0) continue;

    const prev = byFood.get(item.food_id);
    if (!prev) {
      byFood.set(item.food_id, {
        name: (item.name || item.food_id).trim(),
        category: item.category?.trim() || null,
        daily_portion_g: portion,
        purchase_unit: item.purchase_unit,
        purchase_price: item.purchase_price,
      });
    } else {
      prev.daily_portion_g += portion;
      if (!prev.name && item.name) prev.name = item.name.trim();
      if (!prev.category && item.category) prev.category = item.category.trim();
      if (prev.purchase_unit == null && item.purchase_unit != null) {
        prev.purchase_unit = item.purchase_unit;
      }
      if (prev.purchase_price == null && item.purchase_price != null) {
        prev.purchase_price = item.purchase_price;
      }
    }
  }

  const lines: GroceryListLine[] = [];
  let grandTotal = 0;
  let withPrice = 0;
  let missingPrice = 0;

  for (const [food_id, agg] of byFood.entries()) {
    const totalGrams = round(agg.daily_portion_g * periodDays, 1);
    const unitG = parsePurchaseUnitGrams(agg.purchase_unit);
    const price = asPrice(agg.purchase_price ?? null);

    let unitsToBuy: number | null = null;
    let lineCost: number | null = null;
    let purchaseGramsRounded: number | null = null;

    if (unitG != null && price != null) {
      unitsToBuy = Math.max(1, Math.ceil(totalGrams / unitG));
      purchaseGramsRounded = round(unitsToBuy * unitG, 1);
      lineCost = round(unitsToBuy * price, 2);
      grandTotal += lineCost;
      withPrice += 1;
    } else if (unitG != null && price == null) {
      unitsToBuy = Math.max(1, Math.ceil(totalGrams / unitG));
      purchaseGramsRounded = round(unitsToBuy * unitG, 1);
      missingPrice += 1;
    } else if (price != null && unitG == null) {
      lineCost = round((totalGrams / 100) * price, 2);
      grandTotal += lineCost;
      withPrice += 1;
    } else {
      missingPrice += 1;
    }

    lines.push({
      food_id,
      name: agg.name,
      category: agg.category,
      daily_portion_g: round(agg.daily_portion_g, 1),
      total_grams: totalGrams,
      purchase_unit_g: unitG,
      purchase_price: price,
      units_to_buy: unitsToBuy,
      line_cost: lineCost,
      purchase_grams_rounded: purchaseGramsRounded,
    });
  }

  lines.sort((a, b) => {
    const ca = (a.category || 'zzz').localeCompare(b.category || 'zzz', 'es');
    if (ca !== 0) return ca;
    return a.name.localeCompare(b.name, 'es');
  });

  return {
    days: periodDays,
    item_count: lines.length,
    lines_with_price: withPrice,
    lines_missing_price: missingPrice,
    grand_total: round(grandTotal, 2),
    currency_note: 'COP / moneda de purchase_price en TCA 2018',
    lines,
    generated_at: new Date().toISOString(),
  };
}

export const GroceryListService = {
  parsePurchaseUnitGrams,
  generateSmartGroceryList,
} as const;

export default GroceryListService;
