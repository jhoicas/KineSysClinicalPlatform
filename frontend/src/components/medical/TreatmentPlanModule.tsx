import React, { useState, useEffect } from 'react';
import { TreatmentPlan, Exercise, LibraryExercise } from '../../types';
import {
  getExerciseLibrary,
  saveLibraryExercise,
  softDeleteLibraryExercise,
} from '../../services/dataService';
import { ExerciseModal } from './ExerciseModal';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { ExerciseLightboxModal } from './ExerciseLightboxModal';

interface TreatmentPlanModuleProps {
  planData: TreatmentPlan;
  onUpdatePlan: (plan: TreatmentPlan) => void;
  readOnly?: boolean;
  tenantId?: string;
}

export const TreatmentPlanModule: React.FC<TreatmentPlanModuleProps> = ({
  planData,
  onUpdatePlan,
  readOnly = false,
  tenantId,
}) => {
  const [currentPlan, setCurrentPlan] = useState<TreatmentPlan>(planData);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    setCurrentPlan(planData);
  }, [planData]);

  const refreshLibrary = async () => {
    if (!tenantId) {
      setLibrary([]);
      return;
    }
    try {
      const items = await getExerciseLibrary(tenantId);
      setLibrary(items);
    } catch (err) {
      console.error('Error loading exercise library:', err);
      setLibrary([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) {
        setLibrary([]);
        return;
      }
      try {
        const items = await getExerciseLibrary(tenantId);
        if (!cancelled) setLibrary(items);
      } catch (err) {
        console.error('Error loading exercise library:', err);
        if (!cancelled) setLibrary([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const handleAddLibraryExercise = async (newLibEx: LibraryExercise) => {
    if (!tenantId || readOnly) return;
    try {
      await saveLibraryExercise(tenantId, newLibEx);
      await refreshLibrary();
    } catch (err) {
      console.error('Error saving library exercise:', err);
    }
  };

  const handleEditLibraryExercise = async (updatedLibEx: LibraryExercise) => {
    if (!tenantId || readOnly) return;
    try {
      await saveLibraryExercise(tenantId, updatedLibEx);
      await refreshLibrary();
    } catch (err) {
      console.error('Error updating library exercise:', err);
    }
  };

  const handleDeleteLibraryExercise = async (id: string) => {
    if (!tenantId || readOnly) return;
    try {
      await softDeleteLibraryExercise(tenantId, id);
      await refreshLibrary();
    } catch (err) {
      console.error('Error deleting library exercise:', err);
    }
  };

  const handleToggleExerciseStatus = (id: string) => {
    if (readOnly) return;
    setCurrentPlan((prev) => {
      const updatedExercises = prev.exercises.map((ex) => {
        if (ex.id !== id) return ex;
        const nextStatus: Exercise['status'] =
          ex.status === 'completed' ? 'active' : 'completed';
        return { ...ex, status: nextStatus };
      });
      const nextPlan = { ...prev, exercises: updatedExercises };
      onUpdatePlan(nextPlan);
      return nextPlan;
    });
  };

  const handleDeleteAssignedExercise = (id: string, name: string) => {
    if (readOnly) return;
    if (window.confirm(`¿Quitar "${name}" del plan de tratamiento?`)) {
      const updatedExercises = currentPlan.exercises.filter((ex) => ex.id !== id);
      const nextPlan = { ...currentPlan, exercises: updatedExercises };
      setCurrentPlan(nextPlan);
      onUpdatePlan(nextPlan);
    }
  };

  const handleSaveExerciseModal = async (exercise: Exercise, saveToLib: boolean) => {
    if (readOnly) return;

    let updatedExercises: Exercise[];

    if (modalMode === 'edit') {
      updatedExercises = currentPlan.exercises.map((ex) =>
        ex.id === exercise.id ? exercise : ex
      );
    } else {
      updatedExercises = [exercise, ...currentPlan.exercises];
    }

    const nextPlan = { ...currentPlan, exercises: updatedExercises };
    setCurrentPlan(nextPlan);
    onUpdatePlan(nextPlan);

    if (saveToLib && tenantId) {
      const existingInLib = library.find(
        (l) => l.name.toLowerCase() === exercise.name.toLowerCase()
      );
      if (!existingInLib) {
        const newLibItem: LibraryExercise = {
          id: `lib-${Date.now()}`,
          name: exercise.name,
          category: exercise.category,
          targetMuscle: exercise.targetMuscle,
          defaultSets: exercise.sets,
          defaultRepsOrDuration: exercise.repsOrDuration,
          defaultRestSeconds: exercise.restSeconds,
          defaultFrequencyDaysPerWeek: exercise.frequencyDaysPerWeek,
          instructions: exercise.instructions,
          imageUrl: exercise.imageUrl,
          tags: [exercise.category, exercise.targetMuscle],
          difficulty: exercise.difficulty || 'Medio',
          equipment: 'Material kinésico',
          createdAt: new Date().toISOString().split('T')[0],
        };
        await handleAddLibraryExercise(newLibItem);
      } else if (exercise.imageUrl && !existingInLib.imageUrl) {
        await handleEditLibraryExercise({ ...existingInLib, imageUrl: exercise.imageUrl });
      }
    }

    setModalMode(null);
    setEditingExercise(null);
  };

  const handleAssignFromLibrary = (exerciseToAssign: Exercise) => {
    if (readOnly) return;
    const updatedExercises = [exerciseToAssign, ...currentPlan.exercises];
    const nextPlan = { ...currentPlan, exercises: updatedExercises };
    setCurrentPlan(nextPlan);
    onUpdatePlan(nextPlan);
  };

  const handleSaveAll = () => {
    if (readOnly) return;
    onUpdatePlan(currentPlan);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const progressPct = Math.min(
    100,
    Math.round(
      (currentPlan.sessionsCompleted /
        Math.max(currentPlan.totalSessionsPlanned, 1)) *
        100
    )
  );

  const filteredExercises = currentPlan.exercises.filter((ex) => {
    const matchesCategory =
      selectedCategory === 'Todas' || ex.category === selectedCategory;
    const query = searchFilter.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesName = ex.name.toLowerCase().includes(query);
    const matchesTarget = ex.targetMuscle.toLowerCase().includes(query);
    const matchesInstructions = ex.instructions.toLowerCase().includes(query);

    return matchesCategory && (matchesName || matchesTarget || matchesInstructions);
  });

  const categories = [
    'Todas',
    'Fuerza',
    'Control Motor',
    'Propiocepción',
    'Movilidad',
    'Postura',
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                PLAN DE TRATAMIENTO KINÉSICO
              </span>
              <span className="text-xs font-bold text-slate-700">
                {currentPlan.currentPhase}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Prescripción de Ejercicios y Readaptación
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-blue-600">menu_book</span>
              <span>Banco de Ejercicios ({library.length})</span>
            </button>

            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingExercise(null);
                    setModalMode('create');
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Nuevo Ejercicio</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {savedSuccess ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">save</span>
                  )}
                  <span>{savedSuccess ? 'Guardado' : 'Guardar Plan'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          <div className="md:col-span-8 bg-slate-50/90 p-4 rounded-2xl border border-slate-200 flex flex-col justify-center">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">my_location</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  OBJETIVO CLÍNICO PRINCIPAL
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug mt-0.5">
                  {currentPlan.objective}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-slate-50/90 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span>Sesiones del Plan</span>
                <span className="text-blue-600 font-extrabold">
                  {currentPlan.sessionsCompleted} / {currentPlan.totalSessionsPlanned} (
                  {progressPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium mt-2">
              <span>Inicio: {currentPlan.startDate}</span>
              <span>Estimado: {currentPlan.estimatedEndDate}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
            NOTAS CLÍNICAS DE ADHERENCIA, TOLERANCIA A CARGAS Y RETROALIMENTACIÓN
          </label>
          <textarea
            rows={2}
            disabled={readOnly}
            value={currentPlan.clinicalNotes}
            onChange={(e) =>
              setCurrentPlan({ ...currentPlan, clinicalNotes: e.target.value })
            }
            placeholder="Anotar feedback del paciente, respuesta neuromuscular o modificaciones en la carga de trabajo..."
            className="w-full text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">fitness_center</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Ejercicios Prescritos ({currentPlan.exercises.length})
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Con imágenes de referencia técnica, dosificación kinésica y criterios de ejecución
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filtrar ejercicios..."
                className="pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/60 font-medium w-36 sm:w-48"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">search</span>
              <span>Buscar en Banco</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredExercises.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">fitness_center</span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              No hay ejercicios prescritos que coincidan con la búsqueda
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Puedes buscar y asignar ejercicios desde el Banco de Ejercicios registrado o
              prescribir uno nuevo con su imagen.
            </p>
            {!readOnly && (
              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">menu_book</span>
                  <span>Explorar Banco de Ejercicios</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingExercise(null);
                    setModalMode('create');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
                >
                  <span>Crear Ejercicio Personalizado</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className={`bg-white rounded-3xl border shadow-xs transition-all overflow-hidden flex flex-col justify-between ${
                  ex.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="relative h-44 bg-slate-100 overflow-hidden group">
                    {ex.imageUrl ? (
                      <img
                        src={ex.imageUrl}
                        alt={ex.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                        <span className="material-symbols-outlined text-[32px] text-slate-300 mb-1">
                          image
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Sin imagen de referencia
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExercise(ex);
                              setModalMode('edit');
                            }}
                            className="mt-2 text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            + Adjuntar foto
                          </button>
                        )}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-60" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg shadow-xs ${
                          ex.category === 'Fuerza'
                            ? 'bg-blue-600 text-white'
                            : ex.category === 'Control Motor'
                            ? 'bg-slate-900 text-white'
                            : ex.category === 'Propiocepción'
                            ? 'bg-purple-600 text-white'
                            : ex.category === 'Postura'
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {ex.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {ex.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setInspectExercise(ex)}
                          className="w-8 h-8 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-colors shadow-xs"
                          title="Ver imagen ampliada"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_full</span>
                        </button>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleToggleExerciseStatus(ex.id)}
                        className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm flex items-center gap-1.5 transition-all disabled:cursor-not-allowed ${
                          ex.status === 'completed'
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-white/95 text-slate-800 border-white/80 hover:bg-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        <span>{ex.status === 'completed' ? 'Completado' : 'Activo'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug">
                        {ex.name}
                      </h3>
                      <p className="text-xs text-blue-700 font-bold mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">my_location</span>
                        <span>{ex.targetMuscle}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/90 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase">
                          SERIES / REPS
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {ex.sets} × {ex.repsOrDuration}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase">
                          DESCANSO
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {ex.restSeconds} seg
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase">
                          FRECUENCIA
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {ex.frequencyDaysPerWeek} d/sem
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/80">
                      <strong className="text-slate-800 font-bold">Criterio biomecánico: </strong>
                      {ex.instructions}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {ex.difficulty ? `Dificultad: ${ex.difficulty}` : 'Readaptación'}
                  </span>

                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExercise(ex);
                          setModalMode('edit');
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Editar parámetros o cambiar imagen"
                      >
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssignedExercise(ex.id, ex.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Quitar ejercicio"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {inspectExercise && (
        <ExerciseLightboxModal
          exercise={inspectExercise}
          onClose={() => setInspectExercise(null)}
        />
      )}

      {modalMode && (
        <ExerciseModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setEditingExercise(null);
          }}
          onSave={handleSaveExerciseModal}
          initialExercise={editingExercise}
          mode={modalMode}
          title={
            modalMode === 'create'
              ? 'Prescribir Nuevo Ejercicio al Paciente'
              : `Editar "${editingExercise?.name}"`
          }
          readOnly={readOnly}
        />
      )}

      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        library={library}
        tenantId={tenantId}
        onAssignToPlan={handleAssignFromLibrary}
        onAddLibraryExercise={handleAddLibraryExercise}
        onUpdateLibraryExercise={handleEditLibraryExercise}
        onDeleteLibraryExercise={handleDeleteLibraryExercise}
        assignedExerciseIds={currentPlan.exercises.map((e) => e.id)}
        readOnly={readOnly}
      />
    </div>
  );
};
