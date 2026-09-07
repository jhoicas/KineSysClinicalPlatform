import React, { useState } from 'react';
import { StrengthAssessment, StrengthItem } from '../types';
import { AnatomyIcon } from './AnatomyIcons';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  Radio,
  Dumbbell,
  Calculator,
  QrCode,
  Edit2,
  RotateCcw,
} from 'lucide-react';

interface StrengthModuleProps {
  initialData: StrengthAssessment;
  onSave: (updated: StrengthAssessment) => void;
}

export const StrengthModule: React.FC<StrengthModuleProps> = ({
  initialData,
  onSave,
}) => {
  const [data, setData] = useState<StrengthAssessment>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Helper to recompute asymmetry and interpretation
  const recalculateItem = (leftKg: number, rightKg: number): { asymmetryPct: number; interpretation: StrengthItem['interpretation'] } => {
    const maxVal = Math.max(leftKg, rightKg);
    if (maxVal === 0) return { asymmetryPct: 0, interpretation: 'Simetría conservada' };
    const diff = Math.abs(leftKg - rightKg);
    const asymmetry = Math.round((diff / maxVal) * 100);

    let interpretation: StrengthItem['interpretation'] = 'Simetría conservada';
    if (asymmetry > 30) interpretation = 'Asimetría marcada';
    else if (asymmetry >= 20) interpretation = 'Asimetría moderada';
    else if (asymmetry >= 10) interpretation = 'Asimetría leve';

    return { asymmetryPct: asymmetry, interpretation };
  };

  const handleWeightChange = (index: number, side: 'left' | 'right', val: number) => {
    setData((prev) => {
      const newStructures = [...prev.structures];
      const item = { ...newStructures[index] };
      if (side === 'left') item.leftKg = Number(val);
      else item.rightKg = Number(val);

      const computed = recalculateItem(item.leftKg, item.rightKg);
      item.asymmetryPct = computed.asymmetryPct;
      item.interpretation = computed.interpretation;
      newStructures[index] = item;

      // Recompute global asymmetry as average
      const avgAsymmetry = Math.round(
        newStructures.reduce((acc, curr) => acc + curr.asymmetryPct, 0) / newStructures.length
      );

      return {
        ...prev,
        asimetriaGlobalPct: avgAsymmetry,
        structures: newStructures,
      };
    });
  };

  const handleSave = () => {
    onSave(data);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const getInterpretationBadge = (interpretation: StrengthItem['interpretation']) => {
    switch (interpretation) {
      case 'Simetría conservada':
        return {
          dotColor: 'bg-emerald-500',
          textColor: 'text-emerald-800',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
        };
      case 'Asimetría leve':
        return {
          dotColor: 'bg-amber-400',
          textColor: 'text-amber-800',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        };
      case 'Asimetría moderada':
        return {
          dotColor: 'bg-orange-500',
          textColor: 'text-orange-800',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
        };
      case 'Asimetría marcada':
        return {
          dotColor: 'bg-red-500',
          textColor: 'text-red-800',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
    }
  };

  // Compute max weight for bar scaling
  const maxRecordedWeight = Math.max(
    ...data.structures.flatMap((s) => [s.leftKg, s.rightKg]),
    35
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Main Header Card matching Image 4 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-5 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl tracking-tighter shadow-xs">
              C3
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                CORE BODY
              </h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mt-1">
                RENDIMIENTO FÍSICO
              </p>
            </div>
          </div>

          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 block">
              INFORME GLOBAL
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight">
              DE FUERZA MUSCULAR
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Evaluación objetiva con ActivForce 2
            </p>
          </div>

          {/* ActivForce 2 Device Badge */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="w-9 h-11 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-emerald-400 border border-slate-700 shadow-xs">
              <span className="text-[10px] font-mono font-bold leading-none">98</span>
              <span className="text-[7px] text-slate-400">Kg</span>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-800">
                ActivForce 2
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Conectado
              </div>
            </div>
          </div>
        </div>

        {/* Global Metrics Gauges Row matching Image 4 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          {/* Circular Gauge 1: FUERZA GLOBAL */}
          <div className="md:col-span-4 flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${data.fuerzaGlobalPct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute font-black text-lg text-slate-900">
                {data.fuerzaGlobalPct}%
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                FUERZA GLOBAL
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                Fuerza global conservada
              </span>
              <span className="text-[11px] text-slate-500">
                Norma respecto al peso corporal
              </span>
            </div>
          </div>

          {/* Circular Gauge 2: ASIMETRÍA GLOBAL */}
          <div className="md:col-span-4 flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-500"
                  strokeDasharray={`${data.asimetriaGlobalPct * 3}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute font-black text-lg text-slate-900">
                {data.asimetriaGlobalPct}%
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                ASIMETRÍA GLOBAL
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                Dentro de rango esperado
              </span>
              <span className="text-[11px] text-slate-500">
                Límite fisiológico seguro (&lt;10%)
              </span>
            </div>
          </div>

          {/* Clinical summary text */}
          <div className="md:col-span-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
              <Activity size={20} />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              La asimetría global se encuentra dentro de los rangos aceptables. Se evidencian diferencias leves en{' '}
              <strong className="text-slate-900">hombro</strong> y{' '}
              <strong className="text-slate-900">cadera derecha</strong>.
            </p>
          </div>
        </div>

        {/* Section: Main Table + Right Info Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Results Table (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                RESULTADOS POR ESTRUCTURA
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5"
              >
                <Edit2 size={13} />
                <span>{isEditing ? 'Finalizar Edición' : 'Editar Valores (Kg)'}</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {/* Table Header */}
              <div className="grid grid-cols-12 bg-slate-900 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider py-3 px-3 text-center">
                <div className="col-span-4 text-left">ESTRUCTURA</div>
                <div className="col-span-3 text-center">FUERZA IZQ (KG)</div>
                <div className="col-span-3 text-center">FUERZA DER (KG)</div>
                <div className="col-span-2 text-center">ASIMETRÍA</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-slate-100 bg-white">
                {data.structures.map((item, idx) => {
                  const badge = getInterpretationBadge(item.interpretation);
                  const leftBarWidth = Math.min((item.leftKg / maxRecordedWeight) * 100, 100);
                  const rightBarWidth = Math.min((item.rightKg / maxRecordedWeight) * 100, 100);

                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-12 items-center p-3 sm:p-4 text-xs ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      } hover:bg-amber-50/10 transition-colors`}
                    >
                      {/* Structure Col */}
                      <div className="col-span-4 flex items-center gap-2.5">
                        <AnatomyIcon structure={item.structure} size={42} />
                        <div>
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase block">
                            {item.structure}
                          </span>
                          <span className="text-[10px] text-slate-400 block line-clamp-1">
                            {item.submovements}
                          </span>
                        </div>
                      </div>

                      {/* Left Kg */}
                      <div className="col-span-3 px-2 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={item.leftKg}
                            onChange={(e) => handleWeightChange(idx, 'left', parseFloat(e.target.value) || 0)}
                            className="w-16 mx-auto text-center font-bold border border-slate-300 rounded px-1.5 py-1 text-slate-900"
                          />
                        ) : (
                          <span className="font-extrabold text-slate-900 text-sm">
                            {item.leftKg} kg
                          </span>
                        )}
                        {/* Visual Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${leftBarWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Right Kg */}
                      <div className="col-span-3 px-2 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={item.rightKg}
                            onChange={(e) => handleWeightChange(idx, 'right', parseFloat(e.target.value) || 0)}
                            className="w-16 mx-auto text-center font-bold border border-slate-300 rounded px-1.5 py-1 text-slate-900"
                          />
                        ) : (
                          <span className="font-extrabold text-slate-900 text-sm">
                            {item.rightKg} kg
                          </span>
                        )}
                        {/* Visual Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${rightBarWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Asymmetry & Interpretation */}
                      <div className="col-span-2 text-center">
                        <span className={`text-base font-black ${
                          item.asymmetryPct > 15 ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {item.asymmetryPct}%
                        </span>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
                          <span className="text-[10px] font-semibold text-slate-500 truncate hidden sm:inline">
                            {item.interpretation.replace('Asimetría ', '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hallazgos y Recomendaciones matching Image 4 bottom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  HALLAZGOS PRINCIPALES
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {data.findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <Dumbbell size={15} className="text-amber-600" />
                  RECOMENDACIONES GENERALES
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {data.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right Info Panels (4 Cols) matching Image 4 sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* ESCALA DE ASIMETRÍA */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 pb-2 border-b border-slate-100">
                ESCALA DE ASIMETRÍA
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>0% – 10%</span>
                  </span>
                  <span className="font-semibold text-slate-700">Simetría conservada</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>10% – 20%</span>
                  </span>
                  <span className="font-semibold text-slate-700">Asimetría leve</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>20% – 30%</span>
                  </span>
                  <span className="font-semibold text-slate-700">Asimetría moderada</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>&gt; 30%</span>
                  </span>
                  <span className="font-semibold text-slate-700">Asimetría marcada</span>
                </div>
              </div>
            </div>

            {/* ¿QUÉ ES LA ASIMETRÍA? & FÓRMULA */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-1">
                  ¿QUÉ ES LA ASIMETRÍA?
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  La asimetría expresa la diferencia relativa de fuerza neuromuscular entre el hemicuerpo izquierdo y derecho.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  FÓRMULA UTILIZADA
                </span>
                <div className="font-mono text-xs font-bold text-slate-800 text-center py-1 bg-white rounded border border-slate-200/80">
                  Asimetría (%) = |Izq - Der| / Mayor × 100
                </div>
              </div>
            </div>

            {/* QR & Report Access */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
              <div className="p-2 bg-slate-900 rounded-lg text-white">
                <QrCode size={36} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  VER INFORME COMPLETO
                </span>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                  Escanea el código QR para acceder al detalle de pruebas y evolución en la plataforma.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {savedSuccess ? (
                <>
                  <Check size={16} />
                  <span>¡Datos Guardados!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar Dinamometría de Fuerza</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
