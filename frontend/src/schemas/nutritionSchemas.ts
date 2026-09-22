import { z } from 'zod';

/**
 * Esquema de validación Zod para Evaluación Antropométrica
 */
export const anthropometryEvaluationSchema = z.object({
  // Parámetros Biométricos Base
  age: z
    .number({ message: 'Ingrese una edad válida.' })
    .int('La edad debe ser un número entero.')
    .min(1, 'La edad debe ser mayor a 0.')
    .max(120, 'La edad máxima permitida es 120 años.'),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Seleccione el sexo biológico.',
  }),
  weight_kg: z
    .number({ message: 'Ingrese el peso en kg.' })
    .min(20, 'El peso debe ser al menos 20 kg.')
    .max(300, 'El peso no puede exceder 300 kg.'),
  height_cm: z
    .number({ message: 'Ingrese la estatura en cm.' })
    .min(50, 'La estatura debe ser al menos 50 cm.')
    .max(250, 'La estatura no puede exceder 250 cm.'),
  activity_factor: z
    .number({ message: 'Seleccione el factor de actividad.' })
    .min(1.0, 'El factor de actividad debe ser al menos 1.0.')
    .max(2.5, 'El factor de actividad no puede exceder 2.5.'),

  // Pliegues Cutáneos Principales (Calibrador / Plicómetro en mm)
  skinfold_triceps_mm: z
    .number({ message: 'Ingrese el pliegue tricipital.' })
    .min(1, 'El pliegue tricipital debe ser al menos 1 mm.')
    .max(60, 'El pliegue no puede exceder 60 mm.'),
  skinfold_subscapular_mm: z
    .number({ message: 'Ingrese el pliegue subescapular.' })
    .min(1, 'El pliegue subescapular debe ser al menos 1 mm.')
    .max(60, 'El pliegue no puede exceder 60 mm.'),
  skinfold_suprailiac_mm: z
    .number({ message: 'Ingrese el pliegue suprailíaco.' })
    .min(1, 'El pliegue suprailíaco debe ser al menos 1 mm.')
    .max(60, 'El pliegue no puede exceder 60 mm.'),
  skinfold_abdominal_mm: z
    .number({ message: 'Ingrese el pliegue abdominal.' })
    .min(1, 'El pliegue abdominal debe ser al menos 1 mm.')
    .max(70, 'El pliegue no puede exceder 70 mm.'),

  // Pliegues Opcionales
  skinfold_biceps_mm: z
    .number()
    .min(0, 'El pliegue no puede ser negativo.')
    .max(50, 'El pliegue no puede exceder 50 mm.')
    .optional(),
  skinfold_thigh_mm: z
    .number()
    .min(0, 'El pliegue no puede ser negativo.')
    .max(60, 'El pliegue no puede exceder 60 mm.')
    .optional(),
  skinfold_calf_mm: z
    .number()
    .min(0, 'El pliegue no puede ser negativo.')
    .max(50, 'El pliegue no puede exceder 50 mm.')
    .optional(),

  // Perímetros Antropométricos (Cinta métrica en cm)
  waist_cm: z
    .number({ message: 'Ingrese el perímetro de cintura.' })
    .min(30, 'El perímetro de cintura debe ser al menos 30 cm.')
    .max(200, 'El perímetro de cintura no puede exceder 200 cm.'),
  hip_cm: z
    .number({ message: 'Ingrese el perímetro de cadera.' })
    .min(30, 'El perímetro de cadera debe ser al menos 30 cm.')
    .max(220, 'El perímetro de cadera no puede exceder 220 cm.'),
  relaxed_arm_cm: z
    .number()
    .min(10, 'El perímetro de brazo debe ser al menos 10 cm.')
    .max(70, 'El perímetro de brazo no puede exceder 70 cm.')
    .optional(),
  contracted_arm_cm: z
    .number()
    .min(10, 'El perímetro de brazo flexionado debe ser al menos 10 cm.')
    .max(75, 'El perímetro de brazo flexionado no puede exceder 75 cm.')
    .optional(),
  thigh_cm: z
    .number()
    .min(20, 'El perímetro de muslo debe ser al menos 20 cm.')
    .max(120, 'El perímetro de muslo no puede exceder 120 cm.')
    .optional(),
  calf_cm: z
    .number()
    .min(15, 'El perímetro de pantorrilla debe ser al menos 15 cm.')
    .max(80, 'El perímetro de pantorrilla no puede exceder 80 cm.')
    .optional(),
  neck_cm: z
    .number()
    .min(20, 'El perímetro de cuello debe ser al menos 20 cm.')
    .max(70, 'El perímetro de cuello no puede exceder 70 cm.')
    .optional(),

  // Observaciones Clínicas
  clinical_notes: z
    .string()
    .max(1000, 'Las notas clínicas no pueden exceder 1000 caracteres.')
    .optional(),
});

export type AnthropometryFormData = z.infer<typeof anthropometryEvaluationSchema>;

/**
 * Esquema de validación Zod para Formulación de Pauta Dietética
 */
export const dietPlanFormSchema = z.object({
  plan_name: z
    .string()
    .trim()
    .min(3, 'El nombre del plan debe tener al menos 3 caracteres.')
    .max(120, 'El nombre no puede exceder 120 caracteres.'),
  plan_type: z.enum(
    [
      'recomposicion',
      'deficit_controlado',
      'superavit_magro',
      'mantenimiento',
      'terapeutico_clinico',
      'dieta_dash',
      'blanda_gastrica',
    ],
    {
      message: 'Seleccione un tipo de abordaje válido.',
    }
  ),
  caloric_target_kcal: z
    .number({ message: 'Ingrese las calorías objetivo.' })
    .min(800, 'El requerimiento calórico mínimo es 800 kcal.')
    .max(6000, 'El requerimiento calórico no puede exceder 6000 kcal.'),
  protein_pct: z
    .number({ message: 'Ingrese el porcentaje de proteína.' })
    .min(5, 'El porcentaje de proteína mínimo es 5%.')
    .max(70, 'El porcentaje de proteína no puede superar 70%.'),
  carbs_pct: z
    .number({ message: 'Ingrese el porcentaje de carbohidratos.' })
    .min(5, 'El porcentaje de carbohidratos mínimo es 5%.')
    .max(85, 'El porcentaje de carbohidratos no puede superar 85%.'),
  fats_pct: z
    .number({ message: 'Ingrese el porcentaje de grasas.' })
    .min(5, 'El porcentaje de grasas mínimo es 5%.')
    .max(70, 'El porcentaje de grasas no puede superar 70%.'),
  hydration_target_liters: z
    .number()
    .min(0.5, 'La meta de hidratación mínima es 0.5 litros.')
    .max(10, 'La meta de hidratación no puede exceder 10 litros.')
    .optional(),
  notes_and_recommendations: z
    .string()
    .max(1500, 'Las recomendaciones no pueden exceder 1500 caracteres.')
    .optional(),
});

export type DietPlanFormData = z.infer<typeof dietPlanFormSchema>;

/**
 * Esquemas para los endpoints de Antropometría (Backend Go)
 */
export const somatotypeRequestSchema = z.object({
  triceps_mm: z.number().min(0),
  subscapular_mm: z.number().min(0),
  suprailiac_mm: z.number().min(0),
  medial_calf_mm: z.number().min(0).optional(),
  calf_cm: z.number().min(0).optional(),
  humerus_breadth_cm: z.number().min(0),
  femur_breadth_cm: z.number().min(0),
  flexed_arm_cm: z.number().min(0),
  height_cm: z.number().min(0),
  weight_kg: z.number().min(0),
});
export type SomatotypeRequest = z.infer<typeof somatotypeRequestSchema>;

export const somatotypeResultSchema = z.object({
  endomorphy: z.number(),
  mesomorphy: z.number(),
  ectomorphy: z.number(),
  x_axis: z.number(),
  y_axis: z.number(),
  category: z.string(),
});
export type SomatotypeResultDTO = z.infer<typeof somatotypeResultSchema>;

export const bmrRequestSchema = z.object({
  weight_kg: z.number().min(0),
  height_cm: z.number().min(0),
  age_years: z.number().min(0),
  gender: z.enum(['male', 'female', 'other']),
  equation: z.string().optional(),
});
export type BmrRequest = z.infer<typeof bmrRequestSchema>;

export const bmrResultSchema = z.object({
  bmr_kcal: z.number(),
  equation_used: z.string(),
});
export type BmrResultDTO = z.infer<typeof bmrResultSchema>;

export const compositionRequestSchema = z.object({
  method: z.string(),
  sex: z.enum(['male', 'female', 'other']),
  age_years: z.number().min(0),
  weight_kg: z.number().min(0).optional(),
  folds: z.object({
    chest: z.number().min(0).optional(),
    midaxillary: z.number().min(0).optional(),
    triceps: z.number().min(0),
    subscapular: z.number().min(0),
    abdomen: z.number().min(0),
    suprailiac: z.number().min(0),
    thigh: z.number().min(0).optional(),
  }),
});
export type CompositionRequest = z.infer<typeof compositionRequestSchema>;

export const bodyCompositionResultSchema = z.object({
  body_density: z.number(),
  fat_percentage: z.number(),
  fat_mass_kg: z.number(),
  fat_free_mass_kg: z.number(),
});
export type BodyCompositionResultDTO = z.infer<typeof bodyCompositionResultSchema>;

/**
 * Esquemas para los endpoints de Nutrición (Backend Go)
 */
export const calculateDietPlanRequestSchema = z.object({
  caloric_target_kcal: z.number().min(800).max(6000),
  protein_pct: z.number().min(0).max(100),
  carbs_pct: z.number().min(0).max(100),
  fats_pct: z.number().min(0).max(100),
});
export type CalculateDietPlanRequest = z.infer<typeof calculateDietPlanRequestSchema>;

export const dietPlanTotalsSchema = z.object({
  protein_grams: z.number(),
  carbs_grams: z.number(),
  fats_grams: z.number(),
  fiber_grams_estimated: z.number(),
  sodium_mg_estimated: z.number(),
  caloric_total: z.number(),
});
export type DietPlanTotalsDTO = z.infer<typeof dietPlanTotalsSchema>;

export const groceryPlanItemSchema = z.object({
  category: z.string(),
  name: z.string(),
  daily_portion_g: z.number(),
  purchase_unit: z.string(),
  price_per_unit_cop: z.number(),
});
export type GroceryPlanItemDTO = z.infer<typeof groceryPlanItemSchema>;

export const generateGroceryListRequestSchema = z.object({
  plan_items: z.array(groceryPlanItemSchema),
  days: z.number().min(1),
});
export type GenerateGroceryListRequest = z.infer<typeof generateGroceryListRequestSchema>;

export const groceryListLineSchema = z.object({
  category: z.string(),
  name: z.string(),
  total_grams_needed: z.number(),
  purchase_unit: z.string(),
  units_to_buy: z.number(),
  estimated_cost_cop: z.number(),
});
export type GroceryListLineDTO = z.infer<typeof groceryListLineSchema>;

export const smartGroceryListSchema = z.object({
  items: z.array(groceryListLineSchema),
  total_estimated_cost_cop: z.number(),
  days: z.number(),
});
export type SmartGroceryListDTO = z.infer<typeof smartGroceryListSchema>;
