import React, { useState } from 'react';
import {
  X,
  Search,
  Plus,
  Dumbbell,
  Check,
  Edit2,
  Trash2,
  Maximize2,
  BookOpen,
  Filter,
  Layers,
  Sparkles,
  Target,
} from 'lucide-react';
import { LibraryExercise, Exercise } from '../types';
import { ExerciseLightboxModal } from './ExerciseLightboxModal';
import { ExerciseModal } from './ExerciseModal';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: LibraryExercise[];
  onAssignToPlan: (exercise: Exercise) => void;
  onUpdateLibraryExercise: (exercise: LibraryExercise) => void;
  onDeleteLibraryExercise: (id: string) => void;
  onAddLibraryExercise: (exercise: LibraryExercise) => void;
  assignedExerciseIds: string[];
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  isOpen,
  onClose,
  library,
  onAssignToPlan,
  onUpdateLibraryExercise,
  onDeleteLibraryExercise,
  onAddLibraryExercise,
  assignedExerciseIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  
  // State for creating or editing library item
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [recentlyAssignedId, setRecentlyAssignedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter exercises by query & category
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
    setEditingExercise(libEx);
    setModalMode('edit');
  };

  const handleOpenCreate = () => {
    setEditingExercise(null);
    setModalMode('create');
  };

  const handleSaveModal = (exercise: Exercise) => {
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
      tags: editingExercise?.tags || [exercise.category, exercise.targetMuscle],
      difficulty: exercise.difficulty,
      equipment: editingExercise?.equipment || 'Material kinésico',
      createdAt: editingExercise?.createdAt || new Date().toISOString().split('T')[0],
    };

    if (modalMode === 'edit') {
      onUpdateLibraryExercise(libEx);
    } else {
      onAddLibraryExercise(libEx);
    }
    setModalMode(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full flex flex-col h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen size={20} />
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
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} />
              <span>Registrar Ejercicio</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:px-6 bg-white border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
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
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category pills */}
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

        {/* Exercise Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {filteredExercises.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Search size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                No se encontraron ejercicios en el banco
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Prueba con otro término de búsqueda o registra un nuevo ejercicio con su imagen correspondiente.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Registrar este ejercicio ahora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map((ex) => {
                return (
                  <div
                    key={ex.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    {/* Card Top: Reference Image */}
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
                            <Dumbbell size={28} />
                            <span className="text-[10px] mt-1">Sin imagen</span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs ${
                            ex.category === 'Fuerza'
                              ? 'bg-blue-600 text-white'
                              : ex.category === 'Control Motor'
                              ? 'bg-slate-900 text-white'
                              : ex.category === 'Propiocepción'
                              ? 'bg-purple-600 text-white'
                              : ex.category === 'Postura'
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {ex.category}
                          </span>
                          {ex.difficulty && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white">
                              {ex.difficulty}
                            </span>
                          )}
                        </div>

                        {/* Image preview / zoom button */}
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
                            <Maximize2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <h4 className="font-black text-slate-900 text-sm leading-snug line-clamp-2">
                          {ex.name}
                        </h4>

                        <div className="flex items-center gap-1 text-[11px] text-blue-700 font-semibold">
                          <Target size={12} className="shrink-0" />
                          <span className="truncate">{ex.targetMuscle}</span>
                        </div>

                        {/* Dose pills */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span>{ex.defaultSets} × {ex.defaultRepsOrDuration}</span>
                          <span>{ex.defaultRestSeconds}s rest</span>
                          <span>{ex.defaultFrequencyDaysPerWeek} d/sem</span>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {ex.instructions}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ex)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar ejercicio del banco"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar "${ex.name}" del banco de ejercicios?`)) {
                              onDeleteLibraryExercise(ex.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar del banco"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

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
                            <Check size={14} />
                            <span>¡Asignado!</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Asignar al Plan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
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

      {/* Inspect Lightbox Modal */}
      {inspectExercise && (
        <ExerciseLightboxModal
          exercise={inspectExercise}
          onClose={() => setInspectExercise(null)}
        />
      )}

      {/* Exercise Modal for Add/Edit within library */}
      {modalMode && (
        <ExerciseModal
          isOpen={true}
          onClose={() => setModalMode(null)}
          onSave={handleSaveModal}
          initialExercise={editingExercise}
          mode={modalMode}
          title={modalMode === 'create' ? 'Registrar Nuevo Ejercicio en el Banco' : 'Editar Ejercicio del Banco'}
        />
      )}
    </div>
  );
};
