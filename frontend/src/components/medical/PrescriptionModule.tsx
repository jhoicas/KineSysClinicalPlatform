import React, { useState } from 'react';
import { PacienteClinico, PrescripcionMedica, MedicationItem } from '../../types';

interface PrescriptionModuleProps {
  patient: PacienteClinico;
  doctorId: string;
  doctorName: string;
  doctorLicense?: string;
  tenantId: string;
  encounterId?: string;
  onSavePrescription: (prescription: PrescripcionMedica) => Promise<void>;
}

// Medical catalog with drug classification and known allergen groups
interface DrugCatalogItem {
  id: string;
  name: string;
  generic: string;
  form: 'tableta' | 'capsula' | 'jarabe' | 'ampolla' | 'crema' | 'gotas' | 'inhalador';
  strength: string;
  route: 'oral' | 'intravenosa' | 'intramuscular' | 'subcutanea' | 'topica' | 'oftalmica' | 'inhalatoria';
  defaultFrequency: string;
  defaultDuration: string;
  allergenGroups: string[]; // e.g. ['penicilina', 'betalactamicos'], ['ibuprofeno', 'aines', 'antiinflamatorios']
}

const COMMON_DRUGS: DrugCatalogItem[] = [
  {
    id: 'drg_paracetamol',
    name: 'Paracetamol',
    generic: 'Acetaminofén',
    form: 'tableta',
    strength: '500 mg',
    route: 'oral',
    defaultFrequency: 'Cada 8 horas',
    defaultDuration: '5 días',
    allergenGroups: ['paracetamol', 'acetaminofen'],
  },
  {
    id: 'drg_ibuprofeno',
    name: 'Ibuprofeno',
    generic: 'Ibuprofeno',
    form: 'tableta',
    strength: '400 mg',
    route: 'oral',
    defaultFrequency: 'Cada 8 horas con alimentos',
    defaultDuration: '5 días',
    allergenGroups: ['ibuprofeno', 'aines', 'antiinflamatorios'],
  },
  {
    id: 'drg_ketorolaco',
    name: 'Ketorolaco',
    generic: 'Ketorolaco Trometamol',
    form: 'tableta',
    strength: '10 mg',
    route: 'oral',
    defaultFrequency: 'Cada 8 horas (máximo 5 días)',
    defaultDuration: '3 días',
    allergenGroups: ['ibuprofeno', 'aines', 'antiinflamatorios', 'ketorolaco'],
  },
  {
    id: 'drg_amoxicilina',
    name: 'Amoxicilina',
    generic: 'Amoxicilina trihidrato',
    form: 'capsula',
    strength: '500 mg',
    route: 'oral',
    defaultFrequency: 'Cada 8 horas',
    defaultDuration: '7 días',
    allergenGroups: ['penicilina', 'amoxicilina', 'betalactamicos'],
  },
  {
    id: 'drg_amox_clav',
    name: 'Amoxicilina + Ácido Clavulánico',
    generic: 'Amoxicilina / Clavulanato',
    form: 'tableta',
    strength: '875/125 mg',
    route: 'oral',
    defaultFrequency: 'Cada 12 horas',
    defaultDuration: '7 días',
    allergenGroups: ['penicilina', 'amoxicilina', 'betalactamicos'],
  },
  {
    id: 'drg_ciclobenzaprina',
    name: 'Ciclobenzaprina',
    generic: 'Ciclobenzaprina Clorhidrato',
    form: 'tableta',
    strength: '10 mg',
    route: 'oral',
    defaultFrequency: '1 tableta antes de dormir (Noche)',
    defaultDuration: '7 días',
    allergenGroups: ['ciclobenzaprina', 'relajantes musculares'],
  },
  {
    id: 'drg_omeprazol',
    name: 'Omeprazol',
    generic: 'Omeprazol',
    form: 'capsula',
    strength: '20 mg',
    route: 'oral',
    defaultFrequency: '1 cápsula en ayunas (Mañana)',
    defaultDuration: '14 días',
    allergenGroups: ['omeprazol', 'ibps'],
  },
  {
    id: 'drg_losartan',
    name: 'Losartán',
    generic: 'Losartán Potásico',
    form: 'tableta',
    strength: '50 mg',
    route: 'oral',
    defaultFrequency: 'Cada 24 horas (Mañana)',
    defaultDuration: '30 días (Tratamiento Crónico)',
    allergenGroups: ['losartan', 'ara2'],
  },
  {
    id: 'drg_salbutamol',
    name: 'Salbutamol Inhalador',
    generic: 'Salbutamol aerosol',
    form: 'inhalador',
    strength: '100 mcg / dosis',
    route: 'inhalatoria',
    defaultFrequency: '2 puff cada 6 a 8 horas según necesidad',
    defaultDuration: '1 inhalador',
    allergenGroups: ['salbutamol'],
  },
  {
    id: 'drg_vitamina_d',
    name: 'Vitamina D3 (Colecalciferol)',
    generic: 'Colecalciferol',
    form: 'capsula',
    strength: '50.000 UI',
    route: 'oral',
    defaultFrequency: '1 cápsula cada 15 días',
    defaultDuration: '3 meses',
    allergenGroups: ['vitaminas'],
  },
];

export const PrescriptionModule: React.FC<PrescriptionModuleProps> = ({
  patient,
  doctorId,
  doctorName,
  doctorLicense,
  tenantId,
  encounterId,
  onSavePrescription,
}) => {
  // Prescription items
  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      id: 'med_01',
      medication_name: 'Paracetamol',
      generic_name: 'Acetaminofén',
      pharmaceutical_form: 'tableta',
      strength_concentration: '500 mg',
      dosage_instruction: '1 tableta',
      route: 'oral',
      frequency: 'Cada 8 horas',
      duration: '5 días',
      quantity_to_dispense: 15,
      clinical_indication: 'Manejo analgésico de primera línea',
    },
  ]);

  const [generalInstructions, setGeneralInstructions] = useState(
    'Tomar los medicamentos con abundante agua. No suspender antibióticos antes de completar el ciclo indicado. En caso de presentar erupción cutánea o dificultad respiratoria, suspender de inmediato y consultar a urgencias.'
  );

  // New item drafting state
  const [selectedCatalogDrug, setSelectedCatalogDrug] = useState<DrugCatalogItem | null>(null);
  const [customName, setCustomName] = useState('');
  const [customGeneric, setCustomGeneric] = useState('');
  const [customForm, setCustomForm] = useState<MedicationItem['pharmaceutical_form']>('tableta');
  const [customStrength, setCustomStrength] = useState('500 mg');
  const [customDosage, setCustomDosage] = useState('1 tableta');
  const [customRoute, setCustomRoute] = useState<MedicationItem['route']>('oral');
  const [customFrequency, setCustomFrequency] = useState('Cada 8 horas');
  const [customDuration, setCustomDuration] = useState('5 días');
  const [customQuantity, setCustomQuantity] = useState<number>(15);
  const [customIndication, setCustomIndication] = useState('Manejo sintomático');

  // Override reason modal for allergy clash
  const [activeAllergyClash, setActiveAllergyClash] = useState<{
    drugName: string;
    allergen: string;
    itemIndex?: number;
  } | null>(null);
  const [overrideReasonText, setOverrideReasonText] = useState('');

  // UI view state
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [savedPrescription, setSavedPrescription] = useState<PrescripcionMedica | null>(null);

  // Helper: check if a drug clashes with patient's allergies
  const checkDrugAllergy = (drugName: string, genericName: string, allergenGroups: string[] = []): string | null => {
    const patientAllergies = patient.known_allergies.map((a) => a.toLowerCase().trim());
    if (patientAllergies.length === 0 || patientAllergies.includes('ninguna') || patientAllergies.includes('ninguna conocida')) {
      return null;
    }

    const drugTokens = [
      drugName.toLowerCase(),
      genericName.toLowerCase(),
      ...allergenGroups.map((g) => g.toLowerCase()),
    ];

    for (const allergy of patientAllergies) {
      if (allergy.length < 3) continue;
      for (const token of drugTokens) {
        if (token.includes(allergy) || allergy.includes(token)) {
          return allergy.toUpperCase();
        }
      }
      // Special cross-allergy checks (e.g. Penicillin vs Amoxicillin, NSAIDs vs Ibuprofen)
      if (allergy.includes('penicilina') && drugTokens.some((t) => t.includes('amoxicil') || t.includes('clavul') || t.includes('ampicil'))) {
        return 'PENICILINA (Betalactámicos)';
      }
      if ((allergy.includes('ibuprofeno') || allergy.includes('aine')) && drugTokens.some((t) => t.includes('ketorol') || t.includes('naprox') || t.includes('ibuprof') || t.includes('diclofen'))) {
        return 'AINES / IBUPROFENO';
      }
      if (allergy.includes('aspirina') && drugTokens.some((t) => t.includes('acido acetilsalicilico') || t.includes('aines'))) {
        return 'SALICILATOS / ASPIRINA';
      }
    }

    return null;
  };

  const handleSelectFromCatalog = (drug: DrugCatalogItem) => {
    setSelectedCatalogDrug(drug);
    setCustomName(drug.name);
    setCustomGeneric(drug.generic);
    setCustomForm(drug.form);
    setCustomStrength(drug.strength);
    setCustomRoute(drug.route);
    setCustomFrequency(drug.defaultFrequency);
    setCustomDuration(drug.defaultDuration);
  };

  const handleAddMedication = () => {
    if (!customName.trim()) return;

    const matchedAllergen = checkDrugAllergy(
      customName,
      customGeneric || customName,
      selectedCatalogDrug?.allergenGroups || []
    );

    const newItem: MedicationItem = {
      id: `med_${Date.now()}`,
      medication_name: customName.trim(),
      generic_name: customGeneric.trim() || customName.trim(),
      pharmaceutical_form: customForm,
      strength_concentration: customStrength,
      dosage_instruction: customDosage,
      route: customRoute,
      frequency: customFrequency,
      duration: customDuration,
      quantity_to_dispense: Number(customQuantity) || 1,
      clinical_indication: customIndication,
      allergy_warning: matchedAllergen
        ? {
            detected: true,
            allergen_match: matchedAllergen,
            severity: 'critical',
            reason: `El paciente tiene documentada alergia a '${matchedAllergen}'. Riesgo de reacción anafiláctica o hipersensibilidad.`,
            overridden: false,
          }
        : undefined,
    };

    setMedications([...medications, newItem]);

    // Reset draft fields
    setSelectedCatalogDrug(null);
    setCustomName('');
    setCustomGeneric('');
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter((m) => m.id !== id));
  };

  const handleOpenOverride = (index: number, item: MedicationItem) => {
    if (!item.allergy_warning) return;
    setActiveAllergyClash({
      drugName: item.medication_name,
      allergen: item.allergy_warning.allergen_match,
      itemIndex: index,
    });
    setOverrideReasonText(item.allergy_warning.override_reason || '');
  };

  const handleConfirmOverride = () => {
    if (activeAllergyClash && activeAllergyClash.itemIndex !== undefined) {
      const copy = [...medications];
      const item = copy[activeAllergyClash.itemIndex];
      if (item.allergy_warning) {
        item.allergy_warning.overridden = true;
        item.allergy_warning.override_reason =
          overrideReasonText.trim() || 'Desensibilización previa o indicación con estricta supervisión hospitalaria.';
      }
      setMedications(copy);
    }
    setActiveAllergyClash(null);
    setOverrideReasonText('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (medications.length === 0) return;

    setIsSaving(true);
    try {
      const prescObj: PrescripcionMedica = {
        id: `rx_${Date.now()}`,
        tenant_id: tenantId,
        patient_id: patient.id,
        encounter_id: encounterId,
        practitioner_id: doctorId,
        prescription_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        medications,
        general_instructions: generalInstructions,
        status: 'active',
        digital_signature_hash: `SIG-HL7-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        created_at: new Date().toISOString(),
      };

      await onSavePrescription(prescObj);
      setSavedPrescription(prescObj);
      setShowPrintModal(true);
    } catch (err) {
      console.error('Error saving prescription:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Patient & Allergy Status Banner */}
      <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-base">
            <span className="material-symbols-outlined text-2xl">medication</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-on-surface">
                Prescripción Electrónica & Dispensación
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black uppercase font-mono">
                FHIR MedicationRequest
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Paciente: <strong>{patient.first_name} {patient.last_name}</strong> ({patient.identifier_type}: {patient.identifier_number})
            </p>
          </div>
        </div>

        {/* Allergy Cross-Check Indicator */}
        <div className="flex items-center gap-2">
          {patient.known_allergies.length > 0 && !patient.known_allergies.includes('Ninguna') ? (
            <div className="px-3.5 py-2 rounded-2xl bg-red-100 border border-red-300 text-red-950 text-xs font-black flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-lg animate-pulse">
                shield_with_heart
              </span>
              <div>
                <div className="text-[10px] text-red-700 uppercase">Sistema de Alerta Cruzada Activo</div>
                <div>Alergias: {patient.known_allergies.join(', ')}</div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-emerald-600">verified_user</span>
              <span>Sin alergias conocidas registradas</span>
            </div>
          )}
        </div>
      </div>

      {/* Drug Catalog Quick Selector */}
      <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">local_pharmacy</span>
            <h3 className="font-extrabold text-sm text-on-surface">Vademécum Rápido (Selección con 1-Click)</h3>
          </div>
          <span className="text-[11px] text-on-surface-variant">
            Validación automática de contraindicaciones
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {COMMON_DRUGS.map((drug) => {
            const hasClash = checkDrugAllergy(drug.name, drug.generic, drug.allergenGroups);
            return (
              <button
                key={drug.id}
                type="button"
                onClick={() => handleSelectFromCatalog(drug)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  hasClash
                    ? 'bg-red-50 border-red-300 text-red-900 hover:bg-red-100'
                    : 'bg-surface-container-low hover:bg-primary/10 border-outline-variant/40 text-on-surface'
                }`}
              >
                {hasClash ? (
                  <span className="material-symbols-outlined text-red-600 text-sm">warning</span>
                ) : (
                  <span className="material-symbols-outlined text-primary text-sm">add_circle</span>
                )}
                <span>{drug.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({drug.strength})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Medication Entry Form */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
        <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-600">edit_note</span>
          <span>Configurar Posología del Fármaco</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Nombre Comercial / Fármaco *</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ej: Amoxicilina, Ibuprofeno..."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Principio Activo (Genérico)</label>
            <input
              type="text"
              value={customGeneric}
              onChange={(e) => setCustomGeneric(e.target.value)}
              placeholder="Ej: Amoxicilina trihidrato"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Concentración</label>
            <input
              type="text"
              value={customStrength}
              onChange={(e) => setCustomStrength(e.target.value)}
              placeholder="500 mg, 1 g, 10 mg/ml"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Forma Farmacéutica</label>
            <select
              value={customForm}
              onChange={(e) => setCustomForm(e.target.value as any)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
            >
              <option value="tableta">Tabletas / Comprimidos</option>
              <option value="capsula">Cápsulas</option>
              <option value="jarabe">Jarabe / Suspensión</option>
              <option value="ampolla">Ampolla Inyectable</option>
              <option value="crema">Crema / Gel Tópico</option>
              <option value="gotas">Gotas Solución</option>
              <option value="inhalador">Inhalador Aerosol</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Dosis Unitaria</label>
            <input
              type="text"
              value={customDosage}
              onChange={(e) => setCustomDosage(e.target.value)}
              placeholder="1 tableta, 2 puff, 5 ml"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Vía de Administración</label>
            <select
              value={customRoute}
              onChange={(e) => setCustomRoute(e.target.value as any)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
            >
              <option value="oral">Oral</option>
              <option value="intravenosa">Intravenosa (IV)</option>
              <option value="intramuscular">Intramuscular (IM)</option>
              <option value="subcutanea">Subcutánea (SC)</option>
              <option value="topica">Tópica</option>
              <option value="oftalmica">Oftálmica</option>
              <option value="inhalatoria">Inhalatoria</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Frecuencia / Intervalo</label>
            <input
              type="text"
              value={customFrequency}
              onChange={(e) => setCustomFrequency(e.target.value)}
              placeholder="Cada 8 horas con comida"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Duración Tratamiento</label>
            <input
              type="text"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="5 días, 7 días..."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant mb-1">Cantidad a Dispensar</label>
            <input
              type="number"
              value={customQuantity}
              onChange={(e) => setCustomQuantity(Number(e.target.value))}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Live allergy check on the drafted drug */}
        {customName && checkDrugAllergy(customName, customGeneric, selectedCatalogDrug?.allergenGroups) && (
          <div className="p-3.5 rounded-2xl bg-red-100 border-2 border-red-400 text-red-950 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-600 text-xl">dangerous</span>
              <div>
                <p className="font-black text-red-900">
                  ¡ADVERTENCIA CRÍTICA: Fármaco en Conflicto con Alergia Registrada!
                </p>
                <p className="text-[11px] text-red-800 font-medium">
                  El paciente presenta alergia activa a{' '}
                  <strong className="underline">
                    {checkDrugAllergy(customName, customGeneric, selectedCatalogDrug?.allergenGroups)}
                  </strong>
                  .
                </p>
              </div>
            </div>
            <span className="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase">
              Riesgo Alto
            </span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleAddMedication}
            className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Agregar a la Receta</span>
          </button>
        </div>
      </div>

      {/* Active Prescription Items List */}
      <form onSubmit={handleSave} className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">format_list_bulleted</span>
            <h3 className="font-extrabold text-sm text-on-surface">
              Medicamentos en la Prescripción ({medications.length})
            </h3>
          </div>
          <span className="text-[11px] text-on-surface-variant font-mono">
            Código Prescriptor: {doctorLicense || 'COL-MED-8420'}
          </span>
        </div>

        {medications.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-low rounded-2xl text-xs text-on-surface-variant">
            No hay medicamentos añadidos a esta receta médica. Utiliza el formulario superior o el vademécum rápido.
          </div>
        ) : (
          <div className="space-y-3">
            {medications.map((item, idx) => {
              const hasAllergyWarning = item.allergy_warning && item.allergy_warning.detected;
              const isOverridden = item.allergy_warning?.overridden;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border-2 transition-all space-y-2.5 ${
                    hasAllergyWarning && !isOverridden
                      ? 'bg-red-50/80 border-red-400'
                      : hasAllergyWarning && isOverridden
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-surface-container-low border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-on-surface">{item.medication_name}</span>
                        <span className="text-xs text-on-surface-variant font-medium">({item.strength_concentration})</span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] font-black uppercase text-on-surface-variant">
                          {item.pharmaceutical_form}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        <strong>Posología:</strong> {item.dosage_instruction} por vía {item.route}, <strong>{item.frequency}</strong> durante <strong>{item.duration}</strong>.
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Dispensar: <strong>{item.quantity_to_dispense} unidades</strong> • Indicación: <em>{item.clinical_indication}</em>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(item.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      title="Eliminar medicamento"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>

                  {/* Allergy clash banner per item */}
                  {hasAllergyWarning && (
                    <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                      isOverridden
                        ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                        : 'bg-red-100 border-red-300 text-red-950'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-red-600">
                          {isOverridden ? 'lock_reset' : 'warning'}
                        </span>
                        <div>
                          <span className="font-black">
                            {isOverridden ? 'Excepción Clínica Autorizada: ' : 'Alerta de Alergia: '}
                          </span>
                          <span>{item.allergy_warning?.reason}</span>
                          {isOverridden && item.allergy_warning?.override_reason && (
                            <p className="text-[11px] text-amber-900 italic mt-0.5">
                              Justificación: "{item.allergy_warning.override_reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenOverride(idx, item)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {isOverridden ? 'Modificar Justificación' : 'Autorizar con Justificación Médica'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* General instructions */}
        <div className="pt-2">
          <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
            Instrucciones Generales & Advertencias Farmacológicas
          </label>
          <textarea
            rows={2}
            value={generalInstructions}
            onChange={(e) => setGeneralInstructions(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-primary"
          />
        </div>

        {/* Submit & Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-outline-variant/20">
          <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600 text-sm">lock</span>
            <span>Firma digital con trazabilidad HL7 y código de autenticidad</span>
          </div>

          <button
            type="submit"
            disabled={isSaving || medications.length === 0}
            className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-2xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                <span>Guardando en Supabase...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Firmar & Emitir Receta Electrónica</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Clinical Override Reason Modal */}
      {activeAllergyClash && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-3xl p-6 border border-outline-variant/30 clinical-shadow space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">shield_person</span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-on-surface">
                  Excepción Clínica: Justificación de Riesgo
                </h3>
                <p className="text-xs text-red-700 font-bold">
                  Medicamento: {activeAllergyClash.drugName} • Alérgeno: {activeAllergyClash.allergen}
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              El sistema ha bloqueado automáticamente la prescripción por coincidencia con el historial de alergias del paciente. Para autorizar la dispensación, registre el criterio médico fundado:
            </p>

            <textarea
              rows={3}
              required
              value={overrideReasonText}
              onChange={(e) => setOverrideReasonText(e.target.value)}
              placeholder="Ej: Prueba cutánea previa negativa, esquema de desensibilización supervisado, o beneficio clínico superior con monitorización estricta..."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-red-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setActiveAllergyClash(null)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Confirmar Excepción Médica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Prescription Modal */}
      {showPrintModal && savedPrescription && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-3xl p-6 border border-outline-variant/30 clinical-shadow space-y-5 animate-fadeIn">
            {/* Header with clinic styling */}
            <div className="flex items-center justify-between border-b-2 border-primary/20 pb-4">
              <div>
                <span className="text-xs font-black uppercase text-primary tracking-wider">Centro de Salud KineSys</span>
                <h3 className="text-lg font-black text-on-surface">Receta Médica Electrónica Oficial</h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  ID Prescripción: {savedPrescription.id} • FHIR MedicationRequest
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-on-surface-variant block">Fecha de Emisión</span>
                <span className="text-xs font-black text-on-surface">{savedPrescription.prescription_date}</span>
              </div>
            </div>

            {/* Patient Demographic Box */}
            <div className="p-3 bg-surface-container-low rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-on-surface-variant block">Paciente</span>
                <strong className="text-on-surface">{patient.first_name} {patient.last_name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block">Documento</span>
                <strong className="font-mono text-on-surface">{patient.identifier_type}: {patient.identifier_number}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block">Grupo Sanguíneo</span>
                <strong className="text-on-surface">{patient.blood_type || 'O+'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block">Validez Hasta</span>
                <strong className="text-on-surface">{savedPrescription.valid_until}</strong>
              </div>
            </div>

            {/* Prescribed Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-on-surface">Detalle de Medicamentos & Posología</h4>
              <div className="border border-outline-variant/30 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-high text-on-surface-variant text-[11px] font-black uppercase">
                    <tr>
                      <th className="p-3">Medicamento & Dosis</th>
                      <th className="p-3">Vía & Frecuencia</th>
                      <th className="p-3">Duración</th>
                      <th className="p-3 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {savedPrescription.medications.map((m) => (
                      <tr key={m.id} className="bg-surface-container-lowest">
                        <td className="p-3">
                          <div className="font-black text-on-surface">{m.medication_name}</div>
                          <div className="text-[10px] text-on-surface-variant font-mono">{m.generic_name} • {m.strength_concentration} ({m.pharmaceutical_form})</div>
                        </td>
                        <td className="p-3 font-semibold text-on-surface">
                          {m.dosage_instruction} • Vía {m.route}
                          <div className="text-[10px] text-on-surface-variant">{m.frequency}</div>
                        </td>
                        <td className="p-3 font-semibold text-on-surface">{m.duration}</td>
                        <td className="p-3 text-right font-black text-primary">{m.quantity_to_dispense}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General notes */}
            <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant">
              <strong>Indicaciones Generales:</strong> {savedPrescription.general_instructions}
            </div>

            {/* Signature & QR verification */}
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
              <div className="space-y-1">
                <p className="text-xs font-black text-on-surface">{doctorName}</p>
                <p className="text-[11px] text-on-surface-variant">Médico Cirujano • Reg. Profesional: {doctorLicense || 'COL-MED-8420'}</p>
                <p className="text-[10px] font-mono text-emerald-700 font-bold">
                  Hash de Firma: {savedPrescription.digital_signature_hash}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-5 py-2 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
