import React, { useState } from 'react';
import { MovementGesture } from '../../types';
import { GESTURE_ICON_MAP, MOVEMENT_ALTERATIONS } from '../../data/kinesiologyCatalog';

export interface MovementControlModuleProps {
  gestures: MovementGesture[];
  onUpdateGestures: (updatedGestures: MovementGesture[]) => void;
  readOnly?: boolean;
}

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined leading-none ${className}`}>{name}</span>
);

function gestureIcon(gesto: string) {
  return GESTURE_ICON_MAP[gesto] || 'clean';
}

function renderGestureSVG(iconName: string, className = 'w-16 h-16 mx-auto text-slate-700') {
  switch (iconName) {
    case 'squat':
      return (
        <svg viewBox="0 0 64 64" className={className}>
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
        <svg viewBox="0 0 64 64" className={className}>
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
        <svg viewBox="0 0 64 64" className={className}>
          <circle cx="32" cy="12" r="6" fill="#334155" />
          <path d="M32 18 L32 32" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 32 L46 36 L46 52 L52 52" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M32 32 L20 40 L16 52 L22 52" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'jump':
      return (
        <svg viewBox="0 0 64 64" className={className}>
          <rect x="18" y="44" width="28" height="18" rx="2" fill="#d97706" />
          <rect x="20" y="46" width="24" height="14" rx="1" fill="#b45309" />
          <circle cx="32" cy="14" r="5" fill="#334155" />
          <path d="M32 19 L32 28" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M32 28 L24 34 L28 44 M32 28 L40 34 L36 44" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M32 23 L22 28 M32 23 L42 28" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'push-up':
      return (
        <svg viewBox="0 0 64 64" className={className}>
          <circle cx="48" cy="24" r="5" fill="#334155" />
          <path d="M14 44 L44 28" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <path d="M42 30 L42 44 L48 44" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
          <line x1="10" y1="46" x2="56" y2="46" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className={className}>
          <circle cx="32" cy="16" r="5" fill="#334155" />
          <path d="M14 26 L50 26" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="14" cy="26" r="4.5" fill="#0f172a" />
          <circle cx="50" cy="26" r="4.5" fill="#0f172a" />
          <path d="M32 21 L32 34 L24 44 L22 54 M32 34 L40 44 L42 54" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M26 26 L30 32 L34 26" stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}

function buildRecommendations(gestures: MovementGesture[]): string[] {
  const withIssues = gestures.filter((g) => g.alteraciones.length > 0);
  if (withIssues.length === 0) {
    return ['Mantener control motor actual y progresar cargas de forma gradual.'];
  }
  return withIssues.slice(0, 3).map(
    (g) => `Reeducar patrón de ${g.gesto.toLowerCase()} corrigiendo: ${g.alteraciones.slice(0, 2).join(', ')}.`
  );
}

function buildConclusion(gestures: MovementGesture[]): string {
  const withIssues = gestures.filter((g) => g.alteraciones.length > 0);
  if (withIssues.length === 0) {
    return 'No se identificaron alteraciones compensatorias relevantes en los gestos evaluados.';
  }
  const names = withIssues.map((g) => g.gesto).join(', ');
  return `Se identifican alteraciones de control principalmente en: ${names}. Priorizar estabilidad dinámica y calidad del patrón antes de aumentar carga.`;
}

export const MovementControlModule: React.FC<MovementControlModuleProps> = ({
  gestures,
  onUpdateGestures,
  readOnly = false,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedGestureName, setSelectedGestureName] = useState<string>(gestures[0]?.gesto || '');
  const [savedFlash, setSavedFlash] = useState(false);

  const selectedGesture =
    gestures.find((g) => g.gesto === selectedGestureName) || gestures[0] || null;

  const evaluatedCount = gestures.filter((g) => g.alteraciones.length > 0 || (g.comentarios || '').trim()).length;

  const handleToggleCriterion = (alteration: string) => {
    if (readOnly || !selectedGesture) return;
    const updated = gestures.map((g) => {
      if (g.gesto !== selectedGesture.gesto) return g;
      const has = g.alteraciones.includes(alteration);
      return {
        ...g,
        alteraciones: has
          ? g.alteraciones.filter((a) => a !== alteration)
          : [...g.alteraciones, alteration],
      };
    });
    onUpdateGestures(updated);
  };

  const handleCommentChange = (comment: string) => {
    if (readOnly || !selectedGesture) return;
    onUpdateGestures(
      gestures.map((g) =>
        g.gesto === selectedGesture.gesto ? { ...g, comentarios: comment } : g
      )
    );
  };

  const handleContinueFromEvaluation = () => {
    setSavedFlash(true);
    setCurrentStep(3);
    window.setTimeout(() => setSavedFlash(false), 2500);
  };

  const recommendations = buildRecommendations(gestures);
  const conclusion = buildConclusion(gestures);

  if (!selectedGesture) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 text-center text-sm text-on-surface-variant">
        No hay gestos de movimiento configurados.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Workflow Step Tracker */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 clinical-shadow overflow-x-auto">
        <div className="flex items-center min-w-[620px] justify-between gap-2">
          {[
            { step: 1, title: 'Selección del gesto', desc: 'Elige el movimiento a evaluar' },
            { step: 2, title: 'Evaluación del gesto', desc: 'Marca criterios hallados' },
            { step: 3, title: 'Resumen de criterios', desc: 'Confirmación del gesto' },
            { step: 4, title: 'Resumen general', desc: 'Vista global de gestos' },
            { step: 5, title: 'Informe generado', desc: 'Resultados finales' },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step as 1 | 2 | 3 | 4 | 5)}
                className={`flex-1 flex items-start gap-2.5 p-2 rounded-xl text-left transition-all ${
                  isActive ? 'bg-primary/10 border border-primary/25' : 'hover:bg-surface-container-low opacity-80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive
                      ? 'bg-primary text-on-primary'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {isCompleted ? <Icon name="check" className="text-[14px]" /> : item.step}
                </div>
                <div>
                  <span className={`text-xs font-bold block ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                    {item.title}
                  </span>
                  <span className="text-[10px] text-on-surface-variant hidden sm:block">{item.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SCREEN 1 */}
      {currentStep === 1 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 clinical-shadow space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">
                Evaluación de técnica y control del movimiento
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Selecciona el gesto deportivo o funcional que deseas evaluar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="text-xs font-semibold text-primary bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
            >
              <span>
                Ver Resumen General ({evaluatedCount}/{gestures.length})
              </span>
              <Icon name="chevron_right" className="text-[16px]" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
            {gestures.map((gesture) => {
              const hasIssues = gesture.alteraciones.length > 0;
              return (
                <div
                  key={gesture.gesto}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedGestureName(gesture.gesto);
                    setCurrentStep(2);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedGestureName(gesture.gesto);
                      setCurrentStep(2);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-4 text-center transition-all flex flex-col justify-between hover:shadow-md ${
                    selectedGestureName === gesture.gesto
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest'
                  }`}
                >
                  <div className="py-2">{renderGestureSVG(gestureIcon(gesture.gesto))}</div>
                  <div className="pt-2 border-t border-outline-variant/15">
                    <span className="font-extrabold text-xs sm:text-sm text-on-surface block truncate">
                      {gesture.gesto}
                    </span>
                    <span
                      className={`text-[10px] font-semibold mt-1 inline-block px-2 py-0.5 rounded ${
                        hasIssues ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {hasIssues ? 'Criterios hallados' : 'Sin alteraciones'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-surface-container-low p-3 rounded-lg text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
            <Icon name="info" className="text-[16px] text-amber-600" />
            <span>Selecciona un gesto para ingresar a la valoración de criterios y compensaciones biomecánicas.</span>
          </div>
        </div>
      )}

      {/* SCREEN 2 */}
      {currentStep === 2 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 clinical-shadow space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low px-3 py-1.5 rounded-lg"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              <span>Volver a gestos</span>
            </button>
            <h2 className="text-lg sm:text-xl font-black text-on-surface">{selectedGesture.gesto}</h2>
            <div className="w-20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <div className="w-36 h-36 flex items-center justify-center">
                {renderGestureSVG(gestureIcon(selectedGesture.gesto), 'w-28 h-28')}
              </div>
              <h3 className="font-bold text-on-surface text-sm mt-3">{selectedGesture.gesto}</h3>
              <p className="text-[11px] text-on-surface-variant text-center mt-1">
                Monitoreo de compensaciones y estabilidad en cadena cerrada
              </p>
            </div>

            <div className="md:col-span-7 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-on-surface">
                  Criterios de evaluación
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Selecciona los criterios que están presentes en el movimiento.
                </p>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {MOVEMENT_ALTERATIONS.map((alt) => {
                  const selected = selectedGesture.alteraciones.includes(alt);
                  return (
                    <div
                      key={alt}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleCriterion(alt)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleToggleCriterion(alt);
                      }}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                        readOnly ? 'opacity-80 pointer-events-none' : 'cursor-pointer'
                      } ${
                        selected
                          ? 'bg-primary/10 border-primary text-on-surface font-bold'
                          : 'border-outline-variant/30 text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          name={selected ? 'check_box' : 'check_box_outline_blank'}
                          className={`text-[18px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
                        />
                        <span>{alt}</span>
                      </div>
                      <Icon name="info" className="text-[16px] text-on-surface-variant" />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Comentarios (opcional)</label>
                <textarea
                  rows={2}
                  disabled={readOnly}
                  value={selectedGesture.comentarios || ''}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="w-full text-xs p-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:opacity-70"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-outline-variant/30 text-on-surface hover:bg-surface-container-low text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleContinueFromEvaluation}
                  className="px-5 py-2 bg-primary hover:opacity-90 text-on-primary text-xs font-semibold rounded-lg"
                >
                  Guardar y continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3 */}
      {currentStep === 3 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 clinical-shadow max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              <span>Editar criterios</span>
            </button>
            <h2 className="text-base font-black text-on-surface">Resumen del gesto</h2>
            <div className="w-16" />
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-surface-container-low/70 rounded-xl border border-outline-variant/20">
            <div className="w-24 h-24 mb-2">{renderGestureSVG(gestureIcon(selectedGesture.gesto), 'w-24 h-24')}</div>
            <h3 className="text-lg font-black text-on-surface">{selectedGesture.gesto}</h3>

            <div className="w-full mt-4 text-left bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Criterios seleccionados
              </h4>
              <div className="space-y-1.5">
                {selectedGesture.alteraciones.length > 0 ? (
                  selectedGesture.alteraciones.map((alt) => (
                    <div key={alt} className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>{alt}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-700 font-medium">
                    Sin criterios o alteraciones compensatorias identificadas.
                  </p>
                )}
              </div>

              {selectedGesture.comentarios && (
                <div className="mt-3 pt-2 border-t border-outline-variant/15 text-xs text-on-surface-variant">
                  <span className="font-bold text-on-surface">Comentario: </span>
                  {selectedGesture.comentarios}
                </div>
              )}
            </div>

            {(savedFlash) && (
              <div className="mt-4 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold inline-flex items-center gap-2">
                <Icon name="check_circle" className="text-[16px] text-emerald-600" />
                <span>Criterios actualizados en la evaluación</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 border border-outline-variant/30 text-on-surface hover:bg-surface-container-low text-xs font-semibold rounded-lg"
            >
              Evaluar otro gesto
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 bg-primary text-on-primary text-xs font-semibold rounded-lg"
            >
              Ver resumen general
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 4 */}
      {currentStep === 4 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 clinical-shadow space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/15 pb-4 gap-2">
            <div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">Resumen general de la evaluación</h2>
              <p className="text-xs text-on-surface-variant">
                Aquí puedes ver los criterios hallados en cada gesto evaluado
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 bg-primary text-on-primary font-semibold text-xs rounded-lg inline-flex items-center gap-1.5"
            >
              <Icon name="description" className="text-[16px]" />
              Generar informe
            </button>
          </div>

          <div className="divide-y divide-outline-variant/15 border border-outline-variant/20 rounded-xl overflow-hidden">
            {gestures.map((gesture) => {
              const selectedCount = gesture.alteraciones.length;
              return (
                <div
                  key={gesture.gesto}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedGestureName(gesture.gesto);
                    setCurrentStep(2);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedGestureName(gesture.gesto);
                      setCurrentStep(2);
                    }
                  }}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-surface-container-low rounded-lg p-1 shrink-0 flex items-center justify-center border border-outline-variant/20">
                      {renderGestureSVG(gestureIcon(gesture.gesto), 'w-8 h-8')}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-on-surface block">{gesture.gesto}</span>
                      {gesture.comentarios && (
                        <span className="text-[11px] text-on-surface-variant block line-clamp-1">
                          {gesture.comentarios}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                        selectedCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {selectedCount > 0
                        ? `${selectedCount} criterio${selectedCount > 1 ? 's' : ''} hallado${selectedCount > 1 ? 's' : ''}`
                        : 'Sin alteraciones relevantes'}
                    </span>
                    <Icon name="chevron_right" className="text-[18px] text-on-surface-variant" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="w-full sm:w-auto px-8 py-2.5 bg-primary text-on-primary font-semibold text-xs rounded-lg"
            >
              Generar informe
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 5 */}
      {currentStep === 5 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sm:p-8 clinical-shadow space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/20 pb-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                <Icon name="directions_run" className="text-[22px]" />
              </div>
              <div>
                <span className="font-bold text-sm text-on-surface block leading-tight">KineSys</span>
                <span className="text-[10px] uppercase font-semibold text-primary tracking-wider">
                  Control de movimiento
                </span>
              </div>
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-base sm:text-lg font-bold text-on-surface uppercase">
                Informe de técnica y control del movimiento
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Icon name="warning" className="text-[16px] text-amber-600" />
              Usa “Guardar evaluación” para persistir en la bitácora
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3 bg-surface-container-low px-3 py-1 rounded inline-block">
              Hallazgos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs text-on-surface">
              <div className="space-y-3">
                {gestures.slice(0, Math.ceil(gestures.length / 2)).map((g) => (
                  <div key={g.gesto}>
                    <span className="font-extrabold text-on-surface block">{g.gesto}</span>
                    {g.alteraciones.length > 0 ? (
                      <ul className="list-disc pl-4 text-on-surface-variant mt-0.5 space-y-0.5">
                        {g.alteraciones.map((alt) => (
                          <li key={alt}>{alt}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-on-surface-variant pl-4">• Sin alteraciones relevantes.</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {gestures.slice(Math.ceil(gestures.length / 2)).map((g) => (
                  <div key={g.gesto}>
                    <span className="font-extrabold text-on-surface block">{g.gesto}</span>
                    {g.alteraciones.length > 0 ? (
                      <ul className="list-disc pl-4 text-on-surface-variant mt-0.5 space-y-0.5">
                        {g.alteraciones.map((alt) => (
                          <li key={alt}>{alt}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-on-surface-variant pl-4">• Sin alteraciones relevantes.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-outline-variant/15">
            <div className="md:col-span-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
              <h4 className="text-xs font-black uppercase tracking-wider text-on-surface mb-2">Recomendaciones</h4>
              <ul className="space-y-1.5 text-xs text-on-surface">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-6 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 mb-2">Conclusión</h4>
              <p className="text-xs text-on-surface leading-relaxed">{conclusion}</p>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-outline-variant/30 text-on-surface text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              Volver a gestos
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs font-semibold rounded-lg"
            >
              Ver resumen general
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
