import React, { useState } from 'react';
import { MovementAssessment, MovementGesture, GestureCriteria } from '../types';
import {
  Layers,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  FileText,
  Download,
  Check,
  CheckSquare,
  Square,
  Activity,
  Award,
} from 'lucide-react';

interface MovementControlModuleProps {
  initialData: MovementAssessment;
  onSave: (updated: MovementAssessment) => void;
  onDownloadPdf?: () => void;
}

export const MovementControlModule: React.FC<MovementControlModuleProps> = ({
  initialData,
  onSave,
  onDownloadPdf,
}) => {
  const [data, setData] = useState<MovementAssessment>(initialData);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedGestureId, setSelectedGestureId] = useState<string>('g-4'); // Defaults to Salto/Aterrizaje as in Image 3
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedGesture = data.gestures.find((g) => g.id === selectedGestureId) || data.gestures[0];

  const handleToggleCriterion = (criterionId: string) => {
    setData((prev) => {
      const updatedGestures = prev.gestures.map((g) => {
        if (g.id !== selectedGestureId) return g;
        const updatedCriteria = g.criteria.map((c) =>
          c.id === criterionId ? { ...c, selected: !c.selected } : c
        );
        const hasSelectedCriteria = updatedCriteria.some((c) => c.selected);
        return {
          ...g,
          criteria: updatedCriteria,
          status: hasSelectedCriteria ? ('Criterios hallados' as const) : ('Sin alteraciones relevantes' as const),
        };
      });
      return { ...prev, gestures: updatedGestures };
    });
  };

  const handleCommentChange = (comment: string) => {
    setData((prev) => {
      const updatedGestures = prev.gestures.map((g) =>
        g.id === selectedGestureId ? { ...g, comments: comment } : g
      );
      return { ...prev, gestures: updatedGestures };
    });
  };

  const handleSaveGesture = () => {
    onSave(data);
    setSavedSuccess(true);
    setCurrentStep(3); // Go to Resumen del gesto
  };

  // Helper icons for gestures
  const renderGestureSVG = (iconName: string) => {
    switch (iconName) {
      case 'squat':
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto text-slate-700">
            {/* Squat Athlete Silhouette */}
            <circle cx="32" cy="12" r="6" fill="#334155" />
            <path d="M12 18 L52 18" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="12" cy="18" r="4" fill="#0f172a" />
            <circle cx="52" cy="18" r="4" fill="#0f172a" />
            <path d="M26 18 L32 26 L38 18" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M32 26 L26 38 L18 42 M32 26 L38 38 L46 42" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M18 42 L18 54 L24 54 M46 42 L46 54 L40 54" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'deadlift':
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto text-slate-700">
            <circle cx="30" cy="14" r="6" fill="#334155" />
            <path d="M10 46 L54 46" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="10" cy="46" r="6" fill="#0f172a" />
            <circle cx="54" cy="46" r="6" fill="#0f172a" />
            <path d="M30 20 L24 34 L18 52 M30 20 L36 34 L42 52" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M30 20 L26 44 M30 20 L38 44" stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'lunge':
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto text-slate-700">
            <circle cx="32" cy="12" r="6" fill="#334155" />
            <path d="M32 18 L32 32" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <path d="M32 32 L46 36 L46 52 L52 52" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M32 32 L20 40 L16 52 L22 52" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'jump':
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto text-slate-700">
            {/* Box */}
            <rect x="18" y="44" width="28" height="18" rx="2" fill="#d97706" />
            <rect x="20" y="46" width="24" height="14" rx="1" fill="#b45309" />
            {/* Athlete on box in deep landing */}
            <circle cx="32" cy="14" r="5" fill="#334155" />
            <path d="M32 19 L32 28" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M32 28 L24 34 L28 44 M32 28 L40 34 L36 44" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M32 23 L22 28 M32 23 L42 28" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'push-press':
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto text-slate-700">
            <circle cx="32" cy="18" r="5" fill="#334155" />
            <path d="M12 8 L52 8" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="12" cy="8" r="4" fill="#0f172a" />
            <circle cx="52" cy="8" r="4" fill="#0f172a" />
            <path d="M32 23 L32 38 L26 54 M32 38 L38 54" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M32 24 L24 16 L18 9 M32 24 L40 16 L46 9" stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'push-up':
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto text-slate-700">
            <circle cx="48" cy="24" r="5" fill="#334155" />
            <path d="M14 44 L44 28" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <path d="M42 30 L42 44 L48 44" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
            <line x1="10" y1="46" x2="56" y2="46" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        );
      case 'clean':
      default:
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto text-slate-700">
            <circle cx="32" cy="16" r="5" fill="#334155" />
            <path d="M14 26 L50 26" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="14" cy="26" r="4.5" fill="#0f172a" />
            <circle cx="50" cy="26" r="4.5" fill="#0f172a" />
            <path d="M32 21 L32 34 L24 44 L22 54 M32 34 L40 44 L42 54" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M26 26 L30 32 L34 26" stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Workflow Step Tracker */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center min-w-[620px] justify-between gap-2">
          {[
            { step: 1, title: 'Selección del gesto', desc: 'Elige el movimiento a evaluar' },
            { step: 2, title: 'Evaluación del gesto', desc: 'Marca criterios hallados' },
            { step: 3, title: 'Resumen de criterios', desc: 'Confirmación del gesto' },
            { step: 4, title: 'Resumen general', desc: 'Vista global de los 7 gestos' },
            { step: 5, title: 'Informe generado', desc: 'Resultados y PDF final' },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step as any)}
                className={`flex-1 flex items-start gap-2.5 p-2 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-slate-50 opacity-80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check size={12} /> : item.step}
                </div>
                <div>
                  <span
                    className={`text-xs font-bold block ${
                      isActive ? 'text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-500 hidden sm:block">
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SCREEN 1: Selección del gesto */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Evaluación de técnica y control del movimiento
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona el gesto deportivo o funcional que deseas evaluar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <span>Ver Resumen General (7/7)</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.gestures.map((gesture) => {
              const hasIssues = gesture.criteria.some((c) => c.selected);
              return (
                <div
                  key={gesture.id}
                  onClick={() => {
                    setSelectedGestureId(gesture.id);
                    setCurrentStep(2);
                  }}
                  className={`cursor-pointer rounded-xl border p-4 text-center transition-all flex flex-col justify-between hover:shadow-md ${
                    selectedGestureId === gesture.id
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="py-2">
                    {renderGestureSVG(gesture.iconName)}
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 block truncate">
                      {gesture.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold mt-1 inline-block px-2 py-0.5 rounded ${
                        hasIssues
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {hasIssues ? 'Criterios hallados' : 'Sin alteraciones'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Info size={14} className="text-amber-600" />
            <span>Selecciona un gesto para ingresar a la valoración de criterios y compensaciones biomecánicas.</span>
          </div>
        </div>
      )}

      {/* SCREEN 2: Evaluación del gesto */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft size={15} />
              <span>Volver a gestos</span>
            </button>

            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              {selectedGesture.name}
            </h2>

            <div className="w-20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Gesture illustration column */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-36 h-36 flex items-center justify-center">
                {renderGestureSVG(selectedGesture.iconName)}
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-3">
                {selectedGesture.name}
              </h3>
              <p className="text-[11px] text-slate-500 text-center mt-1">
                Monitoreo de compensaciones y estabilidad en cadena cerrada
              </p>
            </div>

            {/* Criteria checklist column (matches Image 3 screen 2) */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  CRITERIOS DE EVALUACIÓN
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona los criterios que están presentes en el movimiento.
                </p>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedGesture.criteria.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleToggleCriterion(c.id)}
                    className={`cursor-pointer p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      c.selected
                        ? 'bg-blue-50 border-blue-400 text-slate-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center ${
                          c.selected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {c.selected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span>{c.name}</span>
                    </div>
                    <Info size={14} className="text-slate-400 hover:text-slate-600" />
                  </div>
                ))}
              </div>

              {/* Comments textarea */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Comentarios (opcional)
                </label>
                <textarea
                  rows={2}
                  value={selectedGesture.comments}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Bottom buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveGesture}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Guardar y continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3: Resumen de criterios del gesto */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={15} />
              <span>Editar criterios</span>
            </button>
            <h2 className="text-base font-black text-slate-900">
              Resumen del gesto
            </h2>
            <div className="w-16" />
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-slate-50/70 rounded-xl border border-slate-200">
            <div className="w-24 h-24 mb-2">
              {renderGestureSVG(selectedGesture.iconName)}
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {selectedGesture.name}
            </h3>

            <div className="w-full mt-4 text-left bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Criterios seleccionados
              </h4>
              <div className="space-y-1.5">
                {selectedGesture.criteria.filter((c) => c.selected).length > 0 ? (
                  selectedGesture.criteria
                    .filter((c) => c.selected)
                    .map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span>{c.name}</span>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-emerald-700 font-medium">
                    Sin criterios o alteraciones compensatorias identificadas.
                  </p>
                )}
              </div>

              {selectedGesture.comments && (
                <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">Comentario: </span>
                  {selectedGesture.comments}
                </div>
              )}
            </div>

            {/* Success Pill matching Image 3 screen 3 */}
            <div className="mt-4 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span>Evaluación guardada correctamente</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg"
            >
              Evaluar otro gesto
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Ver resumen general
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 4: Resumen general de la evaluación */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Resumen general de la evaluación
              </h2>
              <p className="text-xs text-slate-500">
                Aquí puedes ver los criterios hallados en cada gesto evaluado
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs"
            >
              Generar informe
            </button>
          </div>

          {/* 7 Gestures Table */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {data.gestures.map((gesture) => {
              const selectedCount = gesture.criteria.filter((c) => c.selected).length;
              return (
                <div
                  key={gesture.id}
                  onClick={() => {
                    setSelectedGestureId(gesture.id);
                    setCurrentStep(2);
                  }}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg p-1 shrink-0 flex items-center justify-center border border-slate-200">
                      {renderGestureSVG(gesture.iconName)}
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                        {gesture.name}
                      </span>
                      {gesture.comments && (
                        <span className="text-[11px] text-slate-400 block line-clamp-1">
                          {gesture.comments}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                        selectedCount > 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {selectedCount > 0
                        ? `${selectedCount} criterio${selectedCount > 1 ? 's' : ''} hallado${selectedCount > 1 ? 's' : ''}`
                        : 'Sin alteraciones relevantes'}
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs"
            >
              Generar informe
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 5: Informe generado */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                C3
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 block leading-tight">
                  CORE BODY
                </span>
                <span className="text-[10px] uppercase font-semibold text-blue-600 tracking-wider">
                  RENDIMIENTO FÍSICO
                </span>
              </div>
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase">
                INFORME DE TÉCNICA Y CONTROL DEL MOVIMIENTO
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Download size={14} />
                <span>Descargar PDF</span>
              </button>
            </div>
          </div>

          {/* Hallazgos 2 columns matching Image 3 screen 5 */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 bg-slate-100 px-3 py-1 rounded inline-block">
              HALLAZGOS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs text-slate-700">
              <div className="space-y-3">
                {data.gestures.slice(0, 4).map((g) => {
                  const issues = g.criteria.filter((c) => c.selected);
                  return (
                    <div key={g.id}>
                      <span className="font-extrabold text-slate-900 block">
                        {g.name}
                      </span>
                      {issues.length > 0 ? (
                        <ul className="list-disc pl-4 text-slate-600 mt-0.5 space-y-0.5">
                          {issues.map((c) => (
                            <li key={c.id}>{c.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500 pl-4">• Sin alteraciones relevantes.</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                {data.gestures.slice(4).map((g) => {
                  const issues = g.criteria.filter((c) => c.selected);
                  return (
                    <div key={g.id}>
                      <span className="font-extrabold text-slate-900 block">
                        {g.name}
                      </span>
                      {issues.length > 0 ? (
                        <ul className="list-disc pl-4 text-slate-600 mt-0.5 space-y-0.5">
                          {issues.map((c) => (
                            <li key={c.id}>{c.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500 pl-4">• Sin alteraciones relevantes.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recomendaciones & Conclusión matching Image 3 screen 5 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-slate-100">
            <div className="md:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
                RECOMENDACIONES
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-6 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 mb-2">
                CONCLUSIÓN
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                {data.conclusion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
