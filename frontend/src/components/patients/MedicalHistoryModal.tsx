import React, { useState, useEffect } from 'react';
import { User, PainObservation } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { formatDateTime } from '../../utils/dateUtils';
import { useI18n } from '../../app/providers/I18nProvider';

interface MedicalHistoryModalProps {
  patient: User | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPainMap?: (patientId: string) => void;
}

export const MedicalHistoryModal: React.FC<MedicalHistoryModalProps> = ({
  patient,
  isOpen,
  onClose,
  onNavigateToPainMap,
}) => {
  const { t } = useI18n();
  const [painObservations, setPainObservations] = useState<PainObservation[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'pain_history' | 'evolution'>('summary');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient && isOpen) {
      fetchPatientPainHistory(patient.id);
    }
  }, [patient, isOpen]);

  const fetchPatientPainHistory = async (patientId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pain_observations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      setPainObservations(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        id="medical-history-modal"
        className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col clinical-shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={patient.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={patient.full_name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-on-surface">{patient.full_name}</h3>
                <span className="bg-primary/10 text-primary text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  {t('history.patient_active', 'Paciente Activo')}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-3 mt-1">
                <span>{t('patients.rut', 'ID/Doc')}: <strong className="text-on-surface">{patient.rut_or_dni || '19.452.128-4'}</strong></span>
                <span>•</span>
                <span>{t('history.birth_date', 'F. Nacimiento')}: <strong className="text-on-surface">{patient.birth_date || '12/04/1995'}</strong></span>
                <span>•</span>
                <span>{t('history.phone', 'Tel')}: <strong className="text-on-surface">{patient.phone || 'Sin registrar'}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-outline-variant/20 px-6 bg-surface-container-lowest gap-2 pt-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('history.tab_summary', 'Resumen Clínico & Antecedentes')}
          </button>
          <button
            onClick={() => setActiveTab('pain_history')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pain_history'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('history.tab_pain', 'Historial de Dolor')}
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {painObservations.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('evolution')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'evolution'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('history.tab_notes', 'Plan Terapéutico & Kinesiología')}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Medical conditions and alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                  <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">vital_signs</span>
                    {t('patients.diagnosis', 'Diagnóstico Kinésico Principal')}
                  </h4>
                  <ul className="space-y-1.5">
                    {patient.medical_conditions?.map((cond, idx) => (
                      <li key={idx} className="text-sm font-semibold text-on-surface flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {cond}
                      </li>
                    )) || <li className="text-xs text-on-surface-variant">{t('history.no_records', 'Sin antecedentes registrados')}</li>}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-error-container/40 border border-error/20">
                  <h4 className="text-xs font-black uppercase text-error tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">warning</span>
                    {t('history.allergies', 'Alergias & Precauciones')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies?.map((allg, idx) => (
                      <span
                        key={idx}
                        className="bg-white/80 text-error font-bold text-xs px-2.5 py-1 rounded-xl border border-error/20"
                      >
                        {allg}
                      </span>
                    )) || <span className="text-xs text-on-surface-variant">{t('history.allergies', 'Ninguna alergia registrada')}</span>}
                  </div>
                </div>
              </div>

              {/* Emergency Contact & Demographics */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-wider mb-3">
                  {t('history.personal_background', 'Contacto de Emergencia')}
                </h4>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-[11px] text-on-surface-variant">{t('patients.name', 'Nombre')}</p>
                    <p className="font-bold text-on-surface">{patient.emergency_contact?.name || 'Carlos Soto'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-on-surface-variant">{t('patients.phone', 'Teléfono')}</p>
                    <p className="font-bold text-on-surface">{patient.emergency_contact?.phone || '+56 9 7712 3456'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-on-surface-variant">{t('patients.rut', 'Parentesco')}</p>
                    <p className="font-bold text-on-surface">{patient.emergency_contact?.relationship || 'Familiar'}</p>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-teal-500/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-on-surface text-sm">{t('painmap.title', '¿Deseas mapear nuevo dolor para este paciente?')}</h5>
                  <p className="text-xs text-on-surface-variant">{t('painmap.subtitle', 'Abre el lienzo anatómico interactivo con este paciente preseleccionado.')}</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToPainMap) onNavigateToPainMap(patient.id);
                  }}
                  className="bg-primary hover:bg-primary-container text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base">accessibility_new</span>
                  {t('patients.open_pain_map', 'Abrir en Mapa de Dolor')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pain_history' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
                  <p className="text-xs mt-2">{t('common.loading', 'Cargando observaciones de dolor...')}</p>
                </div>
              ) : painObservations.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-1 text-primary/60">healing</span>
                  <p className="text-sm font-semibold">{t('painmap.no_observations', 'No se registran observaciones de dolor en el mapa.')}</p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onNavigateToPainMap) onNavigateToPainMap(patient.id);
                    }}
                    className="mt-3 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> {t('patients.open_pain_map', 'Crear primera observación de dolor')}
                  </button>
                </div>
              ) : (
                painObservations.map((obs) => {
                  const getPainColor = (lvl: number) => {
                    if (lvl <= 3) return 'bg-emerald-500 text-white';
                    if (lvl <= 6) return 'bg-amber-500 text-white';
                    return 'bg-red-500 text-white';
                  };

                  return (
                    <div
                      key={obs.id}
                      className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black text-sm shrink-0 shadow-xs ${getPainColor(
                            obs.pain_level
                          )}`}
                        >
                          <span>{obs.pain_level}</span>
                          <span className="text-[8px] leading-none opacity-80">/10</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-sm text-on-surface">{obs.body_region}</h5>
                            <span className="text-[10px] uppercase font-bold bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">
                              {obs.body_side === 'front' ? t('painmap.view_front', 'Vista Anterior') : t('painmap.view_back', 'Vista Posterior')}
                            </span>
                            {obs.pain_type && (
                              <span className="text-[10px] capitalize font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {obs.pain_type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {obs.clinical_notes || t('history.no_records', 'Sin notas adicionales.')}
                          </p>
                          <p className="text-[10px] text-outline mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {formatDateTime(obs.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'evolution' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-on-surface">{t('history.tab_notes', 'Objetivos Terapéuticos Actuales')}</h5>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    {t('patients.active_treatments', 'Fase 2 de Rehabilitación')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                    <p className="font-bold text-on-surface mb-1">1. {t('painmap.title', 'Control de Dolor')}</p>
                    <p className="text-on-surface-variant">EVA &lt; 3</p>
                  </div>
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                    <p className="font-bold text-on-surface mb-1">2. ROM</p>
                    <p className="text-on-surface-variant">130°</p>
                  </div>
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                    <p className="font-bold text-on-surface mb-1">3. {t('medicine.vital_signs', 'Fuerza y Carga')}</p>
                    <p className="text-on-surface-variant">Progresión bipedal</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low/40 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            {t('common.close', 'Cerrar Ficha')}
          </button>
        </div>
      </div>
    </div>
  );
};
