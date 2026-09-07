import React, { useState } from 'react';
import { MobilityAssessment, MobilityItem } from '../types';
import { AnatomyIcon } from './AnatomyIcons';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  Globe,
  Phone,
  Compass,
  Sliders,
} from 'lucide-react';

interface MobilityModuleProps {
  initialData: MobilityAssessment;
  onSave: (updated: MobilityAssessment) => void;
}

const COMMON_LIMITATIONS = [
  'Sin limitación evidenciada.',
  'Limitación en rotación hacia el lado izquierdo.',
  'Limitación en rotación hacia el lado derecho.',
  'Limitación de abducción en rango final.',
  'Limitación de flexión.',
  'Limitación de extensión.',
  'End-feel doloroso en tope articular.',
  'Restricción por acortamiento miofascial.',
  'Déficit de rotación interna glenohumeral (GIRD).',
  'Dorsiflexión reducida con rodilla en extensión.',
];

export const MobilityModule: React.FC<MobilityModuleProps> = ({
  initialData,
  onSave,
}) => {
  const [data, setData] = useState<MobilityAssessment>(initialData);
  const [showDegrees, setShowDegrees] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const cycleLimitation = (index: number, side: 'left' | 'right', direction: 'prev' | 'next') => {
    setData((prev) => {
      const newStructures = [...prev.structures];
      const item = { ...newStructures[index] };
      const currentText = side === 'left' ? item.leftLimitation : item.rightLimitation;

      let idx = COMMON_LIMITATIONS.indexOf(currentText);
      if (idx === -1) idx = 0;

      if (direction === 'next') {
        idx = (idx + 1) % COMMON_LIMITATIONS.length;
      } else {
        idx = (idx - 1 + COMMON_LIMITATIONS.length) % COMMON_LIMITATIONS.length;
      }

      const nextText = COMMON_LIMITATIONS[idx];
      const hasLimit = nextText !== 'Sin limitación evidenciada.';

      if (side === 'left') {
        item.leftLimitation = nextText;
        item.hasLeftLimitation = hasLimit;
      } else {
        item.rightLimitation = nextText;
        item.hasRightLimitation = hasLimit;
      }

      newStructures[index] = item;
      return { ...prev, structures: newStructures };
    });
  };

  const handleCustomTextChange = (index: number, side: 'left' | 'right', text: string) => {
    setData((prev) => {
      const newStructures = [...prev.structures];
      const item = { ...newStructures[index] };
      if (side === 'left') {
        item.leftLimitation = text;
        item.hasLeftLimitation = text.trim() !== '' && text !== 'Sin limitación evidenciada.';
      } else {
        item.rightLimitation = text;
        item.hasRightLimitation = text.trim() !== '' && text !== 'Sin limitación evidenciada.';
      }
      newStructures[index] = item;
      return { ...prev, structures: newStructures };
    });
  };

  const handleDegreeChange = (index: number, side: 'left' | 'right', val: number) => {
    setData((prev) => {
      const newStructures = [...prev.structures];
      const item = { ...newStructures[index] };
      if (side === 'left') {
        item.leftDegrees = val;
      } else {
        item.rightDegrees = val;
      }
      newStructures[index] = item;
      return { ...prev, structures: newStructures };
    });
  };

  const handleSave = () => {
    onSave(data);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Clinical Card Header matching Clean Minimalism */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative">
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-5 gap-4">
          <div className="flex items-center gap-3">
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
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 uppercase tracking-tight">
              EVALUACIÓN DE MOVILIDAD ARTICULAR
            </h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              LIMITACIONES DE MOVIMIENTO ESPECÍFICAS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDegrees(!showDegrees)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                showDegrees
                  ? 'bg-blue-50 border-blue-400 text-blue-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sliders size={14} />
              <span>{showDegrees ? 'Ocultar Grados (ROM)' : 'Ver Grados (ROM)'}</span>
            </button>
          </div>
        </div>

        {/* Table Content matching Image 1 */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200/90 shadow-xs">
          {/* Table Header Row */}
          <div className="grid grid-cols-12 bg-slate-900 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider text-center py-3.5 px-2">
            <div className="col-span-4 text-center px-2 flex items-center justify-center">
              LIMITACIÓN EVIDENCIADA LADO IZQUIERDO
            </div>
            <div className="col-span-4 text-center px-2 flex items-center justify-center border-x border-slate-700">
              ESTRUCTURA ANATÓMICA
            </div>
            <div className="col-span-4 text-center px-2 flex items-center justify-center">
              LIMITACIÓN EVIDENCIADA LADO DERECHO
            </div>
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-slate-100 bg-white">
            {data.structures.map((item, idx) => (
              <div
                key={item.structure}
                className={`grid grid-cols-12 items-center py-4 px-2 sm:px-4 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                } hover:bg-amber-50/20`}
              >
                {/* Lado Izquierdo */}
                <div className="col-span-4 flex items-center justify-between gap-1 sm:gap-3 px-1 sm:px-3">
                  <button
                    type="button"
                    onClick={() => cycleLimitation(idx, 'left', 'prev')}
                    className="p-1 rounded-full text-amber-600 hover:bg-amber-100/70 hover:text-amber-700 transition-colors shrink-0"
                    title="Anterior limitación"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="text"
                      value={item.leftLimitation}
                      onChange={(e) => handleCustomTextChange(idx, 'left', e.target.value)}
                      className={`w-full text-center text-xs sm:text-sm font-medium py-1 px-1.5 rounded border ${
                        item.hasLeftLimitation
                          ? 'border-amber-300 bg-amber-50/80 text-amber-950 font-semibold'
                          : 'border-transparent hover:border-slate-200 text-slate-700 bg-transparent'
                      }`}
                    />
                    {showDegrees && (
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        <span>Grados:</span>
                        <input
                          type="number"
                          value={item.leftDegrees || 0}
                          onChange={(e) => handleDegreeChange(idx, 'left', parseInt(e.target.value) || 0)}
                          className="w-12 text-center font-bold border border-slate-200 rounded px-1 py-0.5 text-slate-800"
                        />
                        <span>° / {item.normalDegrees}°</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => cycleLimitation(idx, 'left', 'next')}
                    className="p-1 rounded-full text-amber-600 hover:bg-amber-100/70 hover:text-amber-700 transition-colors shrink-0"
                    title="Siguiente limitación"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Estructura Anatómica Central */}
                <div className="col-span-4 flex items-center justify-center gap-3 border-x border-slate-100 px-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 hidden sm:block" />
                  <AnatomyIcon structure={item.structure} size={50} />
                  <div className="text-center sm:text-left min-w-[75px]">
                    <span className="font-extrabold text-xs sm:text-sm tracking-wide text-slate-800 uppercase block">
                      {item.structure}
                    </span>
                    {(item.hasLeftLimitation || item.hasRightLimitation) ? (
                      <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                        <AlertCircle size={10} /> Restricción
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 size={10} /> Libre
                      </span>
                    )}
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 hidden sm:block" />
                </div>

                {/* Lado Derecho */}
                <div className="col-span-4 flex items-center justify-between gap-1 sm:gap-3 px-1 sm:px-3">
                  <button
                    type="button"
                    onClick={() => cycleLimitation(idx, 'right', 'prev')}
                    className="p-1 rounded-full text-amber-600 hover:bg-amber-100/70 hover:text-amber-700 transition-colors shrink-0"
                    title="Anterior limitación"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="text"
                      value={item.rightLimitation}
                      onChange={(e) => handleCustomTextChange(idx, 'right', e.target.value)}
                      className={`w-full text-center text-xs sm:text-sm font-medium py-1 px-1.5 rounded border ${
                        item.hasRightLimitation
                          ? 'border-amber-300 bg-amber-50/80 text-amber-950 font-semibold'
                          : 'border-transparent hover:border-slate-200 text-slate-700 bg-transparent'
                      }`}
                    />
                    {showDegrees && (
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        <span>Grados:</span>
                        <input
                          type="number"
                          value={item.rightDegrees || 0}
                          onChange={(e) => handleDegreeChange(idx, 'right', parseInt(e.target.value) || 0)}
                          className="w-12 text-center font-bold border border-slate-200 rounded px-1 py-0.5 text-slate-800"
                        />
                        <span>° / {item.normalDegrees}°</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => cycleLimitation(idx, 'right', 'next')}
                    className="p-1 rounded-full text-amber-600 hover:bg-amber-100/70 hover:text-amber-700 transition-colors shrink-0"
                    title="Siguiente limitación"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observaciones Generales (matches Image 1) */}
        <div className="mt-6 bg-slate-50/70 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              💬
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              OBSERVACIONES GENERALES
            </h3>
          </div>
          <textarea
            rows={3}
            value={data.generalObservations}
            onChange={(e) => setData({ ...data, generalObservations: e.target.value })}
            placeholder="Espacio para observaciones y recomendaciones generales..."
            className="w-full text-xs sm:text-sm text-slate-700 p-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
        </div>

        {/* Save & Footer actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Globe size={14} className="text-amber-600" />
              www.corebody.com
            </span>
            <span className="flex items-center gap-1.5">
              <Phone size={14} className="text-blue-600" />
              +57 300 000 0000
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check size={16} />
                <span>¡Evaluación Guardada!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Guardar Movilidad Articular</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
