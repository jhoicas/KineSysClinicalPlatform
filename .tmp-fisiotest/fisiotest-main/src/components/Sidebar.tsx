import React from 'react';
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
  | 'reports';

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
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: Activity, badge: null },
    { id: 'painmap' as NavTab, label: 'Mapa del Dolor', icon: Flame, badge: 'EVA' },
    { id: 'posture' as NavTab, label: 'Valoración Postural', icon: UserCheck, badge: 'Módulo' },
    { id: 'mobility' as NavTab, label: 'Movilidad Articular', icon: Compass, badge: 'ROM' },
    { id: 'strength' as NavTab, label: 'Fuerza Muscular', icon: Dumbbell, badge: 'ActivForce' },
    { id: 'movement' as NavTab, label: 'Control del Movimiento', icon: Layers, badge: '7 Gestos' },
    { id: 'treatment' as NavTab, label: 'Plan & Ejercicios', icon: ClipboardList, badge: null },
    { id: 'progress' as NavTab, label: 'Gráficas de Evolución', icon: LineChart, badge: 'Progreso' },
    { id: 'patients' as NavTab, label: 'Pacientes & Historial', icon: Users, badge: null },
    { id: 'reports' as NavTab, label: 'Resumen & Informes', icon: FileText, badge: 'PDF' },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-900 border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Mark matching Clean Minimalism */}
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl italic shadow-xs">
            K
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight text-slate-900 leading-none">
              KineFlow
            </div>
            <div className="text-[11px] tracking-wider uppercase text-blue-600 font-semibold mt-1">
              Core Body Clinical
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
                {activePatient.age} años • {activePatient.gender === 'M' ? 'Masc.' : 'Fem.'}
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
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Principal & Evaluaciones
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  size={18}
                  className={isActive ? 'text-blue-600' : 'text-slate-400'}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${
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

        <div className="pt-4 px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Gestión Clínica
        </div>
        <button
          type="button"
          onClick={() => {
            onSelectTab('treatment');
            onCloseMobile?.();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium transition-all"
        >
          <Calendar size={18} className="text-slate-400" />
          <span>Agenda & Citas</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectTab('treatment');
            onCloseMobile?.();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium transition-all"
        >
          <ClipboardList size={18} className="text-slate-400" />
          <span>Biblioteca de Ejercicios</span>
        </button>
      </div>

      {/* Evaluator Footer */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              AR
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
                Dr. Alejandro Ruiz
              </p>
              <p className="text-xs text-slate-500 leading-tight truncate">
                Especialista en Deporte
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 shrink-0 ml-1"
            title="Ajustes"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
