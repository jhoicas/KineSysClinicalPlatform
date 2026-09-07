import React, { useState } from 'react';
import {
  Activity,
  UserCheck,
  Dumbbell,
  Compass,
  LineChart,
  ClipboardList,
  Users,
  FileText,
  Settings,
  Calendar,
  Layers,
  ChevronRight,
  Flame,
  Ruler,
  Scale,
  Apple,
  Sparkles,
} from 'lucide-react';
import { Patient } from '../types';

export type NavTab =
  | 'dashboard'
  | 'painmap'
  | 'posture'
  | 'mobility'
  | 'strength'
  | 'movement'
  | 'treatment'
  | 'progress'
  | 'patients'
  | 'reports'
  | 'anthropometry'
  | 'bodycomposition'
  | 'nutritionplan';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activePatient?: Patient;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activePatient,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [specialtyFilter, setSpecialtyFilter] = useState<'all' | 'physio' | 'nutrition'>('all');

  const physioNavItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: Activity, badge: null },
    { id: 'painmap' as NavTab, label: 'Mapa del Dolor', icon: Flame, badge: 'EVA' },
    { id: 'posture' as NavTab, label: 'Valoración Postural', icon: UserCheck, badge: 'Módulo' },
    { id: 'mobility' as NavTab, label: 'Movilidad Articular', icon: Compass, badge: 'ROM' },
    { id: 'strength' as NavTab, label: 'Fuerza Muscular', icon: Dumbbell, badge: 'ActivForce' },
    { id: 'movement' as NavTab, label: 'Control del Movimiento', icon: Layers, badge: '7 Gestos' },
    { id: 'treatment' as NavTab, label: 'Plan & Ejercicios', icon: ClipboardList, badge: null },
    { id: 'progress' as NavTab, label: 'Gráficas de Evolución', icon: LineChart, badge: 'Progreso' },
  ];

  const nutritionNavItems = [
    { id: 'anthropometry' as NavTab, label: 'Antropometría (ISAK)', icon: Ruler, badge: 'Nivel 3' },
    { id: 'bodycomposition' as NavTab, label: 'Composición BIA', icon: Scale, badge: 'InBody' },
    { id: 'nutritionplan' as NavTab, label: 'Plan Nutricional', icon: Apple, badge: 'TCA 2018' },
  ];

  const generalNavItems = [
    { id: 'patients' as NavTab, label: 'Pacientes & Historial', icon: Users, badge: null },
    { id: 'reports' as NavTab, label: 'Resumen & Informes', icon: FileText, badge: 'PDF' },
  ];

  const isNutritionTab =
    currentTab === 'anthropometry' ||
    currentTab === 'bodycomposition' ||
    currentTab === 'nutritionplan';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-900 border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl tracking-tighter shadow-xs">
            CB
          </div>
          <div>
            <div className="font-black text-lg tracking-tight text-slate-900 leading-none">
              Core Body
            </div>
            <div className="text-[10px] tracking-wider uppercase text-emerald-700 font-bold mt-1">
              Fisioterapia & Nutrición
            </div>
          </div>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
          >
            ✕
          </button>
        )}
      </div>

      {/* Specialty Filter Pill Selector (Fisioterapia vs Nutrición) */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 px-1 flex items-center justify-between">
          <span>Especialidad Clínica</span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-lg text-2xs font-bold text-slate-600">
          <button
            id="filter-specialty-all"
            type="button"
            onClick={() => setSpecialtyFilter('all')}
            className={`py-1 rounded-md transition-all ${
              specialtyFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Todas
          </button>
          <button
            id="filter-specialty-physio"
            type="button"
            onClick={() => setSpecialtyFilter('physio')}
            className={`py-1 rounded-md transition-all ${
              specialtyFilter === 'physio'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Fisio
          </button>
          <button
            id="filter-specialty-nutrition"
            type="button"
            onClick={() => setSpecialtyFilter('nutrition')}
            className={`py-1 rounded-md transition-all ${
              specialtyFilter === 'nutrition'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Nutrición
          </button>
        </div>
      </div>

      {/* Active Patient Pill */}
      {activePatient && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Paciente en sesión
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="truncate">
              <span className="font-semibold text-sm text-slate-900 block truncate">
                {activePatient.name}
              </span>
              <span className="text-[11px] text-slate-500">
                {activePatient.age} años • {activePatient.gender === 'M' ? 'Masc.' : 'Fem.'} • {activePatient.sportOrActivity}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('patients')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium underline shrink-0 ml-2"
              title="Cambiar paciente"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* NUTRITION & ANTHROPOMETRY SECTION */}
        {(specialtyFilter === 'all' || specialtyFilter === 'nutrition') && (
          <div>
            <div className="px-3 py-1 text-2xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Apple className="w-3.5 h-3.5 text-emerald-600" />
              Nutrición & Antropometría
            </div>
            <div className="space-y-0.5 mt-1">
              {nutritionNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        size={16}
                        className={isActive ? 'text-emerald-700' : 'text-slate-400'}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-3xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PHYSIOTHERAPY SECTION */}
        {(specialtyFilter === 'all' || specialtyFilter === 'physio') && (
          <div>
            <div className="px-3 py-1 text-2xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Fisioterapia & Readaptación
            </div>
            <div className="space-y-0.5 mt-1">
              {physioNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        size={16}
                        className={isActive ? 'text-blue-600' : 'text-slate-400'}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-3xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SHARED CLINICAL MANAGEMENT */}
        <div>
          <div className="px-3 py-1 text-2xs font-semibold text-slate-400 uppercase tracking-wider">
            Gestión & Reportes
          </div>
          <div className="space-y-0.5 mt-1">
            {generalNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      size={16}
                      className={isActive ? 'text-white' : 'text-slate-400'}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-3xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Evaluator Footer (Physiotherapist or Nutritionist based on active context) */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                isNutritionTab
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isNutritionTab ? 'JM' : 'AR'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                {isNutritionTab ? 'Dra. Juliana Mesa V.' : 'Dr. Alejandro Ruiz'}
              </p>
              <p className="text-2xs text-slate-500 leading-tight truncate font-medium">
                {isNutritionTab ? 'Nutricionista ISAK Nivel 3' : 'Fisioterapeuta Deportivo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 shrink-0"
            title="Ajustes de Perfil"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
