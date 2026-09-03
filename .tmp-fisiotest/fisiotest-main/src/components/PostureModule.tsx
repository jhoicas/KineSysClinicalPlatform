import React, { useState, useRef } from 'react';
import { PostureAssessment } from '../types';
import { HumanBodyVisualizer } from './HumanBodyVisualizer';
import {
  Check,
  RotateCcw,
  Save,
  Zap,
  Sparkles,
  Info,
  Layers,
  Crosshair,
  Compass,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PostureModuleProps {
  initialData: PostureAssessment;
  onSave: (updated: PostureAssessment) => void;
}

export const PostureModule: React.FC<PostureModuleProps> = ({
  initialData,
  onSave,
}) => {
  const [posture, setPosture] = useState<PostureAssessment>(initialData);
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'anterior' | 'lateral' | 'posterior'>('all');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeLandmarkHighlight, setActiveLandmarkHighlight] = useState<string | null>(null);

  // Shared visualizer settings for all views
  const [viewMode, setViewMode] = useState<'muscular' | 'skeletal'>('muscular');
  const [showPlumbLine, setShowPlumbLine] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);
  const [showGhostIdeal, setShowGhostIdeal] = useState<boolean>(true);

  const anteriorRef = useRef<HTMLDivElement>(null);
  const lateralRef = useRef<HTMLDivElement>(null);
  const posteriorRef = useRef<HTMLDivElement>(null);

  const handleUpdateAnterior = (field: keyof PostureAssessment['anterior'], value: any) => {
    setPosture((prev) => ({
      ...prev,
      anterior: { ...prev.anterior, [field]: value },
    }));
  };

  const handleUpdateLateral = (field: keyof PostureAssessment['lateral'], value: any) => {
    setPosture((prev) => ({
      ...prev,
      lateral: { ...prev.lateral, [field]: value },
    }));
  };

  const handleUpdatePosterior = (field: keyof PostureAssessment['posterior'], value: any) => {
    setPosture((prev) => ({
      ...prev,
      posterior: { ...prev.posterior, [field]: value },
    }));
  };

  const handleSelectLandmarkFromModel = (view: 'anterior' | 'lateral' | 'posterior', part: string) => {
    setActiveLandmarkHighlight(`${view}-${part}`);
    setTimeout(() => setActiveLandmarkHighlight(null), 3000);

    if (view === 'anterior' && anteriorRef.current) {
      anteriorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (view === 'lateral' && lateralRef.current) {
      lateralRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (view === 'posterior' && posteriorRef.current) {
      posteriorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleSave = () => {
    onSave(posture);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToNormal = () => {
    setPosture({
      ...posture,
      anterior: {
        cabeza: 'Alineada',
        hombros: 'Simétricos',
        pelvis: 'Nivelada',
        rodillas: 'Alineadas',
        pies: 'Alineados',
      },
      lateral: {
        cabeza: 'Alineada',
        hombros: 'Alineados',
        columnaDorsal: 'Normal',
        columnaLumbar: 'Normal',
        pelvis: 'Neutra',
        rodillas: 'Neutras',
      },
      posterior: {
        escapulas: 'Simétricas',
        columna: 'Alineada',
        pelvis: 'Simétrica',
        talones: 'Alineados',
      },
      conceptoPostural: 'Adecuado',
    });
  };

  // Preset scenarios
  const applyKyphosisValgusPreset = () => {
    setPosture((prev) => ({
      ...prev,
      anterior: {
        ...prev.anterior,
        hombros: 'Elevado D',
        rodillas: 'Valgo',
        pies: 'Pronación',
      },
      lateral: {
        ...prev.lateral,
        cabeza: 'Anteriorizada',
        hombros: 'Protracción',
        columnaDorsal: 'Hipercifosis',
        columnaLumbar: 'Hiperlordosis',
        pelvis: 'Anteversión',
      },
      conceptoPostural: 'Alteración marcada',
    }));
  };

  const applyScoliosisPreset = () => {
    setPosture((prev) => ({
      ...prev,
      anterior: {
        ...prev.anterior,
        cabeza: 'Derecha',
        hombros: 'Elevado I',
        pelvis: 'Elevada D',
        rodillas: 'Varo',
      },
      posterior: {
        ...prev.posterior,
        escapulas: 'Escápula alada',
        columna: 'Desviación derecha',
        pelvis: 'Asimetría',
      },
      conceptoPostural: 'Alteración moderada',
    }));
  };

  // Deviations count calculations
  const anteriorDeviations = [
    posture.anterior.cabeza !== 'Alineada',
    posture.anterior.hombros !== 'Simétricos',
    posture.anterior.pelvis !== 'Nivelada',
    posture.anterior.rodillas !== 'Alineadas',
    posture.anterior.pies !== 'Alineados',
  ].filter(Boolean).length;

  const lateralDeviations = [
    posture.lateral.cabeza !== 'Alineada',
    posture.lateral.hombros !== 'Alineados',
    posture.lateral.columnaDorsal !== 'Normal',
    posture.lateral.columnaLumbar !== 'Normal',
    posture.lateral.pelvis !== 'Neutra',
    posture.lateral.rodillas !== 'Neutras',
  ].filter(Boolean).length;

  const posteriorDeviations = [
    posture.posterior.escapulas !== 'Simétricas',
    posture.posterior.columna !== 'Alineada',
    posture.posterior.pelvis !== 'Simétrica',
    posture.posterior.talones !== 'Alineados',
  ].filter(Boolean).length;

  const totalDeviations = anteriorDeviations + lateralDeviations + posteriorDeviations;
  const symmetryScore = Math.max(20, Math.round(100 - totalDeviations * 6.5));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Interactive Presets */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              VALORACIÓN POSTURAL
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Parámetros Frente a Cada Vista
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Los parámetros de cada plano están situados directamente en frente de su respectiva silueta anatómica interactiva
          </p>
        </div>

        {/* Action Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyKyphosisValgusPreset}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Probar deformación combinada: Hipercifosis + Valgo + Pronación"
          >
            <Zap size={13} className="text-blue-600" />
            <span>Caso Cifosis + Valgo</span>
          </button>
          <button
            type="button"
            onClick={applyScoliosisPreset}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Probar deformación de Escoliosis dorsal + Escápula alada"
          >
            <Sparkles size={13} className="text-blue-600" />
            <span>Caso Escoliosis</span>
          </button>
          <button
            type="button"
            onClick={handleResetToNormal}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Restablecer alineación postural a neutra"
          >
            <RotateCcw size={13} />
            <span>Postura Neutra</span>
          </button>
        </div>
      </div>

      {/* Biomechanical Controls & Perspective Selector Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* View Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider pl-1">
            Vistas:
          </span>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {(['all', 'anterior', 'lateral', 'posterior'] as const).map((viewKey) => (
              <button
                key={viewKey}
                type="button"
                onClick={() => setActiveViewTab(viewKey)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                  activeViewTab === viewKey
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {viewKey === 'all' ? 'Todas las vistas' : `Vista ${viewKey}`}
              </button>
            ))}
          </div>
        </div>

        {/* Visualizer Layer Tools */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'muscular' ? 'skeletal' : 'muscular')}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'skeletal'
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Alternar entre silueta muscular y ejes esqueléticos biomecánicos"
          >
            <Layers size={14} className={viewMode === 'skeletal' ? 'text-blue-600' : 'text-slate-500'} />
            <span className="hidden sm:inline">{viewMode === 'muscular' ? 'Modo Muscular' : 'Ejes Esqueléticos'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPlumbLine(!showPlumbLine)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
              showPlumbLine
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
            title="Línea de gravedad / plomada vertical de referencia"
          >
            <Crosshair size={14} className={showPlumbLine ? 'text-blue-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">Línea de Plomada</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAngles(!showAngles)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
              showAngles
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
            title="Mostrar grados angulares y milímetros de desviación"
          >
            <Compass size={14} className={showAngles ? 'text-blue-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">Ángulos & Ejes</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGhostIdeal(!showGhostIdeal)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
              showGhostIdeal
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
            title="Superpone la silueta fantasma en postura neutra ideal para comparar las desviaciones"
          >
            <Eye size={14} className={showGhostIdeal ? 'text-emerald-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">Comparar con Ideal</span>
          </button>
        </div>

        {/* Global Postural Status */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold border border-slate-200">
            <span>Simetría Global:</span>
            <span
              className={`font-bold ${
                symmetryScore >= 85
                  ? 'text-emerald-600'
                  : symmetryScore >= 65
                  ? 'text-blue-600'
                  : 'text-amber-600'
              }`}
            >
              {symmetryScore}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium hidden md:block">
            {totalDeviations === 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} /> Alineación Neutra
              </span>
            ) : (
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <AlertTriangle size={13} className="text-blue-600" /> {totalDeviations} hallazgos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISTA ANTERIOR (Frontal Coronal Plane) - MODEL & CONTROLS IN FRONT */}
      {/* ========================================================================= */}
      {(activeViewTab === 'all' || activeViewTab === 'anterior') && (
        <div
          ref={anteriorRef}
          className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs space-y-5 transition-all ${
            activeLandmarkHighlight?.startsWith('anterior')
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-200'
          }`}
        >
          {/* View Section Header */}
          <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0" />
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                VISTA ANTERIOR (PLANO CORONAL)
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                5 Parámetros
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {anteriorDeviations === 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Alineación Frontal Equilibrada
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-blue-600" />
                  {anteriorDeviations} asimetría(s) detectada(s)
                </span>
              )}
            </div>
          </div>

          {/* Side-by-side Paired Grid: Model on Left, Parameters in Front on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-center">
            {/* Maniquí Anatómico de la Vista Anterior */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 relative">
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2 px-2">
                <span>MODELO ANTERIOR</span>
                <span className="text-slate-400 font-medium">Haga clic en los puntos anatómicos</span>
              </div>
              <div className="w-full flex justify-center">
                <HumanBodyVisualizer
                  posture={posture}
                  activeView="anterior"
                  onSelectLandmark={handleSelectLandmarkFromModel}
                  viewMode={viewMode}
                  showPlumbLine={showPlumbLine}
                  showAngles={showAngles}
                  showGhostIdeal={showGhostIdeal}
                  hideToolbar={true}
                  hideCardWrapper={true}
                  hideViewTitle={true}
                />
              </div>
            </div>

            {/* Parámetros de la Vista Anterior (Justo Enfrente) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Cabeza */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Cabeza
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.anterior.cabeza}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Alineada', 'Derecha', 'Izquierda'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateAnterior('cabeza', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.anterior.cabeza === opt
                          ? opt === 'Alineada'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Alineada' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hombros */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Hombros (Eje Biacromial)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.anterior.hombros}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Simétricos', 'Elevado D', 'Elevado I'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateAnterior('hombros', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.anterior.hombros === opt
                          ? opt === 'Simétricos'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Simétricos' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pelvis */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Pelvis (Crestas Ilíacas)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.anterior.pelvis}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Nivelada', 'Elevada D', 'Elevada I'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateAnterior('pelvis', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.anterior.pelvis === opt
                          ? opt === 'Nivelada'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Nivelada' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rodillas */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Rodillas (Ángulo Q)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.anterior.rodillas}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Alineadas', 'Valgo', 'Varo'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateAnterior('rodillas', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.anterior.rodillas === opt
                          ? opt === 'Alineadas'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Alineadas' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pies */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Pies (Apoyo Plantar)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.anterior.pies}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Alineados', 'Pronación', 'Supinación'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateAnterior('pies', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.anterior.pies === opt
                          ? opt === 'Alineados'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Alineados' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VISTA LATERAL (Sagittal Plane) - MODEL & CONTROLS IN FRONT */}
      {/* ========================================================================= */}
      {(activeViewTab === 'all' || activeViewTab === 'lateral') && (
        <div
          ref={lateralRef}
          className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs space-y-5 transition-all ${
            activeLandmarkHighlight?.startsWith('lateral')
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-200'
          }`}
        >
          {/* View Section Header */}
          <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0" />
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                VISTA LATERAL (PLANO SAGITAL)
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                6 Parámetros
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {lateralDeviations === 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Curvaturas Sagitales Fisiológicas
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-blue-600" />
                  {lateralDeviations} alteración(es) activa(s)
                </span>
              )}
            </div>
          </div>

          {/* Side-by-side Paired Grid: Model on Left, Parameters in Front on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-center">
            {/* Maniquí Anatómico de la Vista Lateral */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 relative">
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2 px-2">
                <span>MODELO SAGITAL</span>
                <span className="text-slate-400 font-medium">Haga clic en los puntos anatómicos</span>
              </div>
              <div className="w-full flex justify-center">
                <HumanBodyVisualizer
                  posture={posture}
                  activeView="lateral"
                  onSelectLandmark={handleSelectLandmarkFromModel}
                  viewMode={viewMode}
                  showPlumbLine={showPlumbLine}
                  showAngles={showAngles}
                  showGhostIdeal={showGhostIdeal}
                  hideToolbar={true}
                  hideCardWrapper={true}
                  hideViewTitle={true}
                />
              </div>
            </div>

            {/* Parámetros de la Vista Lateral (Justo Enfrente) */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Cabeza */}
              <div className="bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Cabeza (Antepulsión)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.lateral.cabeza}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['Alineada', 'Anteriorizada'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateLateral('cabeza', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.lateral.cabeza === opt
                          ? opt === 'Alineada'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Alineada' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hombros */}
              <div className="bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Hombros (Posición Sagital)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.lateral.hombros}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['Alineados', 'Protracción'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateLateral('hombros', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.lateral.hombros === opt
                          ? opt === 'Alineados'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Alineados' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Columna Dorsal */}
              <div className="bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Columna Dorsal (Cifosis)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.lateral.columnaDorsal}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['Normal', 'Hipercifosis'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateLateral('columnaDorsal', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.lateral.columnaDorsal === opt
                          ? opt === 'Normal'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Normal' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Columna Lumbar */}
              <div className="bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Columna Lumbar (Lordosis)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.lateral.columnaLumbar}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Normal', 'Hiperlordosis', 'Rectificación'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateLateral('columnaLumbar', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1 ${
                        posture.lateral.columnaLumbar === opt
                          ? opt === 'Normal'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          opt === 'Normal' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate text-[11px]">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pelvis Sagital */}
              <div className="bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Pelvis (Báscula Sagital)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.lateral.pelvis}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Neutra', 'Anteversión', 'Retroversión'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateLateral('pelvis', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1 ${
                        posture.lateral.pelvis === opt
                          ? opt === 'Neutra'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          opt === 'Neutra' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate text-[11px]">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rodillas Sagital */}
              <div className="bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Rodillas (Extensión Sagital)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.lateral.rodillas}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Neutras', 'Flexum', 'Recurvatum'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdateLateral('rodillas', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1 ${
                        posture.lateral.rodillas === opt
                          ? opt === 'Neutras'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          opt === 'Neutras' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate text-[11px]">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISTA POSTERIOR (Dorsal Plane) - MODEL & CONTROLS IN FRONT */}
      {/* ========================================================================= */}
      {(activeViewTab === 'all' || activeViewTab === 'posterior') && (
        <div
          ref={posteriorRef}
          className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs space-y-5 transition-all ${
            activeLandmarkHighlight?.startsWith('posterior')
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-200'
          }`}
        >
          {/* View Section Header */}
          <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0" />
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                VISTA POSTERIOR (PLANO DORSAL)
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                4 Parámetros
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {posteriorDeviations === 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Eje Dorsal & Escapular Simétrico
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-blue-600" />
                  {posteriorDeviations} alteración(es) activa(s)
                </span>
              )}
            </div>
          </div>

          {/* Side-by-side Paired Grid: Model on Left, Parameters in Front on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-center">
            {/* Maniquí Anatómico de la Vista Posterior */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 relative">
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2 px-2">
                <span>MODELO POSTERIOR</span>
                <span className="text-slate-400 font-medium">Haga clic en los puntos anatómicos</span>
              </div>
              <div className="w-full flex justify-center">
                <HumanBodyVisualizer
                  posture={posture}
                  activeView="posterior"
                  onSelectLandmark={handleSelectLandmarkFromModel}
                  viewMode={viewMode}
                  showPlumbLine={showPlumbLine}
                  showAngles={showAngles}
                  showGhostIdeal={showGhostIdeal}
                  hideToolbar={true}
                  hideCardWrapper={true}
                  hideViewTitle={true}
                />
              </div>
            </div>

            {/* Parámetros de la Vista Posterior (Justo Enfrente) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Escápulas */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Escápulas
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.posterior.escapulas}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Simétricas', 'Asimetría', 'Escápula alada'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdatePosterior('escapulas', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1 ${
                        posture.posterior.escapulas === opt
                          ? opt === 'Simétricas'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          opt === 'Simétricas' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate text-[11px]">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Columna Vertebral Posterior */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Columna (Escoliosis / Desviación Lateral)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.posterior.columna}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Alineada', 'Desviación derecha', 'Desviación izquierda'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdatePosterior('columna', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1 ${
                        posture.posterior.columna === opt
                          ? opt === 'Alineada'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          opt === 'Alineada' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate text-[11px]">
                        {opt === 'Alineada' ? 'Alineada' : opt === 'Desviación derecha' ? 'Curva Der' : 'Curva Izq'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pelvis Posterior */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Pelvis Posterior (EIPS)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.posterior.pelvis}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['Simétrica', 'Asimetría'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdatePosterior('pelvis', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.posterior.pelvis === opt
                          ? opt === 'Simétrica'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Simétrica' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Talones / Tendón de Aquiles */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Talones (Tendón de Aquiles)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">{posture.posterior.talones}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['Alineados', 'Valgo', 'Varo'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUpdatePosterior('talones', opt)}
                      className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                        posture.posterior.talones === opt
                          ? opt === 'Alineados'
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          opt === 'Alineados' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Notes & Diagnostic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* OBSERVACIÓN FISIOTERAPÉUTICA */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                OBSERVACIONES FISIOTERAPÉUTICAS
              </h2>
              <span className="text-[11px] text-slate-400">
                {posture.observacion?.length || 0} caracteres
              </span>
            </div>
            <textarea
              rows={4}
              value={posture.observacion}
              onChange={(e) => setPosture({ ...posture, observacion: e.target.value })}
              placeholder="Describa compensaciones musculares, cadenas lesionales activas o hallazgos clave..."
              className="w-full text-xs text-slate-700 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none bg-slate-50/50 leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Info size={14} className="text-blue-600" />
              Sincronizado automáticamente con el Informe Clínico
            </span>
          </div>
        </div>

        {/* CONCEPTO POSTURAL GLOBAL & SAVE */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">
              CONCEPTO POSTURAL GLOBAL
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Adecuado', color: 'bg-emerald-500', active: 'border-emerald-600 bg-emerald-50 text-emerald-950' },
                { label: 'Alteración leve', color: 'bg-blue-500', active: 'border-blue-600 bg-blue-50 text-blue-950' },
                { label: 'Alteración moderada', color: 'bg-amber-500', active: 'border-amber-600 bg-amber-50 text-amber-950' },
                { label: 'Alteración marcada', color: 'bg-red-500', active: 'border-red-600 bg-red-50 text-red-950' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setPosture({ ...posture, conceptoPostural: item.label as any })}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                    posture.conceptoPostural === item.label
                      ? `${item.active} font-bold shadow-xs`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 hover:shadow-md cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check size={16} className="text-white" />
                  <span>¡Valoración Postural Guardada con Éxito!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar Valoración Postural</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
