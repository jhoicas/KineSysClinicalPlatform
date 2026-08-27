import React, { useState, useEffect } from 'react';
import { PacienteClinico, ConsultaSOP, Icd10Diagnosis, VitalSignsObservation } from '../../types';

interface SoapEditorModuleProps {
  patient: PacienteClinico;
  doctorId: string;
  tenantId: string;
  onSaveSoap: (record: ConsultaSOP) => Promise<void>;
  onGoToPrescription?: (patient: PacienteClinico, encounterId?: string) => void;
}

// Common ICD-10 codes in primary and general medical care
const COMMON_ICD10_CATALOG = [
  { code: 'M54.5', description: 'Lumbago no especificado / Dolor lumbar mecánico' },
  { code: 'I10', description: 'Hipertensión esencial (primaria)' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin mención de complicación' },
  { code: 'J00', description: 'Rinofaringitis aguda (resfriado común)' },
  { code: 'J02.9', description: 'Faringitis aguda, no especificada' },
  { code: 'K21.9', description: 'Enfermedad por reflujo gastroesofágico sin esofagitis' },
  { code: 'M25.5', description: 'Dolor articular (Artralgia)' },
  { code: 'M75.1', description: 'Síndrome del manguito rotador' },
  { code: 'R51', description: 'Cefalea' },
  { code: 'Z00.0', description: 'Examen médico general de rutina (Chequeo preventivo)' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada' },
  { code: 'E66.0', description: 'Obesidad debida a exceso de calorías' },
];

export const SoapEditorModule: React.FC<SoapEditorModuleProps> = ({
  patient,
  doctorId,
  tenantId,
  onSaveSoap,
  onGoToPrescription,
}) => {
  // Encounter metadata
  const [encounterType, setEncounterType] = useState<ConsultaSOP['encounter_type']>('control');
  const [encounterDate, setEncounterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // S - Subjetivo
  const [chiefComplaint, setChiefComplaint] = useState(
    'Control médico por cuadro de dolor lumbar de 3 semanas de evolución que aumenta al estar sentado.'
  );
  const [currentIllness, setCurrentIllness] = useState(
    'Paciente refiere inicio insidioso de dolor sordo en región lumbar baja (L4-S1), intensidad EVA 5/10, sin irradiación radicular ni parestesias en extremidades inferiores.'
  );
  const [reviewOfSystems, setReviewOfSystems] = useState('Sin fiebre, sin compromiso esfinteriano. Apetito y sueño conservados.');
  const [pastHistory, setPastHistory] = useState(patient.chronic_conditions.join(', ') || 'Sin antecedentes relevantes.');

  // O - Objetivo: Signos Vitales
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [heartRate, setHeartRate] = useState<number>(72);
  const [respRate, setRespRate] = useState<number>(16);
  const [tempCelsius, setTempCelsius] = useState<number>(36.6);
  const [satO2, setSatO2] = useState<number>(98);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [heightCm, setHeightCm] = useState<number>(170);

  // O - Objetivo: Examen Físico
  const [physicalExamGeneral, setPhysicalExamGeneral] = useState(
    'Paciente en buenas condiciones generales, orientado en tiempo, espacio y persona. Normolíneo, bien hidratado y perfundido.'
  );
  const [cardiopulmonaryExam, setCardiopulmonaryExam] = useState(
    'Tórax simétrico, ruidos cardiacos rítmicos en 2 tiempos sin soplos audibles. Murmullo vesicular conservado bilateralmente sin ruidos agregados.'
  );
  const [musculoskeletalExam, setMusculoskeletalExam] = useState(
    'Columna lumbar con contractura paravertebral bilateral moderada. Dolor a la palpación sobre apófisis espinosas L4-L5. Flexoextensión con rango ligeramente limitado por dolor. Maniobra de Lasègue y Bragard negativas bilateralmente.'
  );

  // A - Análisis: Diagnósticos CIE-10
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<Icd10Diagnosis[]>([
    { code: 'M54.5', description: 'Lumbago no especificado / Dolor lumbar mecánico', type: 'primary' },
  ]);
  const [customIcdQuery, setCustomIcdQuery] = useState('');
  const [clinicalReasoning, setClinicalReasoning] = useState(
    'Cuadro clínico compatible con síndrome doloroso lumbar de origen miofascial y mecánico, sin signos de alarma neurológica aguda (banderas rojas negativas).'
  );
  const [prognosis, setPrognosis] = useState<'favorable' | 'reservado' | 'desfavorable'>('favorable');

  // P - Plan
  const [treatmentGoals, setTreatmentGoals] = useState(
    'Alivio sintomático del dolor, desinflamación miofascial y fortalecimiento muscular lumbopélvico.'
  );
  const [labOrders, setLabOrders] = useState<string>('Hemograma completo, PCR ultrasensible, Perfil lipídico');
  const [imagingOrders, setImagingOrders] = useState<string>('Radiografía de columna lumbosacra AP y Lateral con flexión/extensión');
  const [referrals, setReferrals] = useState<string>('Fisioterapia y Rehabilitación Física (10 sesiones)');
  const [patientInstructions, setPatientInstructions] = useState(
    'Aplicar calor local seco 20 min 2 veces al día. Evitar levantamiento de cargas pesadas mayor a 5 kg. Realizar pausas activas cada 45 minutos de trabajo de escritorio.'
  );
  const [followUpDays, setFollowUpDays] = useState<number>(14);
  const [alarmSigns, setAlarmSigns] = useState(
    'Consultar a urgencias si presenta pérdida de fuerza súbita en piernas, adormecimiento en silla de montar o incontinencia esfinteriana.'
  );

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [savedEncounterId, setSavedEncounterId] = useState<string | null>(null);

  // Auto calculate BMI
  const bmi = heightCm > 0 ? Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)) : 0;

  // Clinical Quick Templates for fast documentation
  const applyTemplate = (templateName: string) => {
    if (templateName === 'lumbago') {
      setChiefComplaint('Dolor lumbar mecánico post-esfuerzo físico.');
      setCurrentIllness('Paciente refiere dolor en región lumbosacra irradiado a glúteo derecho sin pasar de rodilla. Empeora con bipedestación.');
      setPhysicalExamGeneral('Buen estado general. Marcha antiálgica leve.');
      setMusculoskeletalExam('Contractura paravertebral L3-S1. Lasègue negativo. Reflejos osteotendinosos rotuliano y aquiliano conservados.');
      setSelectedDiagnoses([{ code: 'M54.5', description: 'Lumbago no especificado / Dolor lumbar mecánico', type: 'primary' }]);
      setClinicalReasoning('Lumbago agudo mecánico no complicado. Sin banderas rojas.');
      setTreatmentGoals('Manejo analgésico de rescate y derivación a kinesiología motora.');
      setLabOrders('');
      setImagingOrders('Rx Columna Lumbosacra AP y Lateral');
      setReferrals('Kinesiología y Fisioterapia (10 sesiones)');
    } else if (templateName === 'hta_control') {
      setChiefComplaint('Control periódico de Hipertensión Arterial.');
      setCurrentIllness('Paciente asintomático cardiovascular. Refiere buena adherencia a terapia farmacológica y control diario en domicilio.');
      setSystolic(125);
      setDiastolic(82);
      setHeartRate(70);
      setPhysicalExamGeneral('Paciente lúcido, afebril, sin edema en extremidades inferiores.');
      setCardiopulmonaryExam('Ruidos cardiacos regulares, R1 y R2 normofonéticos. Sin tercer ruido ni soplos.');
      setSelectedDiagnoses([{ code: 'I10', description: 'Hipertensión esencial (primaria)', type: 'primary' }]);
      setClinicalReasoning('Hipertensión arterial estadio 1 compensada con adecuado control tensional.');
      setTreatmentGoals('Mantener cifras tensionales <130/80 mmHg y reducir riesgo cardiovascular.');
      setLabOrders('Perfil Bioquímico, Creatinina, Electrolitos plasmáticos, Microalbuminuria');
      setImagingOrders('Electrocardiograma basal de 12 derivaciones');
      setReferrals('Nutrición (Pauta hiposódica)');
    } else if (templateName === 'respiratorio') {
      setChiefComplaint('Rinorrea hialina, odinofagia y tos seca de 3 días.');
      setCurrentIllness('Inicio con congestión nasal y estornudos, agregándose ardor faríngeo y febrícula no cuantificada.');
      setTempCelsius(37.4);
      setSatO2(99);
      setHeartRate(80);
      setPhysicalExamGeneral('Paciente hidratado. Orofaringe con eritema difuso sin exudado pultáceo ni hipertrofia amigdalina.');
      setCardiopulmonaryExam('Pulmones limpios, murmullo vesicular presente simétrico bilateral sin crépitos.');
      setSelectedDiagnoses([{ code: 'J00', description: 'Rinofaringitis aguda (resfriado común)', type: 'primary' }]);
      setClinicalReasoning('Infección de vías respiratorias superiores de etiología viral probable. Manejo puramente sintomático.');
      setTreatmentGoals('Alivio de la congestión y odinofagia. Hidratación abundante.');
      setLabOrders('');
      setImagingOrders('');
      setReferrals('');
      setPatientInstructions('Reposo relativo, hidratación de al menos 2 litros diarios, lavado nasal con solución salina.');
    } else if (templateName === 'chequeo') {
      setChiefComplaint('Chequeo médico preventivo anual de salud.');
      setCurrentIllness('Paciente sin molestias activas. Desea evaluar perfil metabólico y cardiovascular para práctica deportiva.');
      setSelectedDiagnoses([{ code: 'Z00.0', description: 'Examen médico general de rutina (Chequeo preventivo)', type: 'primary' }]);
      setClinicalReasoning('Adulto sano en chequeo preventivo periódico.');
      setLabOrders('Hemograma completo, Perfil Lipídico, Glicemia en ayunas, TSH, Uroanálisis');
      setImagingOrders('Electrocardiograma en reposo');
      setReferrals('');
    }
  };

  const handleAddDiagnosis = (item: { code: string; description: string }) => {
    if (selectedDiagnoses.some((d) => d.code === item.code)) return;
    const isFirst = selectedDiagnoses.length === 0;
    setSelectedDiagnoses([
      ...selectedDiagnoses,
      { code: item.code, description: item.description, type: isFirst ? 'primary' : 'secondary' },
    ]);
  };

  const handleRemoveDiagnosis = (code: string) => {
    setSelectedDiagnoses(selectedDiagnoses.filter((d) => d.code !== code));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setShowSuccessBanner(false);

    try {
      const encounterId = `soap_${Date.now()}`;
      const record: ConsultaSOP = {
        id: encounterId,
        tenant_id: tenantId,
        patient_id: patient.id,
        practitioner_id: doctorId,
        encounter_type: encounterType,
        encounter_date: encounterDate,
        subjective: {
          chief_complaint: chiefComplaint,
          current_illness_history: currentIllness,
          review_of_systems: reviewOfSystems,
          past_medical_history: pastHistory,
        },
        objective: {
          vitals: {
            blood_pressure_systolic: Number(systolic),
            blood_pressure_diastolic: Number(diastolic),
            heart_rate_bpm: Number(heartRate),
            respiratory_rate_rpm: Number(respRate),
            temp_celsius: Number(tempCelsius),
            oxygen_saturation_pct: Number(satO2),
            weight_kg: Number(weightKg),
            height_cm: Number(heightCm),
            bmi,
          },
          physical_exam: physicalExamGeneral,
          cardiopulmonary_exam: cardiopulmonaryExam,
          musculoskeletal_exam: musculoskeletalExam,
        },
        assessment: {
          diagnoses: selectedDiagnoses,
          clinical_reasoning: clinicalReasoning,
          prognosis,
        },
        plan: {
          treatment_goals: treatmentGoals,
          lab_orders: labOrders ? labOrders.split(',').map((s) => s.trim()) : [],
          imaging_orders: imagingOrders ? imagingOrders.split(',').map((s) => s.trim()) : [],
          referrals: referrals ? referrals.split(',').map((s) => s.trim()) : [],
          patient_instructions: patientInstructions,
          follow_up_days: Number(followUpDays),
          alarm_signs: alarmSigns,
        },
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      await onSaveSoap(record);
      setSavedEncounterId(encounterId);
      setShowSuccessBanner(true);
    } catch (err) {
      console.error('Error saving SOAP encounter:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-fadeIn">
      {/* Patient Clinical Banner */}
      <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-base">
            {patient.first_name[0]}
            {patient.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-on-surface">
                {patient.first_name} {patient.last_name}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-bold">
                {patient.identifier_type}: {patient.identifier_number}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Edad: <strong>30 años</strong> • Sexo: <strong>{patient.gender === 'female' ? 'Femenino' : 'Masculino'}</strong> • Grupo Sanguíneo: <strong className="text-primary">{patient.blood_type || 'O+'}</strong>
            </p>
          </div>
        </div>

        {/* Allergy Alert Tag */}
        <div className="flex items-center gap-2">
          {patient.known_allergies.length > 0 && !patient.known_allergies.includes('Ninguna') ? (
            <div className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-black flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-red-600">warning</span>
              <span>ALERGIAS: {patient.known_allergies.join(', ')}</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
              <span>Sin alergias conocidas</span>
            </div>
          )}
        </div>
      </div>

      {/* Burnout-Prevention Quick Clinical Templates */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">bolt</span>
          <span className="text-xs font-black text-on-surface">Plantillas Clínicas Rápidas (1-Click):</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyTemplate('lumbago')}
            className="px-3 py-1 bg-surface-container-high hover:bg-primary hover:text-white text-on-surface text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Lumbago Mecánico
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('hta_control')}
            className="px-3 py-1 bg-surface-container-high hover:bg-primary hover:text-white text-on-surface text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Control HTA
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('respiratorio')}
            className="px-3 py-1 bg-surface-container-high hover:bg-primary hover:text-white text-on-surface text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Infección Respiratoria
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('chequeo')}
            className="px-3 py-1 bg-surface-container-high hover:bg-primary hover:text-white text-on-surface text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Chequeo Preventivo
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccessBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
            <div>
              <h4 className="font-extrabold text-sm">¡Evolución SOAP Guardada en Supabase!</h4>
              <p className="text-xs text-emerald-800">
                La consulta ha quedado vinculada al paciente bajo el estándar FHIR Encounter/Composition.
              </p>
            </div>
          </div>
          {onGoToPrescription && (
            <button
              type="button"
              onClick={() => onGoToPrescription(patient, savedEncounterId || undefined)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">medication</span>
              <span>Ir a Prescribir Receta</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* S - SUBJETIVO (Anamnesis, Motivo, Historia de la Enfermedad Actual)       */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 clinical-shadow">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 font-black text-sm flex items-center justify-center">
              S
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-on-surface">Subjetivo (Anamnesis & Motivo de Consulta)</h3>
              <p className="text-[11px] text-on-surface-variant">Relato del paciente, síntomas referidos y antecedentes</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="font-bold text-on-surface-variant">Tipo de Encuentro:</label>
            <select
              value={encounterType}
              onChange={(e) => setEncounterType(e.target.value as any)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-2.5 py-1 text-xs font-bold text-on-surface cursor-pointer"
            >
              <option value="primera_vez">Primera Consulta</option>
              <option value="control">Control Periódico</option>
              <option value="urgencia_menor">Urgencia Menor</option>
              <option value="teleconsulta">Teleconsulta</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-black uppercase text-on-surface-variant mb-1">
              Motivo de Consulta (Chief Complaint) *
            </label>
            <input
              type="text"
              required
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Ej: Dolor lumbar irradiado, control de hipertensión, etc."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-bold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-black uppercase text-on-surface-variant mb-1">
              Historia de la Enfermedad Actual (HPI)
            </label>
            <textarea
              rows={3}
              value={currentIllness}
              onChange={(e) => setCurrentIllness(e.target.value)}
              placeholder="Cronología de síntomas, intensidad (EVA), factores agravantes y atenuantes..."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Revisión por Sistemas (ROS)</label>
              <input
                type="text"
                value={reviewOfSystems}
                onChange={(e) => setReviewOfSystems(e.target.value)}
                placeholder="Sin síntomas constitucionales, afebril..."
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Antecedentes Médicos / Familiares</label>
              <input
                type="text"
                value={pastHistory}
                onChange={(e) => setPastHistory(e.target.value)}
                placeholder="Hipertensión, Diabetes, Cirugías previas..."
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* O - OBJETIVO (Constantes Vitales + Examen Físico Segmentario)              */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-5 clinical-shadow">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
            O
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-on-surface">Objetivo (Signos Vitales & Examen Físico)</h3>
            <p className="text-[11px] text-on-surface-variant">Constantes biomédicas y hallazgos a la exploración física</p>
          </div>
        </div>

        {/* Vital Signs Grid */}
        <div>
          <span className="text-[11px] font-black uppercase text-on-surface-variant block mb-2">
            Constantes Vitales (Triaje)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            {/* Presión Sistólica / Diastólica */}
            <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30">
              <label className="block text-[10px] font-bold text-on-surface-variant">Presión Art. (PA)</label>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(Number(e.target.value))}
                  className="w-12 bg-surface-container-lowest p-1 rounded font-bold text-center text-xs"
                />
                <span>/</span>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(Number(e.target.value))}
                  className="w-12 bg-surface-container-lowest p-1 rounded font-bold text-center text-xs"
                />
              </div>
              <span className="text-[9px] text-on-surface-variant">mmHg</span>
            </div>

            {/* FC */}
            <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30">
              <label className="block text-[10px] font-bold text-on-surface-variant">Frec. Cardíaca</label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(Number(e.target.value))}
                className="w-full bg-surface-container-lowest p-1 rounded font-bold text-center text-xs mt-1"
              />
              <span className="text-[9px] text-on-surface-variant">lpm (bpm)</span>
            </div>

            {/* FR */}
            <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30">
              <label className="block text-[10px] font-bold text-on-surface-variant">Frec. Respiratoria</label>
              <input
                type="number"
                value={respRate}
                onChange={(e) => setRespRate(Number(e.target.value))}
                className="w-full bg-surface-container-lowest p-1 rounded font-bold text-center text-xs mt-1"
              />
              <span className="text-[9px] text-on-surface-variant">rpm</span>
            </div>

            {/* Temperatura */}
            <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30">
              <label className="block text-[10px] font-bold text-on-surface-variant">Temperatura</label>
              <input
                type="number"
                step="0.1"
                value={tempCelsius}
                onChange={(e) => setTempCelsius(Number(e.target.value))}
                className="w-full bg-surface-container-lowest p-1 rounded font-bold text-center text-xs mt-1"
              />
              <span className="text-[9px] text-on-surface-variant">°C</span>
            </div>

            {/* Sat O2 */}
            <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30">
              <label className="block text-[10px] font-bold text-on-surface-variant">Saturación O₂</label>
              <input
                type="number"
                value={satO2}
                onChange={(e) => setSatO2(Number(e.target.value))}
                className="w-full bg-surface-container-lowest p-1 rounded font-bold text-center text-xs mt-1 text-sky-700"
              />
              <span className="text-[9px] text-on-surface-variant">% SpO₂</span>
            </div>

            {/* Peso & Talla */}
            <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30">
              <label className="block text-[10px] font-bold text-on-surface-variant">Peso / Talla</label>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-11 bg-surface-container-lowest p-1 rounded font-bold text-center text-xs"
                />
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-11 bg-surface-container-lowest p-1 rounded font-bold text-center text-xs"
                />
              </div>
              <span className="text-[9px] text-on-surface-variant">kg / cm</span>
            </div>

            {/* IMC Calculado */}
            <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30 text-center">
              <label className="block text-[10px] font-bold text-on-surface-variant">IMC Calculado</label>
              <p className="text-sm font-black text-primary mt-1">{bmi}</p>
              <span className="text-[9px] text-on-surface-variant font-bold">
                {bmi < 18.5 ? 'Bajo' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidad'}
              </span>
            </div>
          </div>
        </div>

        {/* Physical Exam Details */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Examen Físico General</label>
            <textarea
              rows={2}
              value={physicalExamGeneral}
              onChange={(e) => setPhysicalExamGeneral(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Examen Cardiopulmonar & Tórax</label>
              <textarea
                rows={2}
                value={cardiopulmonaryExam}
                onChange={(e) => setCardiopulmonaryExam(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Examen Osteomuscular & Segmentario</label>
              <textarea
                rows={2}
                value={musculoskeletalExam}
                onChange={(e) => setMusculoskeletalExam(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* A - ANÁLISIS / EVALUACIÓN (Diagnósticos CIE-10 & Juicio Clínico)          */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 clinical-shadow">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center">
            A
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-on-surface">Análisis (Diagnósticos CIE-10 & Juicio Clínico)</h3>
            <p className="text-[11px] text-on-surface-variant">Codificación nosológica y fundamentación médica</p>
          </div>
        </div>

        {/* Selected ICD-10 List */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase text-on-surface-variant">
            Diagnósticos Registrados (CIE-10 / ICD-10) *
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedDiagnoses.map((diag, index) => (
              <span
                key={diag.code}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  index === 0
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-surface-container-high text-on-surface border-outline-variant/30'
                }`}
              >
                <span className="font-mono font-black">{diag.code}</span>
                <span>{diag.description}</span>
                {index === 0 && (
                  <span className="text-[9px] bg-primary text-white px-1.5 py-0.2 rounded font-black uppercase">
                    Principal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveDiagnosis(diag.code)}
                  className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ICD-10 Quick Selector */}
        <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
          <span className="text-[11px] font-bold text-on-surface-variant block">
            Agregar Diagnóstico Frecuente (CIE-10):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ICD10_CATALOG.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleAddDiagnosis(item)}
                className="px-2.5 py-1 bg-surface-container-lowest hover:bg-primary/10 border border-outline-variant/30 rounded-lg text-[11px] font-semibold text-on-surface transition-colors cursor-pointer"
              >
                <strong className="font-mono text-primary mr-1">{item.code}</strong>
                <span>{item.description.split('/')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
            Juicio Clínico / Razonamiento Diagnóstico
          </label>
          <textarea
            rows={3}
            value={clinicalReasoning}
            onChange={(e) => setClinicalReasoning(e.target.value)}
            placeholder="Fundamentación clínica, evolución del cuadro y justificación diagnóstica..."
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* P - PLAN (Órdenes de Examen, Imagenología, Referencias e Instrucciones)    */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 clinical-shadow">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 font-black text-sm flex items-center justify-center">
            P
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-on-surface">Plan (Terapéutica, Exámenes, Interconsultas & Control)</h3>
            <p className="text-[11px] text-on-surface-variant">Conducta médica integral e instrucciones al paciente</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-black uppercase text-on-surface-variant mb-1">
              Objetivos Terapéuticos & Conducta
            </label>
            <input
              type="text"
              value={treatmentGoals}
              onChange={(e) => setTreatmentGoals(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Órdenes de Laboratorio Clínico</label>
              <input
                type="text"
                value={labOrders}
                onChange={(e) => setLabOrders(e.target.value)}
                placeholder="Hemograma, Perfil lipídico, etc."
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Imagenología / Estudios Diagnósticos</label>
              <input
                type="text"
                value={imagingOrders}
                onChange={(e) => setImagingOrders(e.target.value)}
                placeholder="Radiografía, Ecografía, Resonancia..."
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Derivaciones / Interconsultas (RBAC)</label>
              <input
                type="text"
                value={referrals}
                onChange={(e) => setReferrals(e.target.value)}
                placeholder="Kinesiología, Nutrición, Traumatología..."
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Próximo Control en (Días)</label>
              <input
                type="number"
                value={followUpDays}
                onChange={(e) => setFollowUpDays(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Instrucciones & Medidas No Farmacológicas</label>
            <textarea
              rows={2}
              value={patientInstructions}
              onChange={(e) => setPatientInstructions(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-red-700 mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">emergency</span>
              <span>Signos de Alarma para Consulta Inmediata en Urgencias</span>
            </label>
            <input
              type="text"
              value={alarmSigns}
              onChange={(e) => setAlarmSigns(e.target.value)}
              className="w-full bg-red-50/50 border border-red-200 rounded-xl p-2.5 text-xs text-red-900 outline-none focus:border-red-500 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-outline-variant/20">
        <div className="text-xs text-on-surface-variant">
          Formato estructurado HL7 FHIR • Compatible con Historia Clínica Electrónica Interoperable
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-2xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                <span>Guardando en Supabase...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">save</span>
                <span>Guardar Registro SOAP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
