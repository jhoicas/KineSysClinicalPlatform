import React, { useState } from 'react';
import { PainMapAssessment, PainPoint, PainType, PainDuration, Patient } from '../types';
import { PainMapVisualizer, getEvaColor, getEvaBadgeClass } from './PainMapVisualizer';
import {
  Flame,
  Plus,
  Trash2,
  Edit3,
  Download,
  Copy,
  Check,
  Upload,
  FileJson,
  FileText,
  Save,
  Info,
  Layers,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface PainMapModuleProps {
  patient: Patient;
  initialData: PainMapAssessment;
  onSave: (updated: PainMapAssessment) => void;
  onNavigateToReports?: () => void;
}

const PRESET_REGIONS: {
  id: string;
  name: string;
  view: 'anterior' | 'posterior';
  x: number;
  y: number;
}[] = [
  { id: 'anterior-cervical', name: 'Cuello / Cervical Anterior', view: 'anterior', x: 50, y: 17 },
  { id: 'anterior-shoulder-r', name: 'Hombro Derecho Anterior', view: 'anterior', x: 32, y: 22 },
  { id: 'anterior-shoulder-l', name: 'Hombro Izquierdo Anterior', view: 'anterior', x: 68, y: 22 },
  { id: 'anterior-chest', name: 'Pectoral / Tórax', view: 'anterior', x: 50, y: 28 },
  { id: 'anterior-elbow-r', name: 'Codo Derecho (Epicóndilo)', view: 'anterior', x: 23, y: 39 },
  { id: 'anterior-elbow-l', name: 'Codo Izquierdo', view: 'anterior', x: 77, y: 39 },
  { id: 'anterior-wrist-r', name: 'Muñeca Derecha', view: 'anterior', x: 14, y: 58 },
  { id: 'anterior-wrist-l', name: 'Muñeca Izquierda', view: 'anterior', x: 86, y: 58 },
  { id: 'anterior-hip-r', name: 'Cadera / Ingle Derecha', view: 'anterior', x: 41, y: 53 },
  { id: 'anterior-hip-l', name: 'Cadera / Ingle Izquierda', view: 'anterior', x: 59, y: 53 },
  { id: 'anterior-knee-r', name: 'Rodilla Derecha (Patela)', view: 'anterior', x: 38, y: 73 },
  { id: 'anterior-knee-l', name: 'Rodilla Izquierda (Patela)', view: 'anterior', x: 62, y: 73 },
  { id: 'anterior-ankle-r', name: 'Tobillo Derecho', view: 'anterior', x: 37, y: 92 },
  { id: 'anterior-ankle-l', name: 'Tobillo Izquierdo', view: 'anterior', x: 63, y: 92 },

  // Posterior
  { id: 'posterior-cervical', name: 'Nuca / Cervical Posterior', view: 'posterior', x: 50, y: 17 },
  { id: 'posterior-trapezius-r', name: 'Trapecio Superior D', view: 'posterior', x: 39, y: 22 },
  { id: 'posterior-trapezius-l', name: 'Trapecio Superior I', view: 'posterior', x: 61, y: 22 },
  { id: 'posterior-scapula-r', name: 'Escápula Derecha', view: 'posterior', x: 38, y: 27 },
  { id: 'posterior-scapula-l', name: 'Escápula Izquierda', view: 'posterior', x: 62, y: 27 },
  { id: 'posterior-dorsal', name: 'Columna Dorsal Media', view: 'posterior', x: 50, y: 32 },
  { id: 'posterior-lumbar', name: 'Columna Lumbar Baja', view: 'posterior', x: 50, y: 46 },
  { id: 'posterior-glute-r', name: 'Glúteo / Piramidal D', view: 'posterior', x: 42, y: 56 },
  { id: 'posterior-glute-l', name: 'Glúteo / Piramidal I', view: 'posterior', x: 58, y: 56 },
  { id: 'posterior-hamstring-r', name: 'Isquiosurales Derechos', view: 'posterior', x: 40, y: 66 },
  { id: 'posterior-hamstring-l', name: 'Isquiosurales Izquierdos', view: 'posterior', x: 60, y: 66 },
  { id: 'posterior-achilles-r', name: 'Tendón de Aquiles D', view: 'posterior', x: 38, y: 88 },
  { id: 'posterior-achilles-l', name: 'Tendón de Aquiles I', view: 'posterior', x: 62, y: 88 },
];

const PAIN_TYPES: PainType[] = [
  'Punzante',
  'Sordo / Opresivo',
  'Urente / Quemante',
  'Eléctrico / Irradiado',
  'Pulsátil',
  'Tirantez / Fatiga',
];

const PAIN_DURATIONS: PainDuration[] = [
  'Agudo (< 4 semanas)',
  'Subagudo (4 - 12 semanas)',
  'Crónico (> 3 meses)',
];

export const PainMapModule: React.FC<PainMapModuleProps> = ({
  patient,
  initialData,
  onSave,
  onNavigateToReports,
}) => {
  const [assessment, setAssessment] = useState<PainMapAssessment>(initialData);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    initialData.painPoints[0]?.id || null
  );
  const [isEditingNew, setIsEditingNew] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Active or draft point being edited
  const [draftPoint, setDraftPoint] = useState<Partial<PainPoint>>({
    regionName: 'Nueva zona álgica',
    view: 'anterior',
    x: 50,
    y: 50,
    intensityVAS: 5,
    painType: 'Punzante',
    duration: 'Subagudo (4 - 12 semanas)',
    aggravatingFactors: '',
    relievingFactors: '',
    radiatesTo: '',
    notes: '',
  });

  const selectedPoint = assessment.painPoints.find((p) => p.id === selectedPointId);

  // Calculate Metrics
  const maxEVA = assessment.painPoints.length > 0
    ? Math.max(...assessment.painPoints.map((p) => p.intensityVAS))
    : 0;

  const avgEVA = assessment.painPoints.length > 0
    ? (
        assessment.painPoints.reduce((acc, p) => acc + p.intensityVAS, 0) /
        assessment.painPoints.length
      ).toFixed(1)
    : '0.0';

  // Handle canvas click to place a new point
  const handleCanvasClick = (view: 'anterior' | 'posterior', x: number, y: number) => {
    // Check nearest preset region to guess name
    const candidates = PRESET_REGIONS.filter((r) => r.view === view);
    let nearestName = view === 'anterior' ? 'Zona Anterior' : 'Zona Posterior';
    let minDistance = 999;

    candidates.forEach((cand) => {
      const dist = Math.hypot(cand.x - x, cand.y - y);
      if (dist < minDistance && dist < 18) {
        minDistance = dist;
        nearestName = cand.name;
      }
    });

    const newDraft: Partial<PainPoint> = {
      id: `pt-${Date.now()}`,
      regionId: `${view}-${Math.round(x)}-${Math.round(y)}`,
      regionName: nearestName,
      view,
      x,
      y,
      intensityVAS: 5,
      painType: 'Punzante',
      duration: 'Subagudo (4 - 12 semanas)',
      aggravatingFactors: '',
      relievingFactors: '',
      radiatesTo: '',
      notes: '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setDraftPoint(newDraft);
    setIsEditingNew(true);
    setSelectedPointId(null);
  };

  const handleSelectPresetRegion = (region: typeof PRESET_REGIONS[0]) => {
    handleCanvasClick(region.view, region.x, region.y);
  };

  const handleSelectExistingPoint = (point: PainPoint) => {
    setSelectedPointId(point.id);
    setIsEditingNew(false);
    setDraftPoint({ ...point });
  };

  const handleSaveDraftPoint = () => {
    if (!draftPoint.regionName) return;

    if (isEditingNew) {
      const newPoint: PainPoint = {
        id: draftPoint.id || `pt-${Date.now()}`,
        regionId: draftPoint.regionId || `pt-${Date.now()}`,
        regionName: draftPoint.regionName,
        view: draftPoint.view || 'anterior',
        x: draftPoint.x ?? 50,
        y: draftPoint.y ?? 50,
        intensityVAS: draftPoint.intensityVAS ?? 5,
        painType: draftPoint.painType || 'Punzante',
        duration: draftPoint.duration || 'Subagudo (4 - 12 semanas)',
        aggravatingFactors: draftPoint.aggravatingFactors || '',
        relievingFactors: draftPoint.relievingFactors || '',
        radiatesTo: draftPoint.radiatesTo || '',
        notes: draftPoint.notes || '',
        createdAt: draftPoint.createdAt || new Date().toISOString().split('T')[0],
      };

      const updated = {
        ...assessment,
        painPoints: [...assessment.painPoints, newPoint],
      };
      setAssessment(updated);
      setSelectedPointId(newPoint.id);
      setIsEditingNew(false);
    } else if (selectedPointId) {
      const updatedPoints = assessment.painPoints.map((p) => {
        if (p.id === selectedPointId) {
          return {
            ...p,
            ...draftPoint,
          } as PainPoint;
        }
        return p;
      });

      const updated = {
        ...assessment,
        painPoints: updatedPoints,
      };
      setAssessment(updated);
    }
  };

  const handleDeletePoint = (id: string) => {
    const updatedPoints = assessment.painPoints.filter((p) => p.id !== id);
    const updated = {
      ...assessment,
      painPoints: updatedPoints,
    };
    setAssessment(updated);
    if (selectedPointId === id) {
      setSelectedPointId(updatedPoints[0]?.id || null);
      if (updatedPoints[0]) {
        setDraftPoint({ ...updatedPoints[0] });
      } else {
        setIsEditingNew(false);
      }
    }
  };

  const handleSaveAssessment = () => {
    onSave(assessment);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Export JSON structured payload for interoperability
  const generateExportPayload = () => {
    return {
      schemaVersion: '1.0.0',
      application: 'KineFlow Core Body Clinical',
      module: 'PainMapAssessment',
      exportedAt: new Date().toISOString(),
      patient: {
        id: patient.id,
        name: patient.name,
        documentId: patient.documentId,
        age: patient.age,
        gender: patient.gender,
        sportOrActivity: patient.sportOrActivity,
      },
      evaluator: {
        name: assessment.evaluator || patient.physiotherapist,
        id: patient.physiotherapistId,
        institution: 'Core Body Rendimiento Físico & Rehabilitación',
      },
      assessmentSummary: {
        date: assessment.date,
        totalPointsCount: assessment.painPoints.length,
        maxIntensityVAS: maxEVA,
        averageIntensityVAS: Number(avgEVA),
        functionalImpactScore: assessment.functionalImpactScore,
        generalObservations: assessment.generalObservations,
      },
      painPoints: assessment.painPoints.map((pt) => ({
        id: pt.id,
        regionId: pt.regionId,
        regionName: pt.regionName,
        view: pt.view,
        coordinates: {
          xPercentage: pt.x,
          yPercentage: pt.y,
        },
        intensityVAS: pt.intensityVAS,
        painType: pt.painType,
        duration: pt.duration,
        aggravatingFactors: pt.aggravatingFactors || null,
        relievingFactors: pt.relievingFactors || null,
        radiatesTo: pt.radiatesTo || null,
        clinicalNotes: pt.notes || null,
        recordedDate: pt.createdAt,
      })),
    };
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(generateExportPayload(), null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleDownloadJson = () => {
    const payload = generateExportPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapa-dolor-${patient.name.toLowerCase().replace(/\s+/g, '-')}-${patient.documentId.replace(/\D/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);

      // Support direct painPoints array or full export payload
      const rawPoints = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.painPoints)
        ? parsed.painPoints
        : null;

      if (!rawPoints) {
        throw new Error('El JSON no contiene un arreglo válido de "painPoints".');
      }

      const importedPoints: PainPoint[] = rawPoints.map((p: any, idx: number) => ({
        id: p.id || `pt-import-${Date.now()}-${idx}`,
        regionId: p.regionId || `region-${idx}`,
        regionName: p.regionName || p.name || 'Zona Importada',
        view: p.view === 'posterior' ? 'posterior' : 'anterior',
        x: p.coordinates?.xPercentage ?? p.x ?? 50,
        y: p.coordinates?.yPercentage ?? p.y ?? 50,
        intensityVAS: Math.max(0, Math.min(10, Number(p.intensityVAS ?? p.vas ?? 5))),
        painType: p.painType || 'Punzante',
        duration: p.duration || 'Subagudo (4 - 12 semanas)',
        aggravatingFactors: p.aggravatingFactors || '',
        relievingFactors: p.relievingFactors || '',
        radiatesTo: p.radiatesTo || '',
        notes: p.clinicalNotes || p.notes || '',
        createdAt: p.recordedDate || p.createdAt || new Date().toISOString().split('T')[0],
      }));

      const updatedAssessment: PainMapAssessment = {
        ...assessment,
        painPoints: importedPoints,
        generalObservations:
          parsed.assessmentSummary?.generalObservations ||
          parsed.generalObservations ||
          assessment.generalObservations,
      };

      setAssessment(updatedAssessment);
      setSelectedPointId(importedPoints[0]?.id || null);
      if (importedPoints[0]) {
        setDraftPoint({ ...importedPoints[0] });
      }
      setShowImportModal(false);
      setImportJsonText('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setImportError(err.message || 'Error al procesar el archivo JSON. Verifique la estructura.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Module Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
            <Flame size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">
                Mapa Clínico del Dolor
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase tracking-wide">
                Módulo Interoperable
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mapeo anatómico bidimensional, escala EVA (0-10), cronología y exportación para integración en aplicaciones externas
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            title="Exportar datos para integrar en otra aplicación"
          >
            <FileJson size={15} className="text-blue-600" />
            <span>Exportar para otra App</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            title="Importar datos de dolor de otra app"
          >
            <Upload size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <FileText size={15} />
              <span>Ver en Informe PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAssessment}
            className={`px-4 py-2 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {savedSuccess ? <Check size={15} /> : <Save size={15} />}
            <span>{savedSuccess ? 'Guardado' : 'Guardar Mapa'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              EVA Máximo
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className="text-2xl font-black"
                style={{ color: getEvaColor(maxEVA) }}
              >
                {maxEVA}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 10</span>
            </div>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
            style={{
              backgroundColor: `${getEvaColor(maxEVA)}18`,
              color: getEvaColor(maxEVA),
            }}
          >
            {maxEVA <= 3 ? 'Leve' : maxEVA <= 6 ? 'Mod.' : 'Severo'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              EVA Promedio
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{avgEVA}</span>
              <span className="text-xs text-slate-400 font-bold">/ 10</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
            VAS
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Focos Álgicos
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {assessment.painPoints.length}
              </span>
              <span className="text-xs text-slate-400 font-semibold">zonas</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold text-xs text-rose-600">
            <Flame size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Impacto Funcional
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-blue-600">
                {assessment.functionalImpactScore}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 10</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-xs text-blue-600">
            {assessment.functionalImpactScore >= 7 ? 'Alto' : 'Medio'}
          </div>
        </div>
      </div>

      {/* Main Grid: Body Visualizer (Left) vs Detail Editor & Points List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Anatomical Dual-Silhouette Visualizer */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Siluetas Anatómicas Interactivas
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Haga clic sobre el cuerpo para colocar un punto
            </span>
          </div>

          <div className="p-2 bg-slate-50/60 rounded-xl border border-slate-100">
            <PainMapVisualizer
              painPoints={assessment.painPoints}
              activePointId={selectedPointId}
              onSelectPoint={handleSelectExistingPoint}
              onCanvasClick={handleCanvasClick}
            />
          </div>

          {/* Preset Quick-Add Toolbar */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Ubicación Rápida por Estructura
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {PRESET_REGIONS.slice(0, 14).map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleSelectPresetRegion(region)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus size={11} />
                  <span>{region.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pain Point Form / List Details */}
        <div className="lg:col-span-6 space-y-5">
          {/* Active / Draft Point Editor */}
          {(isEditingNew || selectedPoint) ? (
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 sm:p-6 shadow-sm space-y-4 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs"
                    style={{ backgroundColor: getEvaColor(draftPoint.intensityVAS ?? 5) }}
                  >
                    {draftPoint.intensityVAS}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isEditingNew ? 'Nuevo Foco de Dolor' : 'Editar Detalle del Foco'}
                    </h3>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {draftPoint.view === 'anterior' ? 'Vista Anterior' : 'Vista Posterior'}
                    </span>
                  </div>
                </div>

                {selectedPoint && !isEditingNew && (
                  <button
                    type="button"
                    onClick={() => handleDeletePoint(selectedPoint.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar este punto de dolor"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-3.5 text-xs">
                {/* Region Name */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Región / Estructura Anatómica
                  </label>
                  <input
                    type="text"
                    value={draftPoint.regionName || ''}
                    onChange={(e) =>
                      setDraftPoint((prev) => ({ ...prev, regionName: e.target.value }))
                    }
                    placeholder="Ej. Rodilla derecha (tendón patelar), Trapecio superior..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* VAS / EVA Slider 0 to 10 */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Intensidad Escala Visual Analógica (EVA)
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white"
                      style={{ backgroundColor: getEvaColor(draftPoint.intensityVAS ?? 5) }}
                    >
                      EVA {draftPoint.intensityVAS} / 10
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={draftPoint.intensityVAS ?? 5}
                    onChange={(e) =>
                      setDraftPoint((prev) => ({
                        ...prev,
                        intensityVAS: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>0: Sin dolor</span>
                    <span>3: Leve</span>
                    <span>6: Moderado</span>
                    <span>8: Severo</span>
                    <span>10: Incapacitante</span>
                  </div>
                </div>

                {/* Pain Type */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Calidad / Tipo de Dolor
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {PAIN_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDraftPoint((prev) => ({ ...prev, painType: type }))}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-colors border ${
                          draftPoint.painType === type
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tiempo de Evolución (Cronología)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAIN_DURATIONS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDraftPoint((prev) => ({ ...prev, duration: dur }))}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-colors border ${
                          draftPoint.duration === dur
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aggravating & Relieving Factors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Factores Agravantes
                    </label>
                    <input
                      type="text"
                      value={draftPoint.aggravatingFactors || ''}
                      onChange={(e) =>
                        setDraftPoint((prev) => ({
                          ...prev,
                          aggravatingFactors: e.target.value,
                        }))
                      }
                      placeholder="Carga pesada, flexión > 90°, bajar escaleras..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Factores de Alivio
                    </label>
                    <input
                      type="text"
                      value={draftPoint.relievingFactors || ''}
                      onChange={(e) =>
                        setDraftPoint((prev) => ({
                          ...prev,
                          relievingFactors: e.target.value,
                        }))
                      }
                      placeholder="Crioterapia, isométricos, reposo relativo..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Radiation */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Patrón de Irradiación (si aplica)
                  </label>
                  <input
                    type="text"
                    value={draftPoint.radiatesTo || ''}
                    onChange={(e) =>
                      setDraftPoint((prev) => ({ ...prev, radiatesTo: e.target.value }))
                    }
                    placeholder="Sin irradiación / Hacia cara lateral de pierna / Occipital..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Observations / Notes */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Hallazgos Clínicos & Palpación
                  </label>
                  <textarea
                    rows={2}
                    value={draftPoint.notes || ''}
                    onChange={(e) =>
                      setDraftPoint((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Pruebas ortopédicas positivas, banda tensa miofascial, crepitación..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingNew(false);
                      if (selectedPoint) setDraftPoint({ ...selectedPoint });
                    }}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraftPoint}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                  >
                    {isEditingNew ? 'Guardar Punto' : 'Actualizar Cambios'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Welcome / Add prompt when no point is active */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Flame size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Seleccione o agregue un punto de dolor
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Haga clic directamente en la silueta anatómica anterior o posterior, o presione el botón inferior para prescribir un nuevo foco álgico.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCanvasClick('anterior', 50, 50)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus size={15} />
                <span>Agregar Punto de Dolor</span>
              </button>
            </div>
          )}

          {/* Registered Pain Points List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Puntos Registrados ({assessment.painPoints.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Clic en tarjeta para editar
              </span>
            </div>

            {assessment.painPoints.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No hay puntos de dolor registrados actualmente para este paciente.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {assessment.painPoints.map((pt) => {
                  const isSelected = selectedPointId === pt.id;
                  const color = getEvaColor(pt.intensityVAS);

                  return (
                    <div
                      key={pt.id}
                      onClick={() => handleSelectExistingPoint(pt)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: color }}
                        >
                          {pt.intensityVAS}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {pt.regionName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {pt.painType} • {pt.duration}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {pt.view === 'anterior' ? 'Ant' : 'Post'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePoint(pt.id);
                          }}
                          className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Observations & Functional Impact Score */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
            <label className="font-bold text-slate-800 block">
              Conclusiones Generales del Mapa del Dolor
            </label>
            <textarea
              rows={3}
              value={assessment.generalObservations}
              onChange={(e) =>
                setAssessment((prev) => ({
                  ...prev,
                  generalObservations: e.target.value,
                }))
              }
              placeholder="Describa el patrón biomecánico global del dolor, relación con cadenas miofasciales..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Export Interoperability Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileJson size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Exportar Datos del Mapa de Dolor
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Formato estándar JSON para interoperabilidad e integración con otras apps
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Este payload contiene todas las coordenadas porcentuales anatómicas, intensidades EVA, tipos de dolor, cronología y metadatos del paciente listos para ser consumidos por cualquier API, base de datos o sistema kinésico externo:
            </p>

            {/* JSON Code Viewer */}
            <div className="flex-1 overflow-y-auto bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] border border-slate-800 select-all">
              <pre>{JSON.stringify(generateExportPayload(), null, 2)}</pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
              <div className="text-[11px] text-slate-400">
                {assessment.painPoints.length} puntos de dolor registrados
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  {copiedSuccess ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedSuccess ? '¡Copiado!' : 'Copiar al Portapapeles'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download size={14} />
                  <span>Descargar Archivo JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Importar Datos de Otra Aplicación
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pegue el JSON exportado previamente desde su software kinésico
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block">
                Pegar Contenido JSON
              </label>
              <textarea
                rows={8}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{ "painPoints": [ ... ] }'
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportJson}
                disabled={!importJsonText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Cargar en el Paciente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
