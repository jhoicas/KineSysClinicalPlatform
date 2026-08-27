/**
 * Utilidades de cálculo metabólico, termodinámico y antropométrico
 * - Ecuación de Mifflin-St Jeor (BMR)
 * - TDEE (Gasto Energético Total Diario)
 * - Composición corporal por pliegues cutáneos (Durnin-Womersley / Siri)
 * - Índice Cintura-Cadera (WHR) y Riesgo Cardiovascular
 */

export interface BmrCalculationParams {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activity_factor?: number; // 1.2, 1.375, 1.55, 1.725, 1.9
}

export interface AnthropometryInputs {
  skinfold_triceps_mm: number;
  skinfold_subscapular_mm: number;
  skinfold_suprailiac_mm: number;
  skinfold_abdominal_mm: number;
  skinfold_biceps_mm?: number;
  waist_cm: number;
  hip_cm: number;
}

/**
 * Cálculo de Tasa Metabólica Basal (BMR / TMB) con la Ecuación de Mifflin-St Jeor
 * Hombres: (10 × peso_kg) + (6.25 × talla_cm) - (5 × edad) + 5
 * Mujeres: (10 × peso_kg) + (6.25 × talla_cm) - (5 × edad) - 161
 */
export function calculateMifflinStJeor(params: BmrCalculationParams): {
  bmr: number;
  tdee: number;
  formula_breakdown: string;
} {
  const { weight_kg, height_cm, age, gender, activity_factor = 1.375 } = params;

  let base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  let bmr = 0;

  if (gender === 'male') {
    bmr = Math.round(base + 5);
  } else {
    // Para female y other por defecto
    bmr = Math.round(base - 161);
  }

  // Protección de límites fisiológicos
  if (isNaN(bmr) || bmr < 500) bmr = 1200;

  const tdee = Math.round(bmr * activity_factor);

  const formula_breakdown =
    gender === 'male'
      ? `(10 × ${weight_kg} kg) + (6.25 × ${height_cm} cm) - (5 × ${age} años) + 5 = ${bmr} kcal/día`
      : `(10 × ${weight_kg} kg) + (6.25 × ${height_cm} cm) - (5 × ${age} años) - 161 = ${bmr} kcal/día`;

  return { bmr, tdee, formula_breakdown };
}

/**
 * Cálculo de Índice Cintura-Cadera (WHR) y clasificación de riesgo OMS
 */
export function calculateWaistHipRatio(waist_cm: number, hip_cm: number, gender: 'male' | 'female' | 'other'): {
  ratio: number;
  risk_level: 'bajo' | 'moderado' | 'alto' | 'muy_alto';
  description: string;
} {
  if (!hip_cm || hip_cm <= 0) {
    return { ratio: 0, risk_level: 'bajo', description: 'Datos insuficientes' };
  }

  const ratio = parseFloat((waist_cm / hip_cm).toFixed(2));

  if (gender === 'male') {
    if (ratio < 0.90) return { ratio, risk_level: 'bajo', description: 'Riesgo cardiovascular bajo (Distribución ginecoide/normal)' };
    if (ratio <= 0.99) return { ratio, risk_level: 'moderado', description: 'Riesgo cardiovascular moderado' };
    return { ratio, risk_level: 'alto', description: 'Riesgo cardiovascular alto / Obesidad androide' };
  } else {
    if (ratio < 0.80) return { ratio, risk_level: 'bajo', description: 'Riesgo cardiovascular bajo (Distribución ginecoide/normal)' };
    if (ratio <= 0.85) return { ratio, risk_level: 'moderado', description: 'Riesgo cardiovascular moderado' };
    return { ratio, risk_level: 'alto', description: 'Riesgo cardiovascular alto / Obesidad androide' };
  }
}

/**
 * Estimación de % de Grasa Corporal mediante sumatoria de 4 pliegues (Durnin & Womersley / Siri)
 * Pliegues: Tríceps, Subescapular, Supraespinal/Suprailíaco, Abdominal (o Bíceps)
 */
export function calculateBodyFatFromSkinfolds(
  skinfolds: {
    triceps: number;
    subscapular: number;
    suprailiac: number;
    abdominal: number;
  },
  age: number,
  gender: 'male' | 'female' | 'other',
  weight_kg: number
): {
  bodyFatPct: number;
  fatMassKg: number;
  leanMassKg: number;
  sumSkinfolds: number;
} {
  const sum = (skinfolds.triceps || 0) + (skinfolds.subscapular || 0) + (skinfolds.suprailiac || 0) + (skinfolds.abdominal || 0);

  if (sum <= 0 || weight_kg <= 0) {
    return { bodyFatPct: 20, fatMassKg: weight_kg * 0.2, leanMassKg: weight_kg * 0.8, sumSkinfolds: 0 };
  }

  const logSum = Math.log10(sum);
  let density = 1.15;

  // Ecuaciones de Durnin & Womersley por grupos etarios
  if (gender === 'male') {
    if (age < 30) {
      density = 1.1631 - 0.0632 * logSum;
    } else if (age < 50) {
      density = 1.1422 - 0.0544 * logSum;
    } else {
      density = 1.1295 - 0.0489 * logSum;
    }
  } else {
    if (age < 30) {
      density = 1.1599 - 0.0717 * logSum;
    } else if (age < 50) {
      density = 1.1423 - 0.0632 * logSum;
    } else {
      density = 1.1333 - 0.0612 * logSum;
    }
  }

  // Ecuación de Siri: % Grasa = (4.95 / Densidad - 4.50) * 100
  let bodyFatPct = (4.95 / density - 4.5) * 100;

  // Ajustes de límites fisiológicos
  if (bodyFatPct < 4) bodyFatPct = 4;
  if (bodyFatPct > 65) bodyFatPct = 65;

  bodyFatPct = parseFloat(bodyFatPct.toFixed(1));
  const fatMassKg = parseFloat(((weight_kg * bodyFatPct) / 100).toFixed(1));
  const leanMassKg = parseFloat((weight_kg - fatMassKg).toFixed(1));

  return {
    bodyFatPct,
    fatMassKg,
    leanMassKg,
    sumSkinfolds: parseFloat(sum.toFixed(1)),
  };
}

/**
 * Convierte distribución de macronutrientes porcentuales a gramos según calorías meta
 * Proteína: 4 kcal/g | Carbohidratos: 4 kcal/g | Grasas: 9 kcal/g
 */
export function convertMacroPctToGrams(
  caloric_target: number,
  protein_pct: number,
  carbs_pct: number,
  fats_pct: number
): {
  protein_grams: number;
  carbs_grams: number;
  fats_grams: number;
  total_pct: number;
  protein_kcal: number;
  carbs_kcal: number;
  fats_kcal: number;
} {
  const protein_kcal = (caloric_target * (protein_pct / 100));
  const carbs_kcal = (caloric_target * (carbs_pct / 100));
  const fats_kcal = (caloric_target * (fats_pct / 100));

  const protein_grams = Math.round(protein_kcal / 4);
  const carbs_grams = Math.round(carbs_kcal / 4);
  const fats_grams = Math.round(fats_kcal / 9);

  return {
    protein_grams,
    carbs_grams,
    fats_grams,
    total_pct: protein_pct + carbs_pct + fats_pct,
    protein_kcal: Math.round(protein_kcal),
    carbs_kcal: Math.round(carbs_kcal),
    fats_kcal: Math.round(fats_kcal),
  };
}
