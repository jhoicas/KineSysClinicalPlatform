import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PacienteClinico, EvaluacionAntropometrica } from '../../types';
import {
  calculateMifflinStJeor,
  calculateWaistHipRatio,
  calculateBodyFatFromSkinfolds,
} from '../../utils/nutritionCalculations';
import { AnthropometryPdfModal } from './AnthropometryPdfModal';
import { AnthropometryProgressTimeline } from './AnthropometryProgressTimeline';
import { downloadAnthropometryPdf } from '../../utils/anthropometryPdfExport';
import {
  anthropometryEvaluationSchema,
  AnthropometryFormData,
} from '../../schemas/nutritionSchemas';

interface AnthropometryEvaluationModuleProps {
  patient: PacienteClinico;
  historyEvaluations?: EvaluacionAntropometrica[];
  nutritionistId: string;
  nutritionistName?: string;
  clinicName?: string;
  tenantId: string;
  onSaveEvaluation: (record: EvaluacionAntropometrica) => Promise<void>;
  onGoToDietPlanner?: (savedEvaluation: EvaluacionAntropometrica) => void;
}

export const AnthropometryEvaluationModule: React.FC<AnthropometryEvaluationModuleProps> = ({
  patient,
  historyEvaluations = [],
  nutritionistId,
  nutritionistName = 'Lic. Nutrición Clínica',
  clinicName = 'KineSys Salud - Centro Clínico & Nutricional',
  tenantId,
  onSaveEvaluation,
  onGoToDietPlanner,
}) => {
  // Module sub-tab: 'calculador' (Active Form) or 'progreso' (Timeline & Historical Progress)
  const [moduleTab, setModuleTab] = useState<'calculador' | 'progreso'>('calculador');

  // Filter historical evaluations belonging to this patient
  const patientHistory = historyEvaluations.filter((e) => e.patient_id === patient.id);

  // Calculate approximate age from birth date
  const birthYear = patient.birth_date ? new Date(patient.birth_date).getFullYear() : 1990;
  const initialAge = Math.max(18, new Date().getFullYear() - birthYear);
  const initialGender = patient.gender === 'female' ? 'female' : 'male';

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AnthropometryFormData>({
    resolver: zodResolver(anthropometryEvaluationSchema),
    defaultValues: {
      age: initialAge,
      gender: initialGender,
      weight_kg: initialGender === 'male' ? 78.0 : 62.4,
      height_cm: initialGender === 'male' ? 175 : 167,
      activity_factor: 1.375,
      skinfold_triceps_mm: initialGender === 'male' ? 14.5 : 16.0,
      skinfold_subscapular_mm: initialGender === 'male' ? 18.0 : 14.5,
      skinfold_suprailiac_mm: initialGender === 'male' ? 19.5 : 15.0,
      skinfold_abdominal_mm: initialGender === 'male' ? 22.0 : 17.5,
      skinfold_biceps_mm: 8.5,
      skinfold_thigh_mm: 16.0,
      skinfold_calf_mm: 11.0,
      waist_cm: initialGender === 'male' ? 88 : 70,
      hip_cm: initialGender === 'male' ? 98 : 96,
      relaxed_arm_cm: 32.0,
      contracted_arm_cm: 34.5,
      thigh_cm: 56.0,
      calf_cm: 37.0,
      neck_cm: 38.0,
      clinical_notes:
        'Evaluación antropométrica computacional. Paciente con buena disposición física. Se observa distribución de adiposidad troncal con pliegues subescapular y abdominal prominentes.',
    },
    mode: 'onChange',
  });

  // Watch form fields in real-time for instant thermodynamic calculations
  const formValues = watch();

  const watchedWeight = formValues.weight_kg || 70;
  const watchedHeight = formValues.height_cm || 170;
  const watchedAge = formValues.age || initialAge;
  const watchedGender = formValues.gender || 'male';
  const watchedActivityFactor = formValues.activity_factor || 1.375;

  const watchedTriceps = formValues.skinfold_triceps_mm || 0;
  const watchedSubscapular = formValues.skinfold_subscapular_mm || 0;
  const watchedSuprailiac = formValues.skinfold_suprailiac_mm || 0;
  const watchedAbdominal = formValues.skinfold_abdominal_mm || 0;

  const watchedWaist = formValues.waist_cm || 80;
  const watchedHip = formValues.hip_cm || 95;
  const watchedNotes = formValues.clinical_notes || '';

  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isQuickDownloading, setIsQuickDownloading] = useState(false);
  const [loadedBaseDate, setLoadedBaseDate] = useState<string | null>(null);

  // Update form defaults when patient changes
  useEffect(() => {
    if (patient) {
      const pYear = patient.birth_date ? new Date(patient.birth_date).getFullYear() : 1990;
      const calculatedAge = Math.max(18, new Date().getFullYear() - pYear);
      const calculatedGender = patient.gender === 'female' ? 'female' : 'male';
      setValue('age', calculatedAge);
      setValue('gender', calculatedGender);
      setLoadedBaseDate(null);
    }
  }, [patient, setValue]);

  // Handler to load a previous evaluation into the calculator form
  const handleLoadEvaluationIntoCalculator = (ev: EvaluacionAntropometrica) => {
    reset({
      weight_kg: ev.weight_kg || (ev.gender === 'male' ? 78.0 : 62.4),
      height_cm: ev.height_cm || (ev.gender === 'male' ? 175 : 167),
      age: ev.age || initialAge,
      gender: (ev.gender as 'male' | 'female') || 'male',
      activity_factor: ev.activity_factor || 1.375,
      skinfold_triceps_mm: ev.skinfold_triceps_mm ?? 14.5,
      skinfold_subscapular_mm: ev.skinfold_subscapular_mm ?? 18.0,
      skinfold_suprailiac_mm: ev.skinfold_suprailiac_mm ?? 19.5,
      skinfold_abdominal_mm: ev.skinfold_abdominal_mm ?? 22.0,
      skinfold_biceps_mm: ev.skinfold_biceps_mm ?? 8.5,
      skinfold_thigh_mm: ev.skinfold_thigh_mm ?? 16.0,
      skinfold_calf_mm: ev.skinfold_calf_mm ?? 11.0,
      waist_cm: ev.waist_cm ?? 88,
      hip_cm: ev.hip_cm ?? 98,
      relaxed_arm_cm: ev.relaxed_arm_cm ?? 32.0,
      contracted_arm_cm: ev.contracted_arm_cm ?? 34.5,
      thigh_cm: ev.thigh_cm ?? 56.0,
      calf_cm: ev.calf_cm ?? 37.0,
      neck_cm: ev.neck_cm ?? 38.0,
      clinical_notes: `Control de seguimiento basado en la evaluación del ${ev.evaluation_date}. Ajuste de medidas antropométricas y respuesta al plan alimentario.`,
    });
    setLoadedBaseDate(ev.evaluation_date);
    setModuleTab('calculador');
  };

  // LIVE COMPUTATIONS
  // 1. BMI
  const heightM = (watchedHeight || 170) / 100;
  const bmi = parseFloat(((watchedWeight || 70) / (heightM * heightM)).toFixed(1));
  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: 'Bajo peso', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (val < 25) return { label: 'Normopeso', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (val < 30) return { label: 'Sobrepeso', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { label: 'Obesidad', color: 'text-red-700 bg-red-50 border-red-200' };
  };
  const bmiCategory = getBmiCategory(bmi);

  // 2. Mifflin-St Jeor BMR & TDEE
  const { bmr, tdee, formula_breakdown } = calculateMifflinStJeor({
    weight_kg: watchedWeight,
    height_cm: watchedHeight,
    age: watchedAge,
    gender: watchedGender,
    activity_factor: watchedActivityFactor,
  });

  // 3. Skinfold Body Fat % & Body Composition (Durnin-Womersley / Siri)
  const { bodyFatPct, fatMassKg, leanMassKg, sumSkinfolds } = calculateBodyFatFromSkinfolds(
    {
      triceps: watchedTriceps,
      subscapular: watchedSubscapular,
      suprailiac: watchedSuprailiac,
      abdominal: watchedAbdominal,
    },
    watchedAge,
    watchedGender,
    watchedWeight
  );

  // 4. Waist-to-Hip Ratio (WHR) & Cardio Risk
  const whrResult = calculateWaistHipRatio(watchedWaist, watchedHip, watchedGender);

  // Current evaluation record object for live PDF export
  const currentEvaluationRecord: Partial<EvaluacionAntropometrica> = {
    patient_id: patient.id,
    nutritionist_id: nutritionistId,
    tenant_id: tenantId,
    evaluation_date: new Date().toISOString().split('T')[0],
    age: watchedAge,
    gender: watchedGender,
    weight_kg: watchedWeight,
    height_cm: watchedHeight,
    activity_factor: watchedActivityFactor,
    skinfold_triceps_mm: watchedTriceps,
    skinfold_subscapular_mm: watchedSubscapular,
    skinfold_suprailiac_mm: watchedSuprailiac,
    skinfold_abdominal_mm: watchedAbdominal,
    skinfold_biceps_mm: formValues.skinfold_biceps_mm,
    skinfold_thigh_mm: formValues.skinfold_thigh_mm,
    skinfold_calf_mm: formValues.skinfold_calf_mm,
    waist_cm: watchedWaist,
    hip_cm: watchedHip,
    relaxed_arm_cm: formValues.relaxed_arm_cm,
    contracted_arm_cm: formValues.contracted_arm_cm,
    thigh_cm: formValues.thigh_cm,
    calf_cm: formValues.calf_cm,
    neck_cm: formValues.neck_cm,
    bmi,
    bmr_kcal: bmr,
    tdee_kcal: tdee,
    waist_hip_ratio: whrResult.ratio,
    body_fat_percentage: bodyFatPct,
    fat_mass_kg: fatMassKg,
    fat_free_mass_kg: leanMassKg,
    cardiovascular_risk_level: whrResult.risk_level,
    clinical_notes: watchedNotes,
  };

  const handleQuickDownloadPdf = () => {
    setIsQuickDownloading(true);
    try {
      downloadAnthropometryPdf({
        patient,
        evaluation: currentEvaluationRecord,
        historyEvaluations: patientHistory,
        includeHistory: patientHistory.length > 0,
        nutritionistName,
        clinicName,
      });
    } finally {
      setTimeout(() => setIsQuickDownloading(false), 1500);
    }
  };

  const onValidSubmit = async (data: AnthropometryFormData) => {
    try {
      const record: EvaluacionAntropometrica = {
        id: `antropo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tenant_id: tenantId,
        patient_id: patient.id,
        nutritionist_id: nutritionistId,
        evaluation_date: new Date().toISOString().split('T')[0],
        age: data.age,
        gender: data.gender,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        activity_factor: data.activity_factor,
        skinfold_triceps_mm: data.skinfold_triceps_mm,
        skinfold_subscapular_mm: data.skinfold_subscapular_mm,
        skinfold_suprailiac_mm: data.skinfold_suprailiac_mm,
        skinfold_abdominal_mm: data.skinfold_abdominal_mm,
        skinfold_biceps_mm: data.skinfold_biceps_mm,
        skinfold_thigh_mm: data.skinfold_thigh_mm,
        skinfold_calf_mm: data.skinfold_calf_mm,
        waist_cm: data.waist_cm,
        hip_cm: data.hip_cm,
        relaxed_arm_cm: data.relaxed_arm_cm,
        contracted_arm_cm: data.contracted_arm_cm,
        thigh_cm: data.thigh_cm,
        calf_cm: data.calf_cm,
        neck_cm: data.neck_cm,
        bmi,
        bmr_kcal: bmr,
        tdee_kcal: tdee,
        waist_hip_ratio: whrResult.ratio,
        body_fat_percentage: bodyFatPct,
        fat_mass_kg: fatMassKg,
        fat_free_mass_kg: leanMassKg,
        cardiovascular_risk_level: whrResult.risk_level,
        clinical_notes: data.clinical_notes || '',
        created_at: new Date().toISOString(),
      };

      await onSaveEvaluation(record);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (onGoToDietPlanner) {
          onGoToDietPlanner(record);
        }
      }, 1500);
    } catch (err) {
      console.error('Error saving anthropometric evaluation:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Banner */}
      <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center font-black text-base border border-primary-fixed-dim shadow-2xs">
            {patient.first_name[0]}
            {patient.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-on-surface">
                {patient.first_name} {patient.last_name}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-mono font-bold">
                {patient.identifier_type}: {patient.identifier_number}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Género: <strong>{watchedGender === 'male' ? 'Masculino' : 'Femenino'}</strong> • Edad:{' '}
              <strong>{watchedAge} años</strong> • Grupo Sanguíneo: <strong>{patient.blood_type || 'O+'}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModuleTab(moduleTab === 'calculador' ? 'progreso' : 'calculador')}
            className="px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-extrabold text-xs rounded-xl border border-outline-variant/40 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-base text-primary">
              {moduleTab === 'calculador' ? 'timeline' : 'edit_note'}
            </span>
            <span>
              {moduleTab === 'calculador'
                ? `Ver Historial (${patientHistory.length})`
                : 'Volver al Calculador'}
            </span>
          </button>

          <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-xs font-bold rounded-xl border border-secondary-fixed-dim flex items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-sm">calculate</span>
            <span>Mifflin-St Jeor</span>
          </span>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-primary font-extrabold text-xs rounded-xl border border-outline-variant/40 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            title="Previsualizar y exportar informe PDF para el paciente"
          >
            <span className="material-symbols-outlined text-base text-primary">picture_as_pdf</span>
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Sub-module Navigation: Active Calculator vs Historical Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/30">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setModuleTab('calculador')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              moduleTab === 'calculador'
                ? 'bg-primary text-white shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">edit_note</span>
            <span>Evaluación Activa & Calculador</span>
          </button>

          <button
            onClick={() => setModuleTab('progreso')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              moduleTab === 'progreso'
                ? 'bg-primary text-white shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">timeline</span>
            <span>Historial, Tabla & Línea de Tiempo</span>
            {patientHistory.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  moduleTab === 'progreso'
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {patientHistory.length}
              </span>
            )}
          </button>
        </div>

        {loadedBaseDate && moduleTab === 'calculador' && (
          <div className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs animate-fade-in">
            <span className="material-symbols-outlined text-sm">history</span>
            <span>Valores cargados desde el control histórico del {loadedBaseDate}</span>
          </div>
        )}
      </div>

      {moduleTab === 'progreso' ? (
        <AnthropometryProgressTimeline
          patient={patient}
          evaluations={patientHistory}
          nutritionistName={nutritionistName}
          clinicName={clinicName}
          onLoadIntoCalculator={handleLoadEvaluationIntoCalculator}
          onOpenNewEvaluation={() => setModuleTab('calculador')}
        />
      ) : (
        /* Main Grid: Form Left, Thermodynamic Live Dashboard Right */
        <form onSubmit={handleSubmit(onValidSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Anthropometric Measurements Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Biometrics & Activity */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
              <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">scale</span>
                <span>1. Parámetros Biométricos & Nivel de Actividad</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">
                    Peso Actual (kg)*
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('weight_kg', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.weight_kg ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.weight_kg && (
                    <span className="text-[10px] text-error font-bold mt-1 block flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {errors.weight_kg.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">
                    Estatura (cm)*
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('height_cm', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.height_cm ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.height_cm && (
                    <span className="text-[10px] text-error font-bold mt-1 block flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {errors.height_cm.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">
                    Edad (Años)*
                  </label>
                  <input
                    type="number"
                    {...register('age', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.age ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.age && (
                    <span className="text-[10px] text-error font-bold mt-1 block flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {errors.age.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Sexo Biológico</label>
                  <select
                    {...register('gender')}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-2 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  >
                    <option value="male">Masculino (+5)</option>
                    <option value="female">Femenino (-161)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 text-xs">
                  Factor de Actividad Física (PAL / TDEE Multiplier)
                </label>
                <select
                  {...register('activity_factor', { valueAsNumber: true })}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                >
                  <option value={1.2}>Sedentario (x1.2) - Poco o ningún ejercicio / Trabajo de escritorio</option>
                  <option value={1.375}>Actividad Ligera (x1.375) - Ejercicio liviano 1-3 días/semana</option>
                  <option value={1.55}>Actividad Moderada (x1.55) - Ejercicio moderado 3-5 días/semana</option>
                  <option value={1.725}>Actividad Intensa (x1.725) - Entrenamiento duro 6-7 días/semana</option>
                  <option value={1.9}>Atleta de Alto Rendimiento (x1.9) - 2 entrenamientos diarios / Trabajo físico pesado</option>
                </select>
              </div>
            </div>

            {/* Section 2: Skinfold Caliper Measurements (Pliegues Cutáneos) */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">straighten</span>
                  <span>2. Pliegues Cutáneos (Calibrador / Plicómetro en mm)</span>
                </h3>
                <span className="text-[11px] font-mono font-bold text-on-secondary-fixed bg-secondary-fixed px-2 py-0.5 rounded-md border border-secondary-fixed-dim">
                  Σ 4 Pliegues = {sumSkinfolds} mm
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Tríceps (mm)*</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('skinfold_triceps_mm', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.skinfold_triceps_mm ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.skinfold_triceps_mm && (
                    <span className="text-[10px] text-error font-bold mt-1 block">
                      {errors.skinfold_triceps_mm.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Subescapular (mm)*</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('skinfold_subscapular_mm', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.skinfold_subscapular_mm ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.skinfold_subscapular_mm && (
                    <span className="text-[10px] text-error font-bold mt-1 block">
                      {errors.skinfold_subscapular_mm.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Suprailíaco (mm)*</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('skinfold_suprailiac_mm', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.skinfold_suprailiac_mm ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.skinfold_suprailiac_mm && (
                    <span className="text-[10px] text-error font-bold mt-1 block">
                      {errors.skinfold_suprailiac_mm.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Abdominal (mm)*</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('skinfold_abdominal_mm', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.skinfold_abdominal_mm ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.skinfold_abdominal_mm && (
                    <span className="text-[10px] text-error font-bold mt-1 block">
                      {errors.skinfold_abdominal_mm.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Bíceps (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('skinfold_biceps_mm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Muslo Medial (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('skinfold_thigh_mm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Pantorrilla (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('skinfold_calf_mm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Body Circumferences (Perímetros Corporales) */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
              <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">architecture</span>
                <span>3. Perímetros Antropométricos (Cinta métrica en cm)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Cintura (cm)*</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('waist_cm', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.waist_cm ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.waist_cm && (
                    <span className="text-[10px] text-error font-bold mt-1 block">
                      {errors.waist_cm.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Cadera (cm)*</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('hip_cm', { valueAsNumber: true })}
                    className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      errors.hip_cm ? 'border-error ring-1 ring-error/50 bg-error/5' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.hip_cm && (
                    <span className="text-[10px] text-error font-bold mt-1 block">
                      {errors.hip_cm.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Brazo Relajado (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('relaxed_arm_cm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Brazo Flexionado (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('contracted_arm_cm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Muslo Medial (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('thigh_cm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Pantorrilla (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('calf_cm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Cuello (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('neck_cm', { valueAsNumber: true })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Clinical Observations */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-2">
              <label className="block text-xs font-black text-on-surface uppercase tracking-wider">
                Juicio Clínico Nutricional & Observaciones Antropométricas
              </label>
              <textarea
                rows={3}
                {...register('clinical_notes')}
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl p-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary leading-relaxed"
                placeholder="Describa el somatotipo, evolución de pliegues y conclusiones..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-primary font-extrabold text-xs rounded-2xl border border-outline-variant/40 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                  title="Generar informe imprimible en PDF con datos clínicos y firma"
                >
                  <span className="material-symbols-outlined text-base text-primary">picture_as_pdf</span>
                  <span>Informe Paciente (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDownloadPdf}
                  disabled={isQuickDownloading}
                  className="px-3 py-2.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-bold text-xs rounded-2xl border border-outline-variant/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Descarga rápida directa del archivo PDF"
                >
                  <span className="material-symbols-outlined text-base">
                    {isQuickDownloading ? 'downloading' : 'download'}
                  </span>
                  <span>{isQuickDownloading ? 'Generando...' : 'Descarga Rápida'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs font-extrabold text-on-secondary-fixed bg-secondary-fixed px-3 py-1.5 rounded-xl border border-secondary-fixed-dim flex items-center gap-1 shadow-2xs">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>¡Evaluación guardada exitosamente!</span>
                  </span>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">
                    {isSubmitting ? 'hourglass_top' : 'save'}
                  </span>
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar Evaluación & Calcular'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Metabolic & Thermodynamic Computations Dashboard (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: BMR & TDEE (Mifflin-St Jeor) */}
            <div className="bg-gradient-to-br from-primary to-primary-container text-white p-6 rounded-3xl clinical-shadow space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary-fixed/20 px-2.5 py-1 rounded-full text-primary-fixed border border-primary-fixed/30">
                  Termodinámica Metabólica
                </span>
                <span className="material-symbols-outlined text-primary-fixed">bolt</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-xs">
                  <span className="text-[11px] text-primary-fixed-dim font-bold block">
                    Tasa Metabólica Basal (BMR)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black tracking-tight">{bmr}</span>
                    <span className="text-xs text-primary-fixed font-bold">kcal/día</span>
                  </div>
                  <span className="text-[10px] text-primary-fixed/80 font-mono mt-1 block">
                    Mifflin-St Jeor
                  </span>
                </div>

                <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-xs">
                  <span className="text-[11px] text-primary-fixed-dim font-bold block">
                    Gasto Energético Total (TDEE)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black tracking-tight text-primary-fixed">{tdee}</span>
                    <span className="text-xs text-primary-fixed font-bold">kcal/día</span>
                  </div>
                  <span className="text-[10px] text-primary-fixed/80 font-mono mt-1 block">
                    PAL = x{watchedActivityFactor}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-black/20 rounded-2xl border border-white/10 text-[11px] font-mono text-primary-fixed leading-relaxed">
                <strong>Desglose Ecuación:</strong> {formula_breakdown}
              </div>
            </div>

            {/* Card 2: Body Composition Breakdown (Grasa vs Masa Magra) */}
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
              <h4 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">pie_chart</span>
                  <span>Composición Tisular (4 Pliegues)</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-on-surface-variant">
                  Durnin & Womersley
                </span>
              </h4>

              {/* Visual Fat vs Lean Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-tertiary flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim inline-block"></span>
                    <span>
                      Masa Grasa: {bodyFatPct}% ({fatMassKg} kg)
                    </span>
                  </span>
                  <span className="text-secondary flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block"></span>
                    <span>
                      Masa Magra: {(100 - bodyFatPct).toFixed(1)}% ({leanMassKg} kg)
                    </span>
                  </span>
                </div>

                <div className="w-full h-4 bg-surface-container-high rounded-full overflow-hidden flex border border-outline-variant/30">
                  <div
                    style={{ width: `${bodyFatPct}%` }}
                    className="h-full bg-gradient-to-r from-tertiary-fixed-dim to-tertiary transition-all duration-500"
                  ></div>
                  <div
                    style={{ width: `${100 - bodyFatPct}%` }}
                    className="h-full bg-gradient-to-r from-secondary-fixed-dim to-secondary transition-all duration-500"
                  ></div>
                </div>
              </div>

              {/* Metric Tiles */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant block">
                    Índice Masa Corporal (IMC)
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-on-surface">{bmi}</span>
                    <span className="text-[10px] text-on-surface-variant font-bold">kg/m²</span>
                  </div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${bmiCategory.color}`}
                  >
                    {bmiCategory.label}
                  </span>
                </div>

                <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant block">
                    Índice Cintura/Cadera (ICC)
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-on-surface">{whrResult.ratio}</span>
                    <span className="text-[10px] text-on-surface-variant font-bold">ratio</span>
                  </div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      whrResult.risk_level === 'bajo'
                        ? 'text-on-secondary-fixed bg-secondary-fixed border-secondary-fixed-dim'
                        : whrResult.risk_level === 'moderado'
                        ? 'text-tertiary bg-tertiary-fixed border-tertiary-fixed-dim'
                        : 'text-on-error-container bg-error-container border-error/30'
                    }`}
                  >
                    Riesgo: {whrResult.risk_level.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Bridge to Diet Planner */}
            <div className="p-4 bg-primary-fixed/30 rounded-3xl border border-primary-fixed-dim text-xs text-on-primary-fixed flex items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <span className="font-extrabold text-on-primary-fixed block">
                  ¿Listo para formular la dieta?
                </span>
                <p className="text-[11px] text-on-primary-fixed-variant">
                  Usa el gasto energético total calculado (<strong>{tdee} kcal</strong>) para calibrar el
                  déficit o superávit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleSubmit(onValidSubmit)();
                }}
                className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap shadow-xs transition-colors"
              >
                Ir al Planificador →
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Anthropometry PDF Export & Delivery Modal */}
      <AnthropometryPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        patient={patient}
        evaluation={currentEvaluationRecord}
        historyEvaluations={patientHistory}
        nutritionistName={nutritionistName}
        clinicName={clinicName}
      />
    </div>
  );
};
