import React, { useState } from 'react';
import { OrdenNutricionFHIR, PacienteClinico } from '../../types';

interface FhirNutritionOrderModuleProps {
  orders: OrdenNutricionFHIR[];
  patients: PacienteClinico[];
  activePatientId: string;
  onSelectPatient: (patientId: string) => void;
  onCreateTestOrder: (order: OrdenNutricionFHIR) => Promise<void>;
  tenantId: string;
}

export const FhirNutritionOrderModule: React.FC<FhirNutritionOrderModuleProps> = ({
  orders,
  patients,
  activePatientId,
  onSelectPatient,
  onCreateTestOrder,
  tenantId,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<OrdenNutricionFHIR | null>(
    orders.length > 0 ? orders[0] : null
  );
  const [viewJson, setViewJson] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation form
  const [simPatientId, setSimPatientId] = useState(activePatientId || (patients[0]?.id || ''));
  const [simDoctorName, setSimDoctorName] = useState('Dr. Fernando Castillo (Medicina General)');
  const [simIndication, setSimIndication] = useState('Hipertensión Arterial Estadio 2 - Pauta Hiposódica Estricta');
  const [simDietType, setSimDietType] = useState('Dieta Hiposódica (< 1500mg Na/día)');
  const [simSodiumMax, setSimSodiumMax] = useState<number>(1500);

  const handleSimulateNewOrder = async () => {
    setIsSimulating(true);
    try {
      const p = patients.find((pat) => pat.id === simPatientId);
      const newOrder: OrdenNutricionFHIR = {
        id: `fhir_order_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tenant_id: tenantId,
        patient_id: simPatientId,
        practitioner_id: 'prof_doctor_01',
        practitioner_name: simDoctorName,
        order_date: new Date().toISOString().split('T')[0],
        status: 'active',
        diet_category: 'therapeutic',
        clinical_indication: simIndication,
        restrictions: [
          {
            id: `rest_${Date.now()}`,
            type: 'sodium_limit',
            label: 'Restricción Hiposódica Estricta',
            max_limit_value: simSodiumMax,
            unit: 'mg/día',
            enforced: true,
            description: `Restricción clínica mandatoria de sodio < ${simSodiumMax} mg/día emitida en interconsulta médica.`,
          },
        ],
        oral_diet_details: {
          type_description: simDietType,
          nutrient_modifications: [`Sodio < ${simSodiumMax}mg`, 'Control de electrolitos'],
          texture: 'regular',
        },
        fhir_json: {
          resourceType: 'NutritionOrder',
          id: `order-hl7-${Date.now()}`,
          status: 'active',
          intent: 'order',
          patient: {
            reference: `Patient/${p?.identifier_number || '14231890-7'}`,
            display: `${p?.first_name || 'Paciente'} ${p?.last_name || 'EHR'}`,
          },
          orderer: {
            reference: 'Practitioner/COL-MED-8420',
            display: simDoctorName,
          },
          dateTime: new Date().toISOString(),
          oralDiet: {
            type: [
              {
                coding: [
                  {
                    system: 'http://snomed.info/sct',
                    code: '386619000',
                    display: 'Low sodium diet',
                  },
                ],
                text: simDietType,
              },
            ],
            nutrient: [
              {
                modifier: {
                  coding: [
                    {
                      system: 'http://snomed.info/sct',
                      code: '39972003',
                      display: 'Sodium',
                    },
                  ],
                },
                amount: {
                  value: simSodiumMax,
                  unit: 'mg',
                  system: 'http://unitsofmeasure.org',
                  code: 'mg',
                },
              },
            ],
          },
        },
        created_at: new Date().toISOString(),
      };

      await onCreateTestOrder(newOrder);
      setSelectedOrder(newOrder);
    } catch (err) {
      console.error('Error creating simulated FHIR nutrition order:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-secondary-fixed/40 text-on-secondary-fixed font-bold border border-secondary-fixed-dim">
              <span className="material-symbols-outlined text-lg">sync_alt</span>
            </span>
            <h2 className="text-sm font-black text-on-surface">
              Interoperabilidad Semántica HL7 FHIR (NutritionOrder R4)
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Recepción y ejecución de órdenes dietoterapéuticas emitidas por el médico tratante en el EHR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-surface-container-high text-on-surface text-xs font-mono font-bold rounded-xl border border-outline-variant/40">
            FHIR R4 • US Core / Cl-Core
          </span>
        </div>
      </div>

      {/* Main Grid: Orders list left, Details & JSON right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orders List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">
            Órdenes Recibidas ({orders.length})
          </h3>

          <div className="space-y-2.5">
            {orders.map((order) => {
              const p = patients.find((pat) => pat.id === order.patient_id);
              const isSelected = selectedOrder?.id === order.id;

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    if (p) onSelectPatient(p.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 ${
                    isSelected
                      ? 'bg-secondary-fixed/30 border-secondary-fixed-dim shadow-2xs'
                      : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">
                      {p ? `${p.first_name} ${p.last_name}` : 'Paciente'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-fixed text-on-secondary-fixed border border-secondary-fixed-dim">
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant font-medium line-clamp-2">
                    {order.clinical_indication}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono pt-1 border-t border-outline-variant/20">
                    <span>{order.order_date}</span>
                    <span>{order.practitioner_name.split(' ')[0]} {order.practitioner_name.split(' ')[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulate New FHIR Order Panel */}
          <div className="p-4 bg-surface-container-low rounded-3xl border border-outline-variant/30 space-y-3 mt-4">
            <h4 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">send_and_archive</span>
              <span>Simulador de Orden Médica FHIR</span>
            </h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Simule la emisión de una prescripción nutricional desde el perfil médico para comprobar las alertas de bloqueo clínico.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-0.5">Paciente</label>
                <select
                  value={simPatientId}
                  onChange={(e) => setSimPatientId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2 py-1.5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.identifier_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-0.5">Indicación Clínica</label>
                <input
                  type="text"
                  value={simIndication}
                  onChange={(e) => setSimIndication(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2 py-1.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-0.5">Límite Máximo de Sodio (mg/día)</label>
                <input
                  type="number"
                  value={simSodiumMax}
                  onChange={(e) => setSimSodiumMax(parseInt(e.target.value) || 1500)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2 py-1.5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateNewOrder}
              disabled={isSimulating}
              className="w-full py-2 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">outgoing_mail</span>
              <span>{isSimulating ? 'Emitiendo...' : 'Emitir Orden FHIR de Prueba'}</span>
            </button>
          </div>
        </div>

        {/* Order Details & HL7 FHIR Inspector (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedOrder ? (
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-6">
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-on-primary-fixed bg-primary-fixed/50 px-2.5 py-0.5 rounded-md border border-primary-fixed-dim">
                      NutritionOrder/{selectedOrder.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-[10px] font-mono font-bold border border-secondary-fixed-dim">
                      Categoría: {selectedOrder.diet_category}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-on-surface mt-1">
                    {selectedOrder.oral_diet_details.type_description}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewJson(!viewJson)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                      viewJson
                        ? 'bg-surface-container-highest text-on-surface border-outline-variant'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">code</span>
                    <span>{viewJson ? 'Ver Vista Clínica' : 'Ver FHIR JSON'}</span>
                  </button>
                </div>
              </div>

              {/* View Content */}
              {viewJson ? (
                /* HL7 FHIR JSON Inspector */
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-on-surface-variant font-mono">
                    <span>HL7 FHIR R4 • Resource: NutritionOrder</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          JSON.stringify(selectedOrder.fhir_json || selectedOrder, null, 2)
                        );
                      }}
                      className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      <span>Copiar JSON</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-surface-container-highest/60 rounded-2xl text-[11px] font-mono text-on-surface overflow-x-auto border border-outline-variant/30 leading-relaxed max-h-[450px]">
                    {JSON.stringify(selectedOrder.fhir_json || selectedOrder, null, 2)}
                  </pre>
                </div>
              ) : (
                /* Clinical Friendly View */
                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                        Médico Prescriptor
                      </span>
                      <span className="font-extrabold text-on-surface text-xs block">
                        {selectedOrder.practitioner_name}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        ID: {selectedOrder.practitioner_id} • Fecha: {selectedOrder.order_date}
                      </span>
                    </div>

                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                        Estado de Ejecución
                      </span>
                      <span className="font-extrabold text-on-secondary-fixed text-xs block">
                        ✓ Activa en Planificador de Menús
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        Validación automática de macronutrientes activa
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-on-surface uppercase tracking-wider text-[11px] block">
                      Justificación & Diagnóstico Clínico
                    </span>
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 text-on-surface leading-relaxed">
                      {selectedOrder.clinical_indication}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="font-bold text-on-surface uppercase tracking-wider text-[11px] block">
                      Reglas Clínicas Enlazadas ({selectedOrder.restrictions.length})
                    </span>

                    <div className="space-y-2">
                      {selectedOrder.restrictions.map((rest) => (
                        <div
                          key={rest.id}
                          className="p-3.5 bg-secondary-fixed/20 rounded-2xl border border-secondary-fixed-dim flex items-start gap-3"
                        >
                          <span className="material-symbols-outlined text-secondary text-lg">
                            lock
                          </span>
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-on-surface">{rest.label}</span>
                              {rest.max_limit_value && (
                                <span className="font-mono font-black text-on-secondary-fixed bg-secondary-fixed px-2 py-0.5 rounded text-[10px] border border-secondary-fixed-dim">
                                  Límite: {rest.max_limit_value} {rest.unit}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-on-surface-variant leading-relaxed">
                              {rest.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/30 text-center text-on-surface-variant text-xs">
              Seleccione una orden del panel izquierdo para inspeccionar sus restricciones clínicas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
