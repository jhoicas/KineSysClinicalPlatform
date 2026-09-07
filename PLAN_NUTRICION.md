# Hoja de Ruta: Módulo de Nutrición Multi-Hardware KineSys

## Visión General
Arquitectura agnóstica de hardware con capacidad tri-modal (Manual ISAK, Withings Body Scan, InBody H40). El módulo centraliza la recolección de datos antropométricos y formula planes dietéticos calculando macros, micros y presupuesto financiero usando la TCA 2018 de Colombia.

---

### Fase 1: Arquitectura de Base de Datos (Data Layer)
**Objetivo:** Crear las tablas maestras en PostgreSQL/Supabase preparadas para Multi-Tenant y Multi-Hardware.

*   **Paso 1.1 - Evaluaciones Antropométricas:** Crear tabla `kinesys.nutrition_evaluations`.
    *   Campos: `id`, `tenant_id`, `patient_id`, `date`, `source` (ENUM: MANUAL_ISAK, WITHINGS, INBODY).
    *   Métricas Globales: `weight_kg`, `height_cm`, `body_fat_pct`, `visceral_fat_index`, `bmr`.
    *   JSONB: `measurements_json` (8 pliegues, perímetros, diámetros).
    *   JSONB: `segmental_composition_json` (Grasa/músculo en brazos, piernas, tronco).
    *   JSONB: `somatotype_json` (Endo, Meso, Ecto).
*   **Paso 1.2 - Planificación Dietética:** Crear tablas `diet_plans`, `diet_meals`, y `diet_items`.
    *   `diet_plans`: `tenant_id`, `patient_id`, `name`, `target_kcal`, `total_kcal`, `total_cost`.
    *   `diet_meals`: Relación a plan, `name` (Desayuno, Almuerzo), `order_index`.
    *   `diet_items`: Relación a meal, `food_id` (Catalogo TCA), `portion_g`.
*   **Paso 1.3 - RLS:** Aplicar Row Level Security para aislar datos por `tenant_id`.

---

### Fase 2: Motores de Cálculo Biofisiológico y Financiero (Backend - Business Logic)
**Objetivo:** Desarrollar los servicios en Node.js que procesarán las matemáticas detrás de la clínica y la dieta.

*   **Paso 2.1 - Motor Antropométrico (`AnthropometryService.ts/js`):**
    *   Implementar ecuaciones dinámicas de grasa corporal: *Jackson-Pollock* (3 y 7 pliegues) y *Faulkner* (4 pliegues).
    *   Implementar algoritmo de *Somatotipo de Heath-Carter* usando diámetros óseos y perímetros.
    *   Implementar calculadoras TMB (*Mifflin-St Jeor* y *Harris-Benedict*).
*   **Paso 2.2 - Motor Dietético y de Presupuesto (`DietPlannerService.ts/js`):**
    *   Crear función que reciba un arreglo de `diet_items`.
    *   Para cada item, hacer *join* con `kinesys.food_catalog`.
    *   Regla de tres para Macros: `(portion_g / 100) * nutrient_value`.
    *   Regla de tres para Costo Financiero: `(portion_g / purchase_unit) * purchase_price`.
    *   Retornar el total consolidado para actualizar la tabla `diet_plans`.

---

### Fase 3: Ecosistema Multi-Hardware (API Integrations)
**Objetivo:** Crear los adaptadores para ingerir datos automáticos cuando el profesional no use plicómetro.

*   **Paso 3.1 - Adaptador Withings (`WithingsAdapter.ts/js`):**
    *   Configurar flujo OAuth 2.0.
    *   Mapear los endpoints de *Fat Mass Segmental* y *Muscle Mass Segmental* hacia nuestro campo `segmental_composition_json`.
*   **Paso 3.2 - Adaptador InBody (`InBodyAdapter.ts/js`):**
    *   Crear el endpoint que reciba webhooks/archivos de LookinBody API o Health Connect.
    *   Mapear la Grasa Visceral y el DSM-BIA segmental hacia el mismo formato JSON genérico de la base de datos.
    *   *Regla de negocio:* Cuando los datos entren por Adaptador, el sistema ignora las ecuaciones de *Jackson-Pollock* (Paso 2.1) y usa el % de grasa del hardware.

---

### Fase 4: Interfaz de Usuario e Interacción (Frontend - UI/UX)
**Objetivo:** Construir el "Centro de Comando" del nutricionista en el cliente.

*   **Paso 4.1 - Tablero de Evaluación (Input Trim-modal):**
    *   Selector de origen: "Manual", "Sincronizar Withings", "Sincronizar InBody".
    *   Si es Manual: Mostrar formulario interactivo para ingresar pliegues, circunferencias y diámetros. Calcular en tiempo real.
    *   Si es Hardware: Mostrar botón "Obtener última lectura" y renderizar gráficos segmentales.
*   **Paso 4.2 - Creador de Dietas Drag & Drop (Ingeniería de Menús):**
    *   Interfaz con buscador conectado a `food_catalog`.
    *   Permitir arrastrar alimentos a distintas comidas (Desayuno, Almuerzo, etc.).
    *   Panel lateral flotante: Mostrar medidores en tiempo real de Kcal, Proteína, Carbohidratos, Grasas y el **Costo Total Estimado ($)** actualizándose con cada gramo ajustado.

---

### Fase 5: Consolidación y Reportes (Features Avanzados)
**Objetivo:** Entregables para el paciente.

*   **Paso 5.1 - Generador de PDF:** Crear un template de reporte unificado que se vea igual de profesional sin importar si los datos se tomaron con plicómetro manual o con InBody.
*   **Paso 5.2 - Lista de Mercado Inteligente:** A partir del plan dietético de 7 días, generar un PDF automático con la lista de supermercado para el paciente (agrupando ingredientes y mostrando el presupuesto total basado en la TCA 2018).