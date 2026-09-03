import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import { getHistoriaClinicaByPatient, saveHistoriaClinica } from '../services/dataService';
import { HistoriaClinica, NivelDeporte } from '../types';

interface HistoriaClinicaPageProps {
  onNavigate?: (path: string) => void;
}

function calcAge(birthDate?: string): string {
  if (!birthDate) return '—';
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? String(age) : '—';
}

function genderLabel(gender?: string): string {
  switch (gender) {
    case 'male':
      return 'Masculino';
    case 'female':
      return 'Femenino';
    case 'other':
      return 'Otro';
    default:
      return gender || '—';
  }
}

const emptyForm = {
  ocupacion: '',
  motivo_consulta: '',
  deporte_practica: '',
  nivel_deporte: '' as NivelDeporte | '',
  frecuencia_semanal: '',
  lesiones_anteriores: '',
  habitos_estilo_vida: '',
};

export function HistoriaClinicaPage({ onNavigate }: HistoriaClinicaPageProps) {
  const { user, tenantId } = useAuth();
  const { activePatient } = useAppStore();

  const [recordId, setRecordId] = useState<string | undefined>();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (!activePatient?.id || !tenantId) {
      setRecordId(undefined);
      setForm(emptyForm);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const row = await getHistoriaClinicaByPatient(tenantId, activePatient.id);
        if (cancelled) return;
        if (row) {
          setRecordId(row.id);
          setForm({
            ocupacion: row.ocupacion || '',
            motivo_consulta: row.motivo_consulta || '',
            deporte_practica: row.deporte_practica || '',
            nivel_deporte: (row.nivel_deporte as NivelDeporte) || '',
            frecuencia_semanal: row.frecuencia_semanal || '',
            lesiones_anteriores: row.lesiones_anteriores || '',
            habitos_estilo_vida: row.habitos_estilo_vida || '',
          });
        } else {
          setRecordId(undefined);
          setForm(emptyForm);
        }
      } catch (err) {
        console.error(err);
        addToast('error', 'Error', 'No se pudo cargar la historia clínica.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activePatient?.id, tenantId]);

  const identification = useMemo(
    () => [
      { label: 'Nombre', value: activePatient?.full_name || '—' },
      { label: 'RUT / DNI', value: activePatient?.rut_or_dni || '—' },
      { label: 'Edad', value: calcAge(activePatient?.birth_date) },
      { label: 'Sexo', value: genderLabel(activePatient?.gender) },
      { label: 'Teléfono', value: activePatient?.phone || '—' },
      { label: 'Correo', value: activePatient?.email || '—' },
    ],
    [activePatient]
  );

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient?.id || !tenantId || !user?.id) {
      addToast('error', 'No se puede guardar', 'Falta paciente activo o sesión de profesional.');
      return;
    }

    setSaving(true);
    try {
      const saved: HistoriaClinica = await saveHistoriaClinica({
        id: recordId,
        tenant_id: tenantId,
        patient_id: activePatient.id,
        professional_id: user.id,
        ocupacion: form.ocupacion,
        motivo_consulta: form.motivo_consulta,
        deporte_practica: form.deporte_practica,
        nivel_deporte: form.nivel_deporte || undefined,
        frecuencia_semanal: form.frecuencia_semanal,
        lesiones_anteriores: form.lesiones_anteriores,
        habitos_estilo_vida: form.habitos_estilo_vida,
      });
      setRecordId(saved.id);
      addToast('success', 'Historia clínica guardada', 'Los antecedentes se almacenaron correctamente.');
    } catch (err) {
      console.error(err);
      addToast('error', 'Error al guardar', 'No se pudo persistir la historia clínica.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/historia-clinica" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/historia-clinica" onNavigate={onNavigate} />

        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  clinical_notes
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  Historia Clínica
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                Antecedentes médicos y deportivos para fisioterapia y nutrición.
              </p>
            </div>
          </div>

          {!activePatient ? (
            <div className="max-w-4xl mx-auto my-6 space-y-8 animate-fadeIn">
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-8 md:p-12 text-center clinical-shadow">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl">clinical_notes</span>
                </div>

                <h3 className="text-2xl font-black text-on-surface tracking-tight">
                  Selecciona un Paciente para iniciar la Historia Clínica
                </h3>

                <p className="text-sm text-on-surface-variant max-w-lg mx-auto mt-2 mb-8 leading-relaxed">
                  Utiliza el buscador predictivo para cargar los datos de identificación y diligenciar
                  motivos de consulta, historia deportiva y antecedentes.
                </p>

                <div className="max-w-xl mx-auto">
                  <PatientSearchCombobox
                    variant="large"
                    autoFocus={true}
                    placeholder="Buscar paciente por nombre, RUT/DNI o email..."
                    onSelectPatient={(patient) => {
                      addToast(
                        'success',
                        'Paciente Activo',
                        `Sesión iniciada con ${patient.full_name}`
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
              {loading && (
                <p className="text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-primary text-sm">sync</span>
                  Cargando historia clínica...
                </p>
              )}

              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 md:p-8 clinical-shadow">
                <h3 className="text-lg font-extrabold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Datos de Identificación
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {identification.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl bg-surface-container-low px-4 py-3 border border-outline-variant/20"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {item.label}
                      </p>
                      <p className="text-sm font-semibold text-on-surface mt-1 break-words">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 md:p-8 clinical-shadow space-y-4">
                <h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">assignment</span>
                  Motivo de Consulta y Ocupación
                </h3>
                <label className="block">
                  <span className="text-xs font-bold text-on-surface-variant">Ocupación</span>
                  <input
                    type="text"
                    value={form.ocupacion}
                    onChange={(e) => handleChange('ocupacion', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm"
                    placeholder="Ej. Ingeniero, estudiante, deportista..."
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-on-surface-variant">Motivo de consulta</span>
                  <textarea
                    value={form.motivo_consulta}
                    onChange={(e) => handleChange('motivo_consulta', e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm"
                    placeholder="Describe el motivo principal de la consulta..."
                  />
                </label>
              </section>

              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 md:p-8 clinical-shadow space-y-4">
                <h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">sports</span>
                  Historia Deportiva
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block md:col-span-1">
                    <span className="text-xs font-bold text-on-surface-variant">Deporte que practica</span>
                    <input
                      type="text"
                      value={form.deporte_practica}
                      onChange={(e) => handleChange('deporte_practica', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm"
                      placeholder="Ej. Fútbol, running..."
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-on-surface-variant">Nivel</span>
                    <select
                      value={form.nivel_deporte}
                      onChange={(e) => handleChange('nivel_deporte', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="recreativo">Recreativo</option>
                      <option value="amateur">Amateur</option>
                      <option value="competitivo">Competitivo</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-on-surface-variant">Frecuencia semanal</span>
                    <select
                      value={form.frecuencia_semanal}
                      onChange={(e) => handleChange('frecuencia_semanal', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="1-2">1–2 veces</option>
                      <option value="3-4">3–4 veces</option>
                      <option value="5-6">5–6 veces</option>
                      <option value="diario">Diario</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 md:p-8 clinical-shadow space-y-4">
                <h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history_edu</span>
                  Antecedentes
                </h3>
                <label className="block">
                  <span className="text-xs font-bold text-on-surface-variant">Lesiones anteriores</span>
                  <textarea
                    value={form.lesiones_anteriores}
                    onChange={(e) => handleChange('lesiones_anteriores', e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm"
                    placeholder="Fracturas, cirugías, esguinces, etc."
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-on-surface-variant">Hábitos / estilo de vida</span>
                  <textarea
                    value={form.habitos_estilo_vida}
                    onChange={(e) => handleChange('habitos_estilo_vida', e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm"
                    placeholder="Sueño, tabaquismo, hidratación, actividad laboral..."
                  />
                </label>
              </section>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary text-on-primary px-6 py-3 text-sm font-bold shadow-sm disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-lg">save</span>
                  {saving ? 'Guardando...' : 'Guardar Historia Clínica'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
