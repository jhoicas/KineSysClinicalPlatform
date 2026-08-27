import React, { useState } from 'react';
import { PacienteClinico } from '../../types';

interface PatientListModuleProps {
  patients: PacienteClinico[];
  selectedPatient: PacienteClinico | null;
  onSelectPatient: (patient: PacienteClinico) => void;
  onStartSoap: (patient: PacienteClinico) => void;
  onStartPrescription: (patient: PacienteClinico) => void;
  onAddNewPatient?: (newPatient: PacienteClinico) => void;
}

export const PatientListModule: React.FC<PatientListModuleProps> = ({
  patients,
  selectedPatient,
  onSelectPatient,
  onStartSoap,
  onStartPrescription,
  onAddNewPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAllergy, setFilterAllergy] = useState<string>('all');
  const [showFhirJsonModal, setShowFhirJsonModal] = useState<PacienteClinico | null>(null);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // New patient modal state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female' | 'other'>('female');
  const [newBirthDate, setNewBirthDate] = useState('1994-05-15');
  const [newPhone, setNewPhone] = useState('+57 310 987 6543');
  const [newEmail, setNewEmail] = useState('');
  const [newAllergies, setNewAllergies] = useState('');
  const [newConditions, setNewConditions] = useState('');
  const [newBloodType, setNewBloodType] = useState<'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'>('O+');

  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      p.identifier_number.toLowerCase().includes(query) ||
      p.telecom_email.toLowerCase().includes(query) ||
      p.telecom_phone.includes(query) ||
      p.known_allergies.some((a) => a.toLowerCase().includes(query));

    if (filterAllergy === 'has_allergies') {
      return matchesSearch && p.known_allergies.length > 0 && !p.known_allergies.includes('Ninguna');
    }
    return matchesSearch;
  });

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/D';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} años`;
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !newDni) return;

    const patientObj: PacienteClinico = {
      id: `pat_cli_${Date.now()}`,
      tenant_id: selectedPatient?.tenant_id || 'tenant_kine_001',
      fhir_resource_id: `Patient/${Date.now().toString(16)}`,
      identifier_type: 'CC',
      identifier_number: newDni.trim(),
      first_name: newFirstName.trim(),
      last_name: newLastName.trim(),
      gender: newGender,
      birth_date: newBirthDate,
      telecom_phone: newPhone.trim(),
      telecom_email: newEmail.trim() || `${newFirstName.toLowerCase()}@correo.com`,
      blood_type: newBloodType,
      known_allergies: newAllergies
        ? newAllergies.split(',').map((a) => a.trim())
        : ['Ninguna conocida'],
      chronic_conditions: newConditions
        ? newConditions.split(',').map((c) => c.trim())
        : [],
      active: true,
      created_at: new Date().toISOString(),
    };

    if (onAddNewPatient) {
      onAddNewPatient(patientObj);
    }
    onSelectPatient(patientObj);
    setShowNewPatientModal(false);
    // Reset
    setNewFirstName('');
    setNewLastName('');
    setNewDni('');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-on-surface">Directorio de Pacientes</h2>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black uppercase font-mono">
                FHIR R4 Patient
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Gestión clínica, identificación biomédica, alertas de alergias e historial de consultas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowNewPatientModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30">
        <div className="sm:col-span-8 relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, documento (RUT/CC/DNI), teléfono o alergia..."
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-on-surface focus:border-primary outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="sm:col-span-4 flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">Filtrar:</span>
          <select
            value={filterAllergy}
            onChange={(e) => setFilterAllergy(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface focus:border-primary outline-none cursor-pointer"
          >
            <option value="all">Todos los pacientes ({patients.length})</option>
            <option value="has_allergies">⚠️ Con Alergias Registradas</option>
          </select>
        </div>
      </div>

      {/* Patient Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => {
          const isSelected = selectedPatient?.id === patient.id;
          const hasAllergies =
            patient.known_allergies.length > 0 &&
            !patient.known_allergies.includes('Ninguna') &&
            !patient.known_allergies.includes('Ninguna conocida');

          return (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-primary/5 border-primary shadow-md shadow-primary/10'
                  : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant hover:bg-surface-container-low/50'
              }`}
            >
              <div>
                {/* Header: Name, Gender & Blood Type */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center font-black text-sm text-primary">
                      {patient.first_name[0]}
                      {patient.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-on-surface leading-tight">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant font-mono">
                        {patient.identifier_type}: {patient.identifier_number}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-mono">
                      {patient.blood_type || 'O+'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      {calculateAge(patient.birth_date)}
                    </span>
                  </div>
                </div>

                {/* Contact info */}
                <div className="mt-3 pt-3 border-t border-outline-variant/20 space-y-1 text-xs text-on-surface-variant">
                  <p className="flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-sm text-primary">call</span>
                    <span>{patient.telecom_phone}</span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-sm text-primary">mail</span>
                    <span>{patient.telecom_email}</span>
                  </p>
                </div>

                {/* Allergies and Chronic Conditions Badges */}
                <div className="mt-3 pt-2 border-t border-outline-variant/20 space-y-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-on-surface-variant block mb-1">
                      Alergias Conocidas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {hasAllergies ? (
                        patient.known_allergies.map((allergy, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">warning</span>
                            <span>{allergy}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Sin alergias declaradas
                        </span>
                      )}
                    </div>
                  </div>

                  {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black uppercase text-on-surface-variant block mb-1">
                        Condiciones / Antecedentes:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {patient.chronic_conditions.map((cond, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant"
                          >
                            {cond}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-outline-variant/20 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPatient(patient);
                    onStartSoap(patient);
                  }}
                  className="px-2 py-2 bg-primary hover:bg-primary-container text-white text-[11px] font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                  title="Abrir formulario de atención clínica SOAP"
                >
                  <span className="material-symbols-outlined text-sm">clinical_notes</span>
                  <span>SOAP</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPatient(patient);
                    onStartPrescription(patient);
                  }}
                  className="px-2 py-2 bg-sky-100 hover:bg-sky-200 text-sky-900 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Emitir prescripción médica electrónica"
                >
                  <span className="material-symbols-outlined text-sm">medication</span>
                  <span>Receta</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFhirJsonModal(patient);
                  }}
                  className="px-2 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Ver recurso FHIR R4 estándar"
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>FHIR</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPatients.length === 0 && (
        <div className="p-12 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 space-y-2">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/60">person_search</span>
          <h4 className="font-extrabold text-sm text-on-surface">No se encontraron pacientes</h4>
          <p className="text-xs text-on-surface-variant">Prueba ajustando el término de búsqueda o registra un nuevo paciente.</p>
        </div>
      )}

      {/* FHIR JSON Interoperability Modal */}
      {showFhirJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-3xl p-6 border border-outline-variant/30 clinical-shadow space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-sky-100 text-sky-800 rounded-lg material-symbols-outlined text-base">
                  data_object
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">Recurso FHIR R4: Patient</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    {showFhirJsonModal.first_name} {showFhirJsonModal.last_name} ({showFhirJsonModal.identifier_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFhirJsonModal(null)}
                className="text-on-surface-variant hover:text-on-surface text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] leading-relaxed select-all">
              <pre>
                {JSON.stringify(
                  {
                    resourceType: 'Patient',
                    id: showFhirJsonModal.id,
                    identifier: [
                      {
                        use: 'official',
                        system: `urn:oid:${showFhirJsonModal.identifier_type}`,
                        value: showFhirJsonModal.identifier_number,
                      },
                    ],
                    active: showFhirJsonModal.active,
                    name: [
                      {
                        use: 'official',
                        family: showFhirJsonModal.last_name,
                        given: [showFhirJsonModal.first_name],
                      },
                    ],
                    telecom: [
                      { system: 'phone', value: showFhirJsonModal.telecom_phone, use: 'mobile' },
                      { system: 'email', value: showFhirJsonModal.telecom_email, use: 'home' },
                    ],
                    gender: showFhirJsonModal.gender,
                    birthDate: showFhirJsonModal.birth_date,
                    extension: [
                      {
                        url: 'http://hl7.org/fhir/StructureDefinition/patient-bloodType',
                        valueString: showFhirJsonModal.blood_type || 'O+',
                      },
                      {
                        url: 'http://hl7.org/fhir/StructureDefinition/patient-knownAllergies',
                        valueString: showFhirJsonModal.known_allergies.join(', '),
                      },
                    ],
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
              <span className="text-on-surface-variant">Interoperabilidad semántica HL7 FHIR Release 4</span>
              <button
                onClick={() => setShowFhirJsonModal(null)}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-extrabold rounded-xl cursor-pointer"
              >
                Cerrar Visor FHIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Registration Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePatient}
            className="bg-surface-container-lowest max-w-xl w-full rounded-3xl p-6 border border-outline-variant/30 clinical-shadow space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-primary/10 text-primary rounded-lg material-symbols-outlined text-base">
                  person_add
                </span>
                <h3 className="font-extrabold text-sm text-on-surface">Registrar Nuevo Paciente Clínico</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ej: Sofia Andrea"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ej: Morales Castro"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Doc. Identidad (CC/RUT/DNI) *</label>
                  <input
                    type="text"
                    required
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="10.234.567-8"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Fecha Nacimiento</label>
                  <input
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2 text-xs font-bold text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Género</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                    <option value="other">Otro / No binario</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Grupo Sanguíneo</label>
                  <select
                    value={newBloodType}
                    onChange={(e) => setNewBloodType(e.target.value as any)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="O+">O Positivo (O+)</option>
                    <option value="O-">O Negativo (O-)</option>
                    <option value="A+">A Positivo (A+)</option>
                    <option value="A-">A Negativo (A-)</option>
                    <option value="B+">B Positivo (B+)</option>
                    <option value="B-">B Negativo (B-)</option>
                    <option value="AB+">AB Positivo (AB+)</option>
                    <option value="AB-">AB Negativo (AB-)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 text-red-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  <span>Alergias Medicamentosas / Ambientales (Separar por comas)</span>
                </label>
                <input
                  type="text"
                  value={newAllergies}
                  onChange={(e) => setNewAllergies(e.target.value)}
                  placeholder="Ej: Penicilina, Ibuprofeno, Sulfa (o dejar vacío para 'Ninguna')"
                  className="w-full bg-red-50/50 border border-red-200 rounded-xl p-2.5 text-xs font-bold text-red-900 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Antecedentes / Condiciones Crónicas</label>
                <input
                  type="text"
                  value={newConditions}
                  onChange={(e) => setNewConditions(e.target.value)}
                  placeholder="Ej: Hipertensión arterial, Diabetes Mellitus tipo 2"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Guardar Paciente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
