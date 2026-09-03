/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  INITIAL_PATIENTS,
  INITIAL_POSTURE,
  INITIAL_MOBILITY,
  INITIAL_STRENGTH,
  INITIAL_MOVEMENT,
  INITIAL_TREATMENT_PLANS,
  PROGRESS_HISTORY,
  INITIAL_PAIN_MAP,
} from './data/mockData';
import {
  Patient,
  PostureAssessment,
  MobilityAssessment,
  StrengthAssessment,
  MovementAssessment,
  TreatmentPlan,
  ProgressSessionPoint,
  PainMapAssessment,
} from './types';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardModule } from './components/DashboardModule';
import { PainMapModule } from './components/PainMapModule';
import { PostureModule } from './components/PostureModule';
import { MobilityModule } from './components/MobilityModule';
import { StrengthModule } from './components/StrengthModule';
import { MovementControlModule } from './components/MovementControlModule';
import { TreatmentPlanModule } from './components/TreatmentPlanModule';
import { ProgressChartsModule } from './components/ProgressChartsModule';
import { PatientsModule } from './components/PatientsModule';
import { ReportsModule } from './components/ReportsModule';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Patients State
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [activePatientId, setActivePatientId] = useState<string>(INITIAL_PATIENTS[0].id);

  // Clinical Assessments State mapped by patientId
  const [painMapData, setPainMapData] = useState<Record<string, PainMapAssessment>>(INITIAL_PAIN_MAP);
  const [postureData, setPostureData] = useState<Record<string, PostureAssessment>>(INITIAL_POSTURE);
  const [mobilityData, setMobilityData] = useState<Record<string, MobilityAssessment>>(INITIAL_MOBILITY);
  const [strengthData, setStrengthData] = useState<Record<string, StrengthAssessment>>(INITIAL_STRENGTH);
  const [movementData, setMovementData] = useState<Record<string, MovementAssessment>>(INITIAL_MOVEMENT);
  const [treatmentData, setTreatmentData] = useState<Record<string, TreatmentPlan>>(INITIAL_TREATMENT_PLANS);
  const [progressData, setProgressData] = useState<Record<string, ProgressSessionPoint[]>>(PROGRESS_HISTORY);

  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

  // Helper fallbacks if newly added patient
  const activePainMap = painMapData[activePatient.id] || {
    ...INITIAL_PAIN_MAP['p-1'],
    patientId: activePatient.id,
    painPoints: [],
  };
  const activePosture = postureData[activePatient.id] || {
    ...INITIAL_POSTURE['p-1'],
    patientId: activePatient.id,
  };
  const activeMobility = mobilityData[activePatient.id] || {
    ...INITIAL_MOBILITY['p-1'],
    patientId: activePatient.id,
  };
  const activeStrength = strengthData[activePatient.id] || {
    ...INITIAL_STRENGTH['p-1'],
    patientId: activePatient.id,
  };
  const activeMovement = movementData[activePatient.id] || {
    ...INITIAL_MOVEMENT['p-1'],
    patientId: activePatient.id,
  };
  const activeTreatment = treatmentData[activePatient.id] || {
    ...INITIAL_TREATMENT_PLANS['p-1'],
    patientId: activePatient.id,
  };
  const activeProgress = progressData[activePatient.id] || PROGRESS_HISTORY['p-1'];

  // Handlers
  const handleUpdatePainMap = (updated: PainMapAssessment) => {
    setPainMapData((prev) => ({ ...prev, [activePatient.id]: updated }));
  };

  const handleUpdatePosture = (updated: PostureAssessment) => {
    setPostureData((prev) => ({ ...prev, [activePatient.id]: updated }));
  };

  const handleUpdateMobility = (updated: MobilityAssessment) => {
    setMobilityData((prev) => ({ ...prev, [activePatient.id]: updated }));
  };

  const handleUpdateStrength = (updated: StrengthAssessment) => {
    setStrengthData((prev) => ({ ...prev, [activePatient.id]: updated }));
  };

  const handleUpdateMovement = (updated: MovementAssessment) => {
    setMovementData((prev) => ({ ...prev, [activePatient.id]: updated }));
  };

  const handleUpdateTreatment = (updated: TreatmentPlan) => {
    setTreatmentData((prev) => ({ ...prev, [activePatient.id]: updated }));
  };

  const handleAddPatient = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setActivePatientId(newPatient.id);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F1F5F9] font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Clean Minimalism Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activePatient={activePatient}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Header with Patient Context */}
        <Header
          activePatient={activePatient}
          patients={patients}
          onSelectPatient={setActivePatientId}
          onOpenReports={() => setCurrentTab('reports')}
          onOpenNewPatient={() => setCurrentTab('patients')}
        />

        {/* Scrollable Clinical Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <DashboardModule
              patient={activePatient}
              posture={activePosture}
              mobility={activeMobility}
              strength={activeStrength}
              movement={activeMovement}
              treatment={activeTreatment}
              history={activeProgress}
              painMap={activePainMap}
              onNavigateTo={setCurrentTab}
            />
          )}

          {currentTab === 'painmap' && (
            <PainMapModule
              patient={activePatient}
              initialData={activePainMap}
              onSave={handleUpdatePainMap}
              onNavigateToReports={() => setCurrentTab('reports')}
            />
          )}

          {currentTab === 'patients' && (
            <PatientsModule
              patients={patients}
              activePatient={activePatient}
              onSelectPatient={(p) => setActivePatientId(p.id)}
              onAddPatient={handleAddPatient}
              onNavigateTo={setCurrentTab}
            />
          )}

          {currentTab === 'posture' && (
            <PostureModule
              initialData={activePosture}
              onSave={handleUpdatePosture}
            />
          )}

          {currentTab === 'mobility' && (
            <MobilityModule
              initialData={activeMobility}
              onSave={handleUpdateMobility}
            />
          )}

          {currentTab === 'strength' && (
            <StrengthModule
              initialData={activeStrength}
              onSave={handleUpdateStrength}
            />
          )}

          {currentTab === 'movement' && (
            <MovementControlModule
              initialData={activeMovement}
              onSave={handleUpdateMovement}
              onDownloadPdf={() => setCurrentTab('reports')}
            />
          )}

          {currentTab === 'treatment' && (
            <TreatmentPlanModule
              plan={activeTreatment}
              onUpdatePlan={handleUpdateTreatment}
            />
          )}

          {currentTab === 'progress' && (
            <ProgressChartsModule history={activeProgress} />
          )}

          {currentTab === 'reports' && (
            <ReportsModule
              patient={activePatient}
              posture={activePosture}
              mobility={activeMobility}
              strength={activeStrength}
              movement={activeMovement}
              treatment={activeTreatment}
              painMap={activePainMap}
            />
          )}
        </main>
      </div>
    </div>
  );
}
