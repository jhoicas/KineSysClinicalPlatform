import React, { useEffect, useState } from 'react';
import { LibraryExercise, Exercise } from '../../types';
import { getExerciseLibrary } from '../../services/dataService';
import { ExerciseLightboxModal } from './ExerciseLightboxModal';
import { ExerciseModal } from './ExerciseModal';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Preferido: banco cargado por el padre. Si no hay, se hace fetch con tenantId. */
  library?: LibraryExercise[];
  tenantId?: string;
  onAssignToPlan: (exercise: Exercise) => void;
  onUpdateLibraryExercise: (exercise: LibraryExercise) => void | Promise<void>;
  onDeleteLibraryExercise: (id: string) => void | Promise<void>;
  onAddLibraryExercise: (exercise: LibraryExercise) => void | Promise<void>;
  assignedExerciseIds: string[];
  readOnly?: boolean;
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  isOpen,
  onClose,
  library: libraryProp,
  tenantId,
  onAssignToPlan,
  onUpdateLibraryExercise,
  onDeleteLibraryExercise,
  onAddLibraryExercise,
  assignedExerciseIds: _assignedExerciseIds,
  readOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  const [localLibrary, setLocalLibrary] = useState<LibraryExercise[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [recentlyAssignedId, setRecentlyAssignedId] = useState<string | null>(null);

  const fetchLibrary = async () => {
    if (!tenantId) {
      setLocalLibrary([]);
      return;
    }
    setLoadingLibrary(true);
    try {
      const items = await getExerciseLibrary(tenantId);
      setLocalLibrary(items);
    } catch (err) {
      console.error('Error loading exercise_library:', err);
      setLocalLibrary([]);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void fetchLibrary();
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (libraryProp) setLocalLibrary(libraryProp);
  }, [libraryProp]);

  if (!isOpen) return null;

  const library = localLibrary;

  const filteredExercises = library.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Todas' || item.category === selectedCategory;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesName = item.name.toLowerCase().includes(query);
    const matchesTarget = item.targetMuscle.toLowerCase().includes(query);
    const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
    const matchesEquip = item.equipment?.toLowerCase().includes(query);

    return matchesCategory && (matchesName || matchesTarget || matchesTags || matchesEquip);
  });

  const categories = ['Todas', 'Fuerza', 'Control Motor', 'Propiocepción', 'Movilidad', 'Postura'];

  const handleAssignClick = (libEx: LibraryExercise) => {
    if (readOnly) return;

    const exerciseToAssign: Exercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: libEx.name,
      category: libEx.category,
      targetMuscle: libEx.targetMuscle,
      sets: libEx.defaultSets,
      repsOrDuration: libEx.defaultRepsOrDuration,
      restSeconds: libEx.defaultRestSeconds,
      frequencyDaysPerWeek: libEx.defaultFrequencyDaysPerWeek,
      instructions: libEx.instructions,
      imageUrl: libEx.imageUrl,
      difficulty: libEx.difficulty,
      status: 'active',
    };

    onAssignToPlan(exerciseToAssign);
    setRecentlyAssignedId(libEx.id);
    setTimeout(() => setRecentlyAssignedId(null), 2000);
  };

  const handleOpenEdit = (libEx: LibraryExercise) => {
    if (readOnly) return;
    setEditingExercise(libEx);
    setModalMode('edit');
  };

  const handleOpenCreate = () => {
    if (readOnly) return;
    setEditingExercise(null);
    setModalMode('create');
  };

  const handleSaveModal = async (exercise: Exercise, _saveToLibrary: boolean) => {
    const libEx: LibraryExercise = {
      id: editingExercise?.id || `lib-${Date.now()}`,
      name: exercise.name,
      category: exercise.category,
      targetMuscle: exercise.targetMuscle,
      defaultSets: exercise.sets,
      defaultRepsOrDuration: exercise.repsOrDuration,
      defaultRestSeconds: exercise.restSeconds,
      defaultFrequencyDaysPerWeek: exercise.frequencyDaysPerWeek,
      instructions: exercise.instructions,
      imageUrl: exercise.imageUrl,
      tags: [exercise.category, exercise.targetMuscle].filter(Boolean),
      difficulty: exercise.difficulty || 'Medio',
      equipment: editingExercise?.equipment || 'Material kinésico',
      createdAt: editingExercise?.createdAt || new Date().toISOString().slice(0, 10),
    };

    if (modalMode === 'edit') {
      await onUpdateLibraryExercise(libEx);
    } else {
      await onAddLibraryExercise(libEx);
    }
    await fetchLibrary();
    setModalMode(null);
    setEditingExercise(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (readOnly) return;
    if (!window.confirm(`¿Eliminar "${name}" del banco de ejercicios?`)) return;
    await onDeleteLibraryExercise(id);
    await fetchLibrary();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full flex flex-col h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  Banco de Ejercicios y Readaptación
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {library.length} Ejercicios Registrados
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Busca, edita, adjunta imágenes y asigna ejercicios al plan del paciente actual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Registrar Ejercicio</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:px-6 bg-white border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined text-[16px] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre (ej. sentadilla), músculo (ej. glúteo, escápula), o equipo..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {loadingLibrary ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 gap-2">
              <span className="material-symbols-outlined animate-spin text-blue-600 text-3xl">sync</span>
              <p className="text-xs text-slate-500 font-medium">Cargando banco de ejercicios...</p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[24px]">search</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                No se encontraron ejercicios en el banco
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Prueba con otro término de búsqueda o registra un nuevo ejercicio con su imagen correspondiente.
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>Registrar este ejercicio ahora</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
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
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-[28px]">fitness_center</span>
                          <span className="text-[10px] mt-1">Sin imagen</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs ${
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
                        {ex.difficulty && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white">
                            {ex.difficulty}
                          </span>
                        )}
                      </div>

                      {ex.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setInspectExercise({
                              id: ex.id,
                              name: ex.name,
                              category: ex.category,
                              targetMuscle: ex.targetMuscle,
                              sets: ex.defaultSets,
                              repsOrDuration: ex.defaultRepsOrDuration,
                              restSeconds: ex.defaultRestSeconds,
                              frequencyDaysPerWeek: ex.defaultFrequencyDaysPerWeek,
                              instructions: ex.instructions,
                              imageUrl: ex.imageUrl,
                              status: 'active',
                            })
                          }
                          className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors shadow-sm"
                          title="Ver imagen ampliada"
                        >
                          <span className="material-symbols-outlined text-[13px]">open_in_full</span>
                        </button>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="font-black text-slate-900 text-sm leading-snug line-clamp-2">
                        {ex.name}
                      </h4>

                      <div className="flex items-center gap-1 text-[11px] text-blue-700 font-semibold">
                        <span className="material-symbols-outlined text-[12px] shrink-0">my_location</span>
                        <span className="truncate">{ex.targetMuscle}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span>
                          {ex.defaultSets} × {ex.defaultRepsOrDuration}
                        </span>
                        <span>{ex.defaultRestSeconds}s rest</span>
                        <span>{ex.defaultFrequencyDaysPerWeek} d/sem</span>
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {ex.instructions}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    {!readOnly ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ex)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar ejercicio del banco"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(ex.id, ex.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar del banco"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    ) : (
                      <div />
                    )}

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleAssignClick(ex)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                          recentlyAssignedId === ex.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        {recentlyAssignedId === ex.id ? (
                          <>
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>¡Asignado!</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Asignar al Plan</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando {filteredExercises.length} de {library.length} ejercicios registrados en el banco
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors"
          >
            Cerrar Catálogo
          </button>
        </div>
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
          onClose={() => setModalMode(null)}
          onSave={handleSaveModal}
          initialExercise={editingExercise}
          mode={modalMode}
          title={
            modalMode === 'create'
              ? 'Registrar Nuevo Ejercicio en el Banco'
              : 'Editar Ejercicio del Banco'
          }
        />
      )}
    </div>
  );
};
