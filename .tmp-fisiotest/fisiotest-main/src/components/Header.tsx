import React from 'react';
import {
  Menu,
  User,
  Calendar,
  Award,
  Radio,
  Download,
  FileCheck,
  PlusCircle,
} from 'lucide-react';
import { Patient } from '../types';

interface HeaderProps {
  patient?: Patient;
  activePatient?: Patient;
  patients?: Patient[];
  onSelectPatient?: (patientId: string) => void;
  onOpenMobileMenu?: () => void;
  onOpenReportModal?: () => void;
  onOpenReports?: () => void;
  onNewEvaluation?: () => void;
  onOpenNewPatient?: () => void;
  deviceConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  patient: patientProp,
  activePatient: activePatientProp,
  patients = [],
  onSelectPatient,
  onOpenMobileMenu,
  onOpenReportModal,
  onOpenReports,
  onNewEvaluation,
  onOpenNewPatient,
  deviceConnected = true,
}) => {
  const patient = activePatientProp || patientProp;
  const handleReports = onOpenReports || onOpenReportModal;
  const handleNewEval = onOpenNewPatient || onNewEvaluation;

  if (!patient) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
      {/* Top action row matching Clean Minimalism Design */}
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-3 truncate">
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight shrink-0">
              Historial de Paciente
            </h1>
            <span className="text-slate-300 font-light hidden sm:inline">/</span>
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
              {patients.length > 1 && onSelectPatient ? (
                <select
                  value={patient.id}
                  onChange={(e) => onSelectPatient(e.target.value)}
                  className="bg-transparent font-medium text-slate-600 hover:text-slate-900 text-xs sm:text-sm cursor-pointer focus:outline-none border-none pr-4"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-medium text-slate-600 text-xs sm:text-sm truncate">
                  {patient.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons matching Clean Minimalism */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleNewEval}
            className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle size={15} />
            <span className="hidden sm:inline">Nueva Evaluación</span>
            <span className="sm:hidden">Nuevo</span>
          </button>

          <button
            type="button"
            onClick={handleReports}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Download size={15} className="text-slate-500" />
            <span className="hidden sm:inline">Informe PDF</span>
          </button>
        </div>
      </div>

      {/* Patient contextual clinical banner */}
      <div className="px-4 sm:px-8 py-2.5 bg-slate-50 border-t border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Paciente */}
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-blue-600 shrink-0 mt-0.5 shadow-2xs">
              <User size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Paciente Activo
              </span>
              <span className="font-bold text-slate-900 text-xs truncate block leading-snug">
                {patient.name}
              </span>
              <span className="text-[11px] text-slate-500 truncate block">
                {patient.age} años • {patient.documentId}
              </span>
            </div>
          </div>

          {/* Fecha */}
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-blue-600 shrink-0 mt-0.5 shadow-2xs">
              <Calendar size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Fecha de Consulta
              </span>
              <span className="font-bold text-slate-900 text-xs block leading-snug">
                Hoy • Sesión #6 de 12
              </span>
              <span className="text-[11px] text-slate-500">
                10:30 a. m.
              </span>
            </div>
          </div>

          {/* Evaluador */}
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-blue-600 shrink-0 mt-0.5 shadow-2xs">
              <Award size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Especialista
              </span>
              <span className="font-bold text-slate-900 text-xs truncate block leading-snug">
                {patient.physiotherapist}
              </span>
              <span className="text-[11px] text-slate-500">
                {patient.physiotherapistId}
              </span>
            </div>
          </div>

          {/* Dispositivo Dinamométrico */}
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-emerald-600 shrink-0 mt-0.5 shadow-2xs">
              <Radio size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Dinamómetro Digital
              </span>
              <span className="font-bold text-slate-900 text-xs block leading-snug flex items-center gap-1.5">
                ActivForce 2
              </span>
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {deviceConnected ? 'Enlace Activo' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
