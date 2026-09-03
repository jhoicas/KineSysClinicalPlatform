import React, { useState } from 'react';
import { Patient } from '../types';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  FileText,
  Calendar,
  Activity,
  Check,
  ChevronRight,
  UserCheck,
  Award,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface PatientsModuleProps {
  patients: Patient[];
  activePatient: Patient;
  onSelectPatient: (patient: Patient) => void;
  onAddPatient: (newPatient: Patient) => void;
  onNavigateTo: (tab: NavTab) => void;
}

export const PatientsModule: React.FC<PatientsModuleProps> = ({
  patients,
  activePatient,
  onSelectPatient,
  onAddPatient,
  onNavigateTo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  // New patient state
  const [name, setName] = useState('');
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState<Patient['gender']>('M');
  const [birthDate, setBirthDate] = useState('1998-04-12');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sport, setSport] = useState('');
  const [reason, setReason] = useState('');

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sportOrActivity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newP: Patient = {
      id: `p-${Date.now()}`,
      name,
      age: Number(age),
      gender,
      birthDate,
      documentId: documentId || `CC ${Math.floor(10000000 + Math.random() * 90000000)}`,
      phone: phone || '+57 300 000 0000',
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      sportOrActivity: sport || 'Entrenamiento funcional',
      diagnosticReason: reason || 'Valoración preventiva y readaptación neuromuscular.',
      createdAt: new Date().toISOString().split('T')[0],
      physiotherapist: 'Juan David García',
      physiotherapistId: 'T.P. 123456',
    };

    onAddPatient(newP);
    onSelectPatient(newP);
    setShowNewModal(false);

    // Reset fields
    setName('');
    setDocumentId('');
    setPhone('');
    setEmail('');
    setSport('');
    setReason('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users size={24} className="text-blue-600" />
            <span>Historial y Gestión de Pacientes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de expedientes clínicos, antecedentes fisioterapéuticos y sesiones activas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o deporte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <UserPlus size={16} />
            <span>Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Grid: Patient List (Left) and Active Patient Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Patients */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Pacientes Registrados ({filteredPatients.length})
          </h2>

          <div className="space-y-2">
            {filteredPatients.map((p) => {
              const isSelected = p.id === activePatient.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPatient(p)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-400 shadow-xs ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {p.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                            En Sesión
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.age} años • {p.gender === 'M' ? 'Masculino' : 'Femenino'} • {p.documentId}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[200px] text-blue-700 font-medium">
                      🏅 {p.sportOrActivity}
                    </span>
                    <span>Ingreso: {p.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Patient Full Clinical Record Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                EXPEDIENTE FISIOTERAPÉUTICO SELECCIONADO
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {activePatient.name}
              </h2>
              <p className="text-xs text-slate-500">
                {activePatient.documentId} • Fisioterapeuta tratante: {activePatient.physiotherapist} ({activePatient.physiotherapistId})
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-xs">
              {activePatient.name.slice(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Quick contact info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Teléfono / WhatsApp
              </span>
              <span className="font-semibold text-slate-800">{activePatient.phone}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Correo Electrónico
              </span>
              <span className="font-semibold text-slate-800 truncate block">
                {activePatient.email}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Deporte / Disciplina
              </span>
              <span className="font-semibold text-slate-800">{activePatient.sportOrActivity}</span>
            </div>
          </div>

          {/* Motivo de Consulta & Diagnóstico Kinesiológico */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
              MOTIVO DE CONSULTA Y DIAGNÓSTICO KINESIOLÓGICO
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {activePatient.diagnosticReason}
            </p>
          </div>

          {/* Direct module launcher for this patient */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              MÓDULOS DE VALORACIÓN PARA ESTE PACIENTE
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { tab: 'posture' as NavTab, label: 'Postura', desc: 'Alineación corporal' },
                { tab: 'mobility' as NavTab, label: 'Movilidad', desc: 'Limitaciones ROM' },
                { tab: 'strength' as NavTab, label: 'Fuerza', desc: 'ActivForce 2 (Kg)' },
                { tab: 'movement' as NavTab, label: '7 Gestos', desc: 'Control motor' },
                { tab: 'treatment' as NavTab, label: 'Plan', desc: 'Ejercicios asignados' },
                { tab: 'progress' as NavTab, label: 'Evolución', desc: 'Gráficas históricas' },
              ].map((m) => (
                <button
                  key={m.tab}
                  type="button"
                  onClick={() => onNavigateTo(m.tab)}
                  className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 text-left transition-all group"
                >
                  <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700 block">
                    {m.label} →
                  </span>
                  <span className="text-[10px] text-slate-500">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Registrar Nuevo Paciente */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                <span>Registrar Nuevo Paciente</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Andrés Felipe Moreno"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Edad</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Género</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="M">Masc.</option>
                    <option value="F">Fem.</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nacimiento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Documento / ID</label>
                  <input
                    type="text"
                    placeholder="CC 1.098..."
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+57 300..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deporte o Actividad Física</label>
                <input
                  type="text"
                  placeholder="Ej. Fútbol, Ciclismo de ruta, Gimnasio..."
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Motivo de Consulta / Lesión</label>
                <textarea
                  rows={2}
                  placeholder="Descripción de la molestia o diagnóstico..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs"
                >
                  Crear y Abrir Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
