import React, { useState, useEffect } from 'react';
import { X, Dumbbell, Save, Plus, Sparkles, BookOpen } from 'lucide-react';
import { Exercise, LibraryExercise } from '../types';
import { ExerciseImageUploader } from './ExerciseImageUploader';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: Exercise, saveToLibrary: boolean) => void;
  initialExercise?: Exercise | LibraryExercise | null;
  mode: 'create' | 'edit';
  title?: string;
}

export const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExercise,
  mode,
  title,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Exercise['category']>('Fuerza');
  const [targetMuscle, setTargetMuscle] = useState('');
  const [sets, setSets] = useState(3);
  const [repsOrDuration, setRepsOrDuration] = useState('10 - 12 reps');
  const [restSeconds, setRestSeconds] = useState(60);
  const [frequencyDaysPerWeek, setFrequencyDaysPerWeek] = useState(3);
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [difficulty, setDifficulty] = useState<'Bajo' | 'Medio' | 'Avanzado'>('Medio');
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  useEffect(() => {
    if (initialExercise) {
      setName(initialExercise.name || '');
      setCategory(initialExercise.category || 'Fuerza');
      setTargetMuscle(initialExercise.targetMuscle || '');
      
      if ('sets' in initialExercise) {
        setSets(initialExercise.sets || 3);
        setRepsOrDuration(initialExercise.repsOrDuration || '10 - 12 reps');
        setRestSeconds(initialExercise.restSeconds || 60);
        setFrequencyDaysPerWeek(initialExercise.frequencyDaysPerWeek || 3);
      } else if ('defaultSets' in initialExercise) {
        setSets(initialExercise.defaultSets || 3);
        setRepsOrDuration(initialExercise.defaultRepsOrDuration || '10 - 12 reps');
        setRestSeconds(initialExercise.defaultRestSeconds || 60);
        setFrequencyDaysPerWeek(initialExercise.defaultFrequencyDaysPerWeek || 3);
      }

      setInstructions(initialExercise.instructions || '');
      setImageUrl(initialExercise.imageUrl || '');
      setDifficulty((initialExercise as any).difficulty || 'Medio');
    } else {
      // Defaults for new exercise
      setName('');
      setCategory('Fuerza');
      setTargetMuscle('');
      setSets(3);
      setRepsOrDuration('10 - 12 reps');
      setRestSeconds(60);
      setFrequencyDaysPerWeek(3);
      setInstructions('');
      setImageUrl('');
      setDifficulty('Medio');
      setSaveToLibrary(true);
    }
  }, [initialExercise, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const exerciseData: Exercise = {
      id: initialExercise?.id || `ex-${Date.now()}`,
      name: name.trim(),
      category,
      targetMuscle: targetMuscle.trim() || 'Estabilizadores articulares',
      sets: Number(sets) || 3,
      repsOrDuration: repsOrDuration.trim() || '10-12 reps',
      restSeconds: Number(restSeconds) || 60,
      frequencyDaysPerWeek: Number(frequencyDaysPerWeek) || 3,
      instructions: instructions.trim() || 'Ejecutar con control excéntrico y alineación articular adecuada.',
      imageUrl: imageUrl.trim() || undefined,
      difficulty,
      status: (initialExercise as any)?.status || 'active',
    };

    onSave(exerciseData, saveToLibrary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Dumbbell size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {title || (mode === 'create' ? 'Prescribir Nuevo Ejercicio' : 'Editar Ejercicio')}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {mode === 'create'
                  ? 'Configura la dosificación e imagen de referencia técnica'
                  : 'Modifica parámetros clínicos o la imagen de referencia'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Exercise Name */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Nombre del Ejercicio *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Sentadilla Búlgara con mancuerna contralateral"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 text-xs"
            />
          </div>

          {/* Category, Muscle and Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Categoría Clínica
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs"
              >
                <option value="Fuerza">Fuerza</option>
                <option value="Control Motor">Control Motor</option>
                <option value="Propiocepción">Propiocepción</option>
                <option value="Movilidad">Movilidad</option>
                <option value="Postura">Postura</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Músculo o Enfoque Diana
              </label>
              <input
                type="text"
                placeholder="Ej. Glúteo medio, Cuádriceps"
                value={targetMuscle}
                onChange={(e) => setTargetMuscle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nivel de Dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs"
              >
                <option value="Bajo">Bajo (Básico)</option>
                <option value="Medio">Medio (Intermedio)</option>
                <option value="Avanzado">Avanzado (Deportivo)</option>
              </select>
            </div>
          </div>

          {/* Dosification Grid */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
              Dosificación y Carga Kinésica
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Series</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value) || 1)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-center font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Reps o Tiempo</label>
                <input
                  type="text"
                  placeholder="10-12 reps"
                  value={repsOrDuration}
                  onChange={(e) => setRepsOrDuration(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-center font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Descanso (seg)</label>
                <input
                  type="number"
                  step="15"
                  min="0"
                  max="300"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(parseInt(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-center font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Frecuencia (d/sem)</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={frequencyDaysPerWeek}
                  onChange={(e) => setFrequencyDaysPerWeek(parseInt(e.target.value) || 1)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-center font-bold text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Exercise Image Uploader */}
          <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
            <ExerciseImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              title="Imagen de Referencia del Ejercicio (Foto o Ilustración)"
            />
          </div>

          {/* Clinical Instructions */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Indicaciones Técnicas y Criterios de Alineación Biomecánica
            </label>
            <textarea
              rows={3}
              placeholder="Instrucciones sobre cadencia excéntrica, alineación de articulaciones, control de respiración o qué sensaciones evitar..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-normal text-slate-700 text-xs leading-relaxed"
            />
          </div>

          {/* Checkbox: Save to Library */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="saveToLib"
              checked={saveToLibrary}
              onChange={(e) => setSaveToLibrary(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="saveToLib" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
              <BookOpen size={14} className="text-blue-600" />
              <span>Guardar también en el Banco de Ejercicios permanente para futuras asignaciones</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              {mode === 'create' ? <Plus size={16} /> : <Save size={16} />}
              <span>{mode === 'create' ? 'Guardar y Prescribir' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
