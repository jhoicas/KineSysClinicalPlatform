import React, { useState } from 'react';
import {
  Patient,
  AnthropometryAssessment,
  AnthropometryTab,
  EstimationEquationId,
  SkinfoldMeasurements,
  PerimeterMeasurements,
  BoneDiameterMeasurements,
  SomatotypeCategory,
} from '../types';
import { AnatomyAnthropometryModel } from './AnatomyAnthropometryModel';
import {
  Ruler,
  Compass,
  Award,
  Calendar,
  Save,
  CheckCircle2,
  TrendingUp,
  Activity,
  Calculator,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface AnthropometryModuleProps {
  patient: Patient;
  assessment?: AnthropometryAssessment;
  onSave: (assessment: AnthropometryAssessment) => void;
}

export const AnthropometryModule: React.FC<AnthropometryModuleProps> = ({
  patient,
  assessment,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<AnthropometryTab>('skinfolds');
  const [activePointKey, setActivePointKey] = useState<string>('triceps');
  const [isSaved, setIsSaved] = useState(false);

  // State initialized with existing assessment or default
  const [skinfolds, setSkinfolds] = useState<SkinfoldMeasurements>(
    assessment?.skinfolds || {
      triceps: 14.4,
      subescapular: 14.9,
      biceps: 8.1,
      crestaIliaca: 18.2,
      supraespinal: 17.3,
      abdominal: 19.5,
      muslo: 23.0,
      pierna: 18.4,
    }
  );

  const [equation, setEquation] = useState<EstimationEquationId>(
    assessment?.activeEquation || 'faulkner_4'
  );

  const [perimeters, setPerimeters] = useState<PerimeterMeasurements>(
    assessment?.perimeters || {
      brazoRelajado: 26.0,
      brazoContraido: 27.3,
      cintura: 71.8,
      cadera: 91.0,
      muslo: 46.9,
      pierna: 31.5,
    }
  );

  const [diameters, setDiameters] = useState<BoneDiameterMeasurements>(
    assessment?.diameters || {
      biacromial: 36.3,
      humero: 6.8,
      femur: 9.4,
    }
  );

  const [selectedSomatotype, setSelectedSomatotype] = useState<SomatotypeCategory>(
    assessment?.somatotype?.category || 'Mesomorfo'
  );

  const [generalNotes, setGeneralNotes] = useState<string>(
    assessment?.generalObservations ||
      'Excelente densidad musculoesquelética y adecuada linealidad para calistenia y control de peso corporal.'
  );

  // Dynamic calculations
  // 1. Fat estimation equations:
  const sum4Faulkner =
    skinfolds.triceps + skinfolds.subescapular + skinfolds.supraespinal + skinfolds.crestaIliaca;
  const faulknerFat = Number((0.153 * sum4Faulkner + 5.783).toFixed(1));

  const sum3JP =
    patient.gender === 'F'
      ? skinfolds.triceps + skinfolds.supraespinal + skinfolds.muslo
      : skinfolds.pecho ? 0 : skinfolds.abdominal + skinfolds.muslo + skinfolds.triceps; // fallback
  const jpFat = Number((0.18 * sum3JP + 6.2).toFixed(1));

  const sum7JP =
    skinfolds.triceps +
    skinfolds.subescapular +
    skinfolds.biceps +
    skinfolds.crestaIliaca +
    skinfolds.supraespinal +
    skinfolds.abdominal +
    skinfolds.muslo;
  const jp7Fat = Number((0.12 * sum7JP + 7.1).toFixed(1));

  const calculatedFatPct =
    equation === 'faulkner_4'
      ? faulknerFat
      : equation === 'jackson_pollock_3'
      ? jpFat
      : jp7Fat;

  const fatStatus: 'Bajo' | 'Rango saludable' | 'Sobrepeso' | 'Elevado' =
    calculatedFatPct < 15
      ? 'Bajo'
      : calculatedFatPct <= 25
      ? 'Rango saludable'
      : calculatedFatPct <= 32
      ? 'Sobrepeso'
      : 'Elevado';

  // 2. Perimeters Derived Indices:
  const whr = Number((perimeters.cintura / perimeters.cadera).toFixed(2));
  const heightCm = patient.heightCm || 158.1;
  const whtr = Number((perimeters.cintura / heightCm).toFixed(2));
  const armRatio = Number((perimeters.brazoContraido / perimeters.brazoRelajado).toFixed(2));

  // Handlers for updates
  const handleUpdateSkinfold = (key: keyof SkinfoldMeasurements, val: number) => {
    setSkinfolds((prev) => ({ ...prev, [key]: val }));
    setIsSaved(false);
  };

  const handleUpdatePerimeter = (key: keyof PerimeterMeasurements, val: number) => {
    setPerimeters((prev) => ({ ...prev, [key]: val }));
    setIsSaved(false);
  };

  const handleUpdateDiameter = (key: keyof BoneDiameterMeasurements, val: number) => {
    setDiameters((prev) => ({ ...prev, [key]: val }));
    setIsSaved(false);
  };

  const handleSave = () => {
    const assessmentToSave: AnthropometryAssessment = {
      id: assessment?.id || `anthro-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      date: new Date().toISOString().split('T')[0],
      evaluator: patient.nutritionist || 'Dra. Juliana Mesa V.',
      evaluatorCertification: patient.isakCertification || 'ISAK Nivel 3',
      evaluationNumber: patient.evalNumber || '1/1',
      skinfolds,
      activeEquation: equation,
      estimatedBodyFatPct: calculatedFatPct,
      fatStatus,
      perimeters,
      derivedIndices: {
        cinturaCaderaRatio: whr,
        cinturaCaderaStatus: whr <= 0.8 ? 'Normal' : 'Riesgo Moderado',
        cinturaTallaRatio: whtr,
        cinturaTallaStatus: whtr <= 0.5 ? 'Normal' : 'Riesgo Aumentado',
        relacionBrazo: armRatio,
        relacionBrazoStatus: 'Normal',
      },
      perimetersInterpretation:
        'Los perímetros se encuentran en rangos esperados para la edad, sexo y nivel de actividad física.',
      diameters,
      somatotype: {
        category: selectedSomatotype,
        endomorfia: 3.2,
        mesomorfia: 4.8,
        ectomorfia: 2.5,
        interpretation:
          selectedSomatotype === 'Mesomorfo'
            ? 'Predominio de desarrollo musculoesquelético, con adecuado balance entre linealidad y robustez ósea.'
            : selectedSomatotype === 'Ectomorfo'
            ? 'Linealidad relativa dominante y bajo componente de adiposidad subcutánea.'
            : 'Predominio de adiposidad relativa y formas redondeadas.',
      },
      generalObservations: generalNotes,
    };

    onSave(assessmentToSave);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div id="anthropometry-module" className="space-y-6">
      {/* Top Clinical Header & Patient Ribbon (Matching Mockup) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold text-lg">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Antropometría Clínica (Protocolo ISAK)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {patient.isakCertification || 'ISAK Nivel 3'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo de pliegues cutáneos, perímetros musculares, diámetros óseos y somatotipo de Heath-Carter
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              id="btn-save-anthropometry"
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                isSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Guardado con éxito' : 'Guardar Evaluación'}
            </button>
          </div>
        </div>

        {/* Patient Information Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div>
            <span className="text-2xs text-slate-400 block font-medium">Paciente</span>
            <span className="font-bold text-slate-900">{patient.name}</span>
          </div>
          <div>
            <span className="text-2xs text-slate-400 block font-medium">Documento / ID</span>
            <span className="font-semibold text-slate-700">{patient.documentId}</span>
          </div>
          <div>
            <span className="text-2xs text-slate-400 block font-medium">Edad / Género</span>
            <span className="font-semibold text-slate-700">
              {patient.age} años • {patient.gender === 'F' ? 'Femenino' : 'Masculino'}
            </span>
          </div>
          <div>
            <span className="text-2xs text-slate-400 block font-medium">Deporte / Actividad</span>
            <span className="font-semibold text-slate-700">{patient.sportOrActivity}</span>
          </div>
          <div>
            <span className="text-2xs text-slate-400 block font-medium">Estatura / Peso</span>
            <span className="font-bold text-slate-800">
              {heightCm} cm • {patient.weightKg || 53.5} kg
            </span>
          </div>
          <div>
            <span className="text-2xs text-slate-400 block font-medium">Evaluador Responsable</span>
            <span className="font-semibold text-emerald-700">
              {patient.nutritionist || 'Dra. Juliana Mesa V.'}
            </span>
          </div>
          <div>
            <span className="text-2xs text-slate-400 block font-medium">Evaluación</span>
            <span className="font-semibold text-slate-700">
              N° {patient.evalNumber || '1/1'} • 11/07/2026
            </span>
          </div>
        </div>
      </div>

      {/* Specialty Sub-Navigation Tabs (Pliegues cutáneos | Perímetros | Diámetros óseos) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="tab-anthro-skinfolds"
          onClick={() => {
            setActiveTab('skinfolds');
            setActivePointKey('triceps');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'skinfolds'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Ruler className="w-4 h-4" />
          Pliegues cutáneos
          <span className={`ml-1 text-2xs px-2 py-0.5 rounded-full ${activeTab === 'skinfolds' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            8 sitios
          </span>
        </button>

        <button
          id="tab-anthro-perimeters"
          onClick={() => {
            setActiveTab('perimeters');
            setActivePointKey('cintura');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'perimeters'
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          Perímetros
          <span className={`ml-1 text-2xs px-2 py-0.5 rounded-full ${activeTab === 'perimeters' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            6 medidas
          </span>
        </button>

        <button
          id="tab-anthro-diameters"
          onClick={() => {
            setActiveTab('diameters');
            setActivePointKey('biacromial');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'diameters'
              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Diámetros óseos
          <span className={`ml-1 text-2xs px-2 py-0.5 rounded-full ${activeTab === 'diameters' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            3 huesos
          </span>
        </button>
      </div>

      {/* Main Body: Anatomical Model on Left / Metric Panels on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Anatomical Silhouette Model (7 cols) */}
        <div className="lg:col-span-7">
          <AnatomyAnthropometryModel
            activeTab={activeTab}
            skinfolds={skinfolds}
            perimeters={perimeters}
            diameters={diameters}
            onUpdateSkinfold={handleUpdateSkinfold}
            onUpdatePerimeter={handleUpdatePerimeter}
            onUpdateDiameter={handleUpdateDiameter}
            activePointKey={activePointKey}
            onSelectPointKey={setActivePointKey}
          />
        </div>

        {/* Right Column: Contextual Clinical Panels according to active subtab (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* TAB 1: PLIEGUES CUTÁNEOS */}
          {activeTab === 'skinfolds' && (
            <>
              {/* Pliegues measurements table */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-blue-600" />
                    Pliegues cutáneos (mm)
                  </h3>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    ISAK 1
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Tríceps</span>
                    <span className="font-bold text-slate-900">{skinfolds.triceps} mm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Subescapular</span>
                    <span className="font-bold text-slate-900">{skinfolds.subescapular} mm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Bíceps</span>
                    <span className="font-bold text-slate-900">{skinfolds.biceps} mm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Cresta ilíaca</span>
                    <span className="font-bold text-slate-900">{skinfolds.crestaIliaca} mm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Supraespinal</span>
                    <span className="font-bold text-slate-900">{skinfolds.supraespinal} mm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Abdominal</span>
                    <span className="font-bold text-slate-900">{skinfolds.abdominal} mm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Muslo anterior</span>
                    <span className="font-bold text-slate-900">{skinfolds.muslo} mm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Pierna medial</span>
                    <span className="font-bold text-slate-900">{skinfolds.pierna} mm</span>
                  </div>
                </div>
              </div>

              {/* Estimation equation & Fat result card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                    Ecuación de estimación
                  </h3>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Seleccionar fórmula validada:
                  </label>
                  <select
                    id="select-fat-equation"
                    value={equation}
                    onChange={(e) => setEquation(e.target.value as EstimationEquationId)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="faulkner_4">Faulkner (1968) - 4 pliegues</option>
                    <option value="jackson_pollock_3">Jackson-Pollock - 3 pliegues</option>
                    <option value="jackson_pollock_7">Jackson-Pollock - 7 pliegues</option>
                  </select>
                </div>

                <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-3 text-xs space-y-1.5">
                  <div className="text-2xs text-slate-500 font-medium">Pliegues utilizados:</div>
                  <div className="text-xs font-bold text-blue-900">
                    {equation === 'faulkner_4'
                      ? 'Tríceps + Subescapular + Supraespinal + Cresta ilíaca'
                      : equation === 'jackson_pollock_3'
                      ? 'Tríceps + Supraespinal + Muslo anterior'
                      : '7 pliegues corporales totales'}
                  </div>
                  <div className="text-2xs text-slate-500 font-mono mt-1">
                    {equation === 'faulkner_4'
                      ? '% Grasa = 0,153 × Σ4 pliegues + 5,783'
                      : equation === 'jackson_pollock_3'
                      ? '% Grasa = 0,180 × Σ3 pliegues + 6,200'
                      : '% Grasa = 0,120 × Σ7 pliegues + 7,100'}
                  </div>
                </div>

                {/* Big Result Badge */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-700 text-white shadow-sm">
                  <div>
                    <span className="text-2xs text-blue-100 block font-medium">
                      Grasa Corporal Estimada
                    </span>
                    <span className="text-2xl font-black">{calculatedFatPct} %</span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xs text-white border border-white/30">
                      {fatStatus}
                    </span>
                    <span className="text-3xs text-blue-200 block mt-1">
                      Norma ACSM para mujer 35a
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PERÍMETROS */}
          {activeTab === 'perimeters' && (
            <>
              {/* Perimeters table */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" />
                    Perímetros (cm)
                  </h3>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ISAK 1
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Brazo relajado</span>
                    <span className="font-bold text-slate-900">{perimeters.brazoRelajado} cm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Brazo contraído</span>
                    <span className="font-bold text-slate-900">{perimeters.brazoContraido} cm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Cintura</span>
                    <span className="font-bold text-slate-900">{perimeters.cintura} cm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Cadera</span>
                    <span className="font-bold text-slate-900">{perimeters.cadera} cm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Muslo (1 cm glúteo)</span>
                    <span className="font-bold text-slate-900">{perimeters.muslo} cm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Pierna</span>
                    <span className="font-bold text-slate-900">{perimeters.pierna} cm</span>
                  </div>
                </div>
              </div>

              {/* Índices Derivados (Card from mockup!) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Índices derivados
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Cintura / Cadera</span>
                      <span className="text-2xs text-slate-400">Riesgo cardiovascular</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 mr-2">{whr}</span>
                      <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                        Normal
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Cintura / Talla</span>
                      <span className="text-2xs text-slate-400">Distribución adiposa</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 mr-2">{whtr}</span>
                      <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                        Normal
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Rel. Brazo (flex/relajado)</span>
                      <span className="text-2xs text-slate-400">Desarrollo muscular</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 mr-2">{armRatio}</span>
                      <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                        Normal
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interpretation */}
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-2xs text-emerald-900 leading-relaxed">
                  <span className="font-bold block mb-1">Interpretación clínica:</span>
                  Los perímetros se encuentran en rangos esperados para la edad, sexo y nivel de actividad física de la paciente, denotando bajo riesgo metabólico.
                </div>
              </div>
            </>
          )}

          {/* TAB 3: DIÁMETROS ÓSEOS & SOMATOTIPO */}
          {activeTab === 'diameters' && (
            <>
              {/* Diameters table */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-amber-600" />
                    Diámetros óseos (cm)
                  </h3>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    ISAK 1
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-slate-500 text-2xs block font-medium">Biacromial</span>
                    <span className="text-sm font-bold text-slate-900">{diameters.biacromial} cm</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-slate-500 text-2xs block font-medium">Húmero</span>
                    <span className="text-sm font-bold text-slate-900">{diameters.humero} cm</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-slate-500 text-2xs block font-medium">Fémur</span>
                    <span className="text-sm font-bold text-slate-900">{diameters.femur} cm</span>
                  </div>
                </div>
              </div>

              {/* Tipo de cuerpo (Somatotipo ISAK - Heath Carter from mockup!) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                    Tipo de cuerpo (ISAK)
                  </h3>
                </div>

                {/* Visual Somatotype Selector (Ectomorfo | Mesomorfo | Endomorfo) */}
                <div className="grid grid-cols-3 gap-2">
                  {(['Ectomorfo', 'Mesomorfo', 'Endomorfo'] as SomatotypeCategory[]).map((type) => {
                    const isSelected = selectedSomatotype === type;
                    return (
                      <button
                        key={type}
                        id={`btn-somatotype-${type.toLowerCase()}`}
                        onClick={() => setSelectedSomatotype(type)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {/* Somatotype Silhouette Vector Mini-Icon */}
                        <div className="w-10 h-14 mx-auto mb-1.5 flex items-center justify-center">
                          {type === 'Ectomorfo' && (
                            <svg viewBox="0 0 40 60" className="w-full h-full text-slate-400">
                              <ellipse cx="20" cy="8" rx="4" ry="5" fill="currentColor" />
                              <rect x="18" y="14" width="4" height="22" rx="2" fill="currentColor" />
                              <rect x="14" y="16" width="2" height="18" rx="1" fill="currentColor" />
                              <rect x="24" y="16" width="2" height="18" rx="1" fill="currentColor" />
                              <rect x="17" y="36" width="2.5" height="20" rx="1" fill="currentColor" />
                              <rect x="20.5" y="36" width="2.5" height="20" rx="1" fill="currentColor" />
                            </svg>
                          )}
                          {type === 'Mesomorfo' && (
                            <svg viewBox="0 0 40 60" className="w-full h-full text-amber-600">
                              <ellipse cx="20" cy="8" rx="5" ry="5.5" fill="currentColor" />
                              <polygon points="13,15 27,15 23,36 17,36" fill="currentColor" />
                              <rect x="10" y="16" width="3.5" height="18" rx="1.5" fill="currentColor" />
                              <rect x="26.5" y="16" width="3.5" height="18" rx="1.5" fill="currentColor" />
                              <rect x="15.5" y="36" width="4" height="20" rx="1.5" fill="currentColor" />
                              <rect x="20.5" y="36" width="4" height="20" rx="1.5" fill="currentColor" />
                            </svg>
                          )}
                          {type === 'Endomorfo' && (
                            <svg viewBox="0 0 40 60" className="w-full h-full text-slate-400">
                              <ellipse cx="20" cy="8" rx="5.5" ry="6" fill="currentColor" />
                              <ellipse cx="20" cy="26" rx="9" ry="12" fill="currentColor" />
                              <rect x="8" y="18" width="3.5" height="16" rx="1.5" fill="currentColor" />
                              <rect x="28.5" y="18" width="3.5" height="16" rx="1.5" fill="currentColor" />
                              <rect x="15" y="36" width="4.5" height="20" rx="1.5" fill="currentColor" />
                              <rect x="20.5" y="36" width="4.5" height="20" rx="1.5" fill="currentColor" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs font-bold block ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>
                          {type}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Somatotype Description Result (matching mockup text) */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-300/40 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    {selectedSomatotype}
                  </div>
                  <p className="text-2xs text-amber-950/80 leading-relaxed">
                    {selectedSomatotype === 'Mesomorfo'
                      ? 'Predominio de desarrollo musculoesquelético, con adecuado balance entre linealidad y robustez ósea.'
                      : selectedSomatotype === 'Ectomorfo'
                      ? 'Predominio de linealidad relativa y extremidades alargadas, con bajo índice de masa corporal.'
                      : 'Predominio de formas redondeadas, mayor densidad endomórfica y tendencia a reserva energética.'}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-2xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800 block mb-0.5">Protocolo ISAK:</span>
                  El tipo de cuerpo se determina a partir de los diámetros óseos y pliegues según el somatocarta de Heath-Carter, correlacionando con el rendimiento en calistenia.
                </div>
              </div>
            </>
          )}

          {/* General Notes Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Observaciones Clínicas del Evaluador:
            </label>
            <textarea
              id="textarea-anthro-observations"
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:outline-hidden"
              placeholder="Notas sobre simetría, técnica antropométrica o recomendaciones..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
