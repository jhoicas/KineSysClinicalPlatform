import React from 'react';
import { Exercise } from '../../types';

interface ExerciseLightboxModalProps {
  exercise: Exercise | null;
  onClose: () => void;
}

export const ExerciseLightboxModal: React.FC<ExerciseLightboxModalProps> = ({
  exercise,
  onClose,
}) => {
  if (!exercise) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {exercise.category}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Referencia Visual del Ejercicio
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <div className="relative bg-slate-900 flex items-center justify-center max-h-[380px] overflow-hidden">
          {exercise.imageUrl ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              referrerPolicy="no-referrer"
              className="w-full h-[380px] object-cover object-center"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80';
              }}
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <span className="material-symbols-outlined text-[40px] text-slate-500">fitness_center</span>
              <p className="text-xs">Sin imagen de referencia adjunta</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-6 pt-12 text-white">
            <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight">
              {exercise.name}
            </h2>
            <p className="text-xs text-blue-300 font-semibold mt-0.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">my_location</span>
              <span>{exercise.targetMuscle}</span>
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                DOSIFICACIÓN
              </span>
              <span className="text-sm font-black text-slate-900">
                {exercise.sets} series × {exercise.repsOrDuration}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                PAUSA INTERSERIE
              </span>
              <span className="text-sm font-black text-slate-900">
                {exercise.restSeconds} segundos
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                FRECUENCIA
              </span>
              <span className="text-sm font-black text-slate-900">
                {exercise.frequencyDaysPerWeek} días / sem
              </span>
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-1.5">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-blue-600">info</span>
              Criterios Técnicos y Biomecánicos
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {exercise.instructions}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
