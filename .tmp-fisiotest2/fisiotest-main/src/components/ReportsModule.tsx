import React, { useState } from 'react';
import {
  Patient,
  PostureAssessment,
  MobilityAssessment,
  StrengthAssessment,
  MovementAssessment,
  TreatmentPlan,
  PainMapAssessment,
} from '../types';
import {
  FileText,
  Printer,
  Mail,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Award,
  Layers,
  Flame,
  Activity,
  UserCheck,
  Dumbbell,
  Compass,
} from 'lucide-react';
import { HumanBodyVisualizer } from './HumanBodyVisualizer';
import { PainMapVisualizer, getEvaColor } from './PainMapVisualizer';
import { ProfessionalSignatureQR } from './ProfessionalSignatureQR';
import { SendEmailModal } from './SendEmailModal';

interface ReportsModuleProps {
  patient: Patient;
  posture: PostureAssessment;
  mobility: MobilityAssessment;
  strength: StrengthAssessment;
  movement: MovementAssessment;
  treatment: TreatmentPlan;
  painMap?: PainMapAssessment;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  patient,
  posture,
  mobility,
  strength,
  movement,
  treatment,
  painMap,
}) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [reportView, setReportView] = useState<'integral' | 'posture_pain' | 'treatment_only'>('integral');

  const handlePrint = () => {
    window.print();
  };

  const maxEVA = painMap && painMap.painPoints.length > 0
    ? Math.max(...painMap.painPoints.map((p) => p.intensityVAS))
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Action Bar (Hidden on print) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Resumen de Valoración Fisioterapéutica Integral
            </h2>
            <p className="text-xs text-slate-500">
              Incluye imágenes de valoración postural, mapa del dolor, pruebas biomecánicas y firma con QR
            </p>
          </div>
        </div>

        {/* View Filter & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Filter Pills */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setReportView('integral')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportView === 'integral'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Informe Completo
            </button>
            <button
              type="button"
              onClick={() => setReportView('posture_pain')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportView === 'posture_pain'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Postura & Dolor
            </button>
            <button
              type="button"
              onClick={() => setReportView('treatment_only')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportView === 'treatment_only'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Plan de Ejercicios
            </button>
          </div>

          {/* Email button */}
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            title="Enviar informe por correo al paciente"
          >
            <Mail size={15} className="text-blue-600" />
            <span>Enviar al Correo</span>
          </button>

          {/* Print / Save PDF button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer size={15} />
            <span>Guardar en PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (Clinical Document) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8 text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Document Header matching Core Body Brand */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-3xl tracking-tighter shadow-sm">
              C3
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                CORE BODY
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mt-1">
                RENDIMIENTO FÍSICO & REHABILITACIÓN
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
              HISTORIA CLÍNICA N° {patient.documentId.replace(/\D/g, '') || '8921'}
            </span>
            <span className="text-xs font-bold text-slate-900 block uppercase">
              RESUMEN DE VALORACIÓN FISIOTERAPÉUTICA
            </span>
            <span className="text-[11px] text-slate-500">
              Fecha de emisión: {new Date().toLocaleDateString('es-CO')}
            </span>
          </div>
        </div>

        {/* Patient & Professional Clinical Context Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Paciente</span>
            <span className="font-bold text-slate-900">{patient.name}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Identificación / Edad</span>
            <span className="font-bold text-slate-800">{patient.documentId} ({patient.age} años)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Deporte / Actividad</span>
            <span className="font-bold text-slate-800">{patient.sportOrActivity}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Fisioterapeuta Evaluador</span>
            <span className="font-bold text-slate-800">{patient.physiotherapist} ({patient.physiotherapistId})</span>
          </div>
        </div>

        {/* Diagnostic Reason */}
        {patient.diagnosticReason && (
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs">
            <strong className="text-blue-900 uppercase text-[10px] block mb-0.5">
              Motivo de Consulta / Impresión Diagnóstica:
            </strong>
            <p className="text-slate-700 leading-relaxed">{patient.diagnosticReason}</p>
          </div>
        )}

        {/* SECCIÓN A: MAPA DEL DOLOR (BODY PAIN MAPPING) */}
        {(reportView === 'integral' || reportView === 'posture_pain') && painMap && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Flame size={15} className="text-rose-600" />
                <span>1. MAPA CLÍNICO DEL DOLOR & ESCALA ANALÓGICA VISUAL (EVA)</span>
              </h3>
              <div className="text-[11px] font-bold text-slate-700">
                EVA Máx: <span className="text-rose-600 font-black">{maxEVA}/10</span> | Impacto Funcional: <span className="text-blue-600 font-black">{painMap.functionalImpactScore}/10</span>
              </div>
            </div>

            {/* Pain Visualizer and Points Table side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Dual Silhouettes */}
              <div className="md:col-span-6 bg-slate-50 rounded-2xl p-3 border border-slate-200">
                <PainMapVisualizer
                  painPoints={painMap.painPoints}
                  readOnly={true}
                  compact={true}
                />
              </div>

              {/* Pain Table */}
              <div className="md:col-span-6 space-y-2.5">
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-semibold uppercase text-[9px]">
                      <tr>
                        <th className="p-2">Región Álgica</th>
                        <th className="p-2 text-center">EVA</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Cronología</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {painMap.painPoints.map((pt) => (
                        <tr key={pt.id} className="text-[11px]">
                          <td className="p-2 font-bold text-slate-900">{pt.regionName}</td>
                          <td className="p-2 text-center">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                              style={{ backgroundColor: getEvaColor(pt.intensityVAS) }}
                            >
                              {pt.intensityVAS}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600">{pt.painType}</td>
                          <td className="p-2 text-slate-500">{pt.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {painMap.generalObservations && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                    <strong>Hallazgo / Patrón Clínico:</strong> {painMap.generalObservations}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN B: EVALUACIÓN POSTURAL ESTÁTICA CON IMÁGENES ANATÓMICAS */}
        {(reportView === 'integral' || reportView === 'posture_pain') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <UserCheck size={15} className="text-blue-600" />
                <span>2. VALORACIÓN POSTURAL ESTÁTICA (3 PLANOS BIOMECÁNICOS)</span>
              </h3>
              <span className="text-[11px] font-bold text-blue-700">
                Concepto: {posture.conceptoPostural}
              </span>
            </div>

            {/* 3 Anatomical Model Silhouettes with Plumb Line & Axes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Vista Anterior */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  <span>Vista Anterior</span>
                  <span className="text-blue-600 font-bold">Plano Coronal</span>
                </div>
                <div className="w-full flex justify-center py-1 max-h-[300px] overflow-hidden">
                  <HumanBodyVisualizer
                    posture={posture}
                    activeView="anterior"
                    viewMode="muscular"
                    showPlumbLine={true}
                    showAngles={true}
                    showGhostIdeal={true}
                    hideToolbar={true}
                    hideCardWrapper={true}
                    hideViewTitle={true}
                  />
                </div>
                <div className="w-full mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <div><strong>Cabeza:</strong> {posture.anterior.cabeza}</div>
                  <div><strong>Hombros:</strong> {posture.anterior.hombros}</div>
                  <div><strong>Pelvis:</strong> {posture.anterior.pelvis}</div>
                  <div><strong>Rodillas:</strong> {posture.anterior.rodillas}</div>
                  <div><strong>Pies:</strong> {posture.anterior.pies}</div>
                </div>
              </div>

              {/* Vista Lateral */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  <span>Vista Lateral</span>
                  <span className="text-blue-600 font-bold">Plano Sagital</span>
                </div>
                <div className="w-full flex justify-center py-1 max-h-[300px] overflow-hidden">
                  <HumanBodyVisualizer
                    posture={posture}
                    activeView="lateral"
                    viewMode="muscular"
                    showPlumbLine={true}
                    showAngles={true}
                    showGhostIdeal={true}
                    hideToolbar={true}
                    hideCardWrapper={true}
                    hideViewTitle={true}
                  />
                </div>
                <div className="w-full mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <div><strong>Cabeza:</strong> {posture.lateral.cabeza}</div>
                  <div><strong>Hombros:</strong> {posture.lateral.hombros}</div>
                  <div><strong>C. Dorsal:</strong> {posture.lateral.columnaDorsal}</div>
                  <div><strong>C. Lumbar:</strong> {posture.lateral.columnaLumbar}</div>
                  <div><strong>Pelvis:</strong> {posture.lateral.pelvis}</div>
                </div>
              </div>

              {/* Vista Posterior */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  <span>Vista Posterior</span>
                  <span className="text-blue-600 font-bold">Plano Posterior</span>
                </div>
                <div className="w-full flex justify-center py-1 max-h-[300px] overflow-hidden">
                  <HumanBodyVisualizer
                    posture={posture}
                    activeView="posterior"
                    viewMode="muscular"
                    showPlumbLine={true}
                    showAngles={true}
                    showGhostIdeal={true}
                    hideToolbar={true}
                    hideCardWrapper={true}
                    hideViewTitle={true}
                  />
                </div>
                <div className="w-full mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <div><strong>Escápulas:</strong> {posture.posterior.escapulas}</div>
                  <div><strong>Columna:</strong> {posture.posterior.columna}</div>
                  <div><strong>Pelvis:</strong> {posture.posterior.pelvis}</div>
                  <div><strong>Talones:</strong> {posture.posterior.talones}</div>
                </div>
              </div>
            </div>

            {posture.observacion && (
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong>Observación Postural:</strong> {posture.observacion}
              </p>
            )}
          </div>
        )}

        {/* SECCIÓN C: MOVILIDAD ARTICULAR (ROM) */}
        {reportView === 'integral' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Compass size={15} className="text-blue-600" />
                <span>3. MOVILIDAD ARTICULAR & ARCOS DE MOVIMIENTO (ROM)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">Goniometría Clínica Activa</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {mobility.structures.map((s) => {
                const hasLimit = s.hasLeftLimitation || s.hasRightLimitation;
                return (
                  <div
                    key={s.structure}
                    className={`p-2.5 rounded-lg border ${
                      hasLimit
                        ? 'bg-blue-50/50 border-blue-200 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-[11px]">{s.structure}</span>
                      {hasLimit ? (
                        <span className="text-[9px] font-bold text-blue-700 uppercase">Limitado</span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-700 uppercase">Libre</span>
                      )}
                    </div>
                    {hasLimit && (
                      <div className="text-[10px] text-slate-600 mt-1 space-y-0.5">
                        {s.hasLeftLimitation && <div>Izq: {s.leftLimitation}</div>}
                        {s.hasRightLimitation && <div>Der: {s.rightLimitation}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN D: DINAMOMETRÍA DE FUERZA OBJETIVA */}
        {reportView === 'integral' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Dumbbell size={15} className="text-blue-600" />
                <span>4. FUERZA MUSCULAR OBJETIVA & ASIMETRÍAS (ACTIVFORCE 2)</span>
              </h3>
              <div className="text-[11px] font-bold text-slate-800">
                Fuerza Global: <span className="text-emerald-600 font-bold">{strength.fuerzaGlobalPct}%</span> | Asimetría: <span className="text-blue-600 font-bold">{strength.asimetriaGlobalPct}%</span>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[9px]">
                <tr>
                  <th className="p-2">Estructura</th>
                  <th className="p-2 text-center">Fuerza Izquierda</th>
                  <th className="p-2 text-center">Fuerza Derecha</th>
                  <th className="p-2 text-center">Asimetría (%)</th>
                  <th className="p-2 text-center">Interpretación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {strength.structures.map((st) => (
                  <tr key={st.id}>
                    <td className="p-2 font-bold text-slate-900 uppercase">{st.structure}</td>
                    <td className="p-2 text-center font-bold">{st.leftKg} kg</td>
                    <td className="p-2 text-center font-bold">{st.rightKg} kg</td>
                    <td className="p-2 text-center font-bold">{st.asymmetryPct}%</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        st.interpretation === 'Simetría conservada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {st.interpretation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECCIÓN E: CONTROL DE MOVIMIENTO (7 GESTOS) */}
        {reportView === 'integral' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Activity size={15} className="text-blue-600" />
                <span>5. CONTROL DEL MOVIMIENTO EN GESTOS DEPORTIVOS</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">Análisis Funcional de Patrones Motores</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {movement.gestures.map((g) => {
                const issues = g.criteria.filter((c) => c.selected);
                return (
                  <div key={g.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span>{g.name}</span>
                      <span className={`text-[10px] font-bold ${issues.length > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {issues.length > 0 ? `${issues.length} alteración(es)` : 'Correcto'}
                      </span>
                    </div>
                    {issues.length > 0 ? (
                      <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-0.5">
                        {issues.map((i) => (
                          <li key={i.id}>{i.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500 pl-2">Patrón motor ejecutado sin fallas biomecánicas.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN F: PLAN DE TRATAMIENTO & EJERCICIOS (CON IMÁGENES) */}
        {(reportView === 'integral' || reportView === 'treatment_only') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Layers size={15} className="text-blue-600" />
                <span>6. PLAN DE TRATAMIENTO & PRESCRIPCIÓN DE EJERCICIOS</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">{treatment.currentPhase}</span>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong>Objetivo General:</strong> {treatment.objective}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {treatment.exercises.map((ex) => (
                <div key={ex.id} className="p-3 border border-slate-200 rounded-xl bg-white flex gap-3 shadow-xs">
                  {ex.imageUrl && (
                    <img
                      src={ex.imageUrl}
                      alt={ex.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-lg object-cover shrink-0 border border-slate-200 bg-slate-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between font-bold text-slate-900 gap-2">
                      <span className="truncate">{ex.name}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold shrink-0">
                        {ex.sets} × {ex.repsOrDuration}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Músculo diana: {ex.targetMuscle} • {ex.frequencyDaysPerWeek} d/sem
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-3">
                      {ex.instructions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN FINAL: FIRMA DEL PROFESIONAL CON QR OFICIAL VERIFICABLE */}
        <ProfessionalSignatureQR
          patient={patient}
          evaluatorName={patient.physiotherapist}
          evaluatorId={patient.physiotherapistId}
        />
      </div>

      {/* Modal de Envío por Correo Electrónico */}
      <SendEmailModal
        patient={patient}
        treatment={treatment}
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
};
