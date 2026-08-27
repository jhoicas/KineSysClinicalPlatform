import React, { useState, useEffect, useRef, useId } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useI18n } from '../../app/providers/I18nProvider';
import { supabase } from '../../services/supabaseClient';
import { useAppStore, ActivePatient } from '../../store/useAppStore';

export interface PatientSearchComboboxProps {
  variant?: 'standard' | 'large' | 'compact';
  onSelectPatient?: (patient: ActivePatient) => void;
  showActiveBadge?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  label?: string;
  allowClear?: boolean;
  onOpenNewPatientModal?: () => void;
}

export const PatientSearchCombobox: React.FC<PatientSearchComboboxProps> = ({
  variant = 'standard',
  onSelectPatient,
  showActiveBadge = true,
  placeholder,
  autoFocus = false,
  className = '',
  label,
  allowClear = true,
  onOpenNewPatientModal,
}) => {
  const { tenantId } = useAuth();
  const { t } = useI18n();
  const inputId = useId();

  const { activePatient, setActivePatient, clearActivePatient, recentPatients } = useAppStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ActivePatient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Búsqueda en Supabase filtrando por rol 'patient' y tenant_id
        // Busca en full_name, email y rut_or_dni
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            email,
            phone,
            rut_or_dni,
            avatar_url,
            birth_date,
            gender,
            medical_conditions,
            allergies,
            role,
            tenant_id
          `)
          .eq('role', 'patient')
          .eq('tenant_id', tenantId || 'tenant_kine_001')
          .or(
            `full_name.ilike.%${trimmedQuery}%,email.ilike.%${trimmedQuery}%,rut_or_dni.ilike.%${trimmedQuery}%`
          )
          .limit(8);

        if (error) throw error;
        setResults((data as ActivePatient[]) || []);
        setHighlightedIndex(data && data.length > 0 ? 0 : -1);
      } catch (err) {
        console.error('Error buscando pacientes:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms Debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, tenantId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (patient: ActivePatient) => {
    setActivePatient(patient);
    if (onSelectPatient) {
      onSelectPatient(patient);
    }
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentList = query.trim() ? results : recentPatients;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && currentList[highlightedIndex]) {
        handleSelect(currentList[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const defaultPlaceholder = t(
    'patient.search_placeholder',
    'Buscar paciente por nombre, RUT/DNI o email...'
  );

  // =========================================================================
  // RENDER 1: BADGE DE PACIENTE ACTIVO (SI YA ESTÁ SELECCIONADO)
  // =========================================================================
  if (activePatient && showActiveBadge) {
    return (
      <div
        id="active-patient-badge"
        className={`inline-flex items-center gap-3 bg-surface-container-lowest border border-primary/30 p-2.5 rounded-2xl clinical-shadow transition-all group ${
          variant === 'large' ? 'p-4 rounded-3xl w-full max-w-2xl justify-between' : ''
        } ${className}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={
                activePatient.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={activePatient.full_name}
              className="w-10 h-10 rounded-xl object-cover border-2 border-primary/30"
            />
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface-container-lowest rounded-full"
              title="Paciente Activo en Sesión"
            />
          </div>

          {/* Información */}
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                {t('patient.active_session', 'Paciente Activo')}
              </span>
              {activePatient.rut_or_dni && (
                <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
                  {activePatient.rut_or_dni}
                </span>
              )}
            </div>

            <p className="font-extrabold text-sm text-on-surface truncate mt-0.5 group-hover:text-primary transition-colors">
              {activePatient.full_name}
            </p>

            <p className="text-[11px] text-on-surface-variant truncate">
              {activePatient.email || activePatient.phone || 'Sin contacto registrado'}
            </p>
          </div>
        </div>

        {/* Acciones del Badge */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <button
            type="button"
            onClick={() => {
              clearActivePatient();
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Cambiar de paciente"
          >
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
            <span className="hidden sm:inline">{t('common.change', 'Cambiar')}</span>
          </button>

          {allowClear && (
            <button
              type="button"
              id="btn-clear-active-patient"
              onClick={clearActivePatient}
              className="p-1.5 hover:bg-error-container/40 text-on-surface-variant hover:text-error rounded-xl transition-colors cursor-pointer"
              title="Deseleccionar paciente"
              aria-label="Cerrar sesión de paciente"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: BUSCADOR PREDICTIVO / COMBOBOX
  // =========================================================================
  const isHero = variant === 'large';
  const isCompact = variant === 'compact';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-extrabold text-on-surface-variant uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Input de Búsqueda Predictiva */}
      <div
        className={`relative flex items-center transition-all ${
          isHero
            ? 'bg-surface-container-lowest rounded-3xl border-2 border-primary/40 focus-within:border-primary shadow-xl shadow-primary/10 p-2'
            : isCompact
            ? 'bg-surface-container-low rounded-xl border border-outline-variant/30 focus-within:border-primary px-2.5 py-1.5'
            : 'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 clinical-shadow px-3.5 py-2.5'
        }`}
      >
        <span
          className={`material-symbols-outlined shrink-0 text-primary ${
            isHero ? 'text-2xl ml-2' : isCompact ? 'text-base mr-1.5' : 'text-lg mr-2'
          }`}
        >
          {isLoading ? 'sync' : 'person_search'}
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          className={`w-full bg-transparent border-none outline-none font-bold text-on-surface placeholder:text-outline/70 ${
            isHero ? 'text-base sm:text-lg px-2 py-1' : isCompact ? 'text-xs' : 'text-sm'
          }`}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        {/* Indicador de carga / Limpiar búsqueda */}
        <div className="flex items-center gap-1 shrink-0">
          {isLoading && (
            <span className="material-symbols-outlined text-primary text-base animate-spin">
              progress_activity
            </span>
          )}

          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-surface-container rounded-lg text-outline hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}

          {isHero && (
            <div className="hidden sm:flex items-center gap-1 bg-surface-container-high text-on-surface-variant px-2.5 py-1 rounded-xl text-[11px] font-bold">
              <span>Debounce 300ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Menú Desplegable Predictivo */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn max-h-80 overflow-y-auto">
          {/* CASO A: RESULTADOS DE BÚSQUEDA */}
          {results.length > 0 && (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary flex items-center justify-between">
                <span>{t('patient.search_results', 'Pacientes Encontrados')} ({results.length})</span>
                <span className="text-on-surface-variant font-normal">Enter ↵ para seleccionar</span>
              </div>

              {results.map((patient, idx) => {
                const isSelected = highlightedIndex === idx;
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handleSelect(patient)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-on-surface border border-primary/30'
                        : 'hover:bg-surface-container-low text-on-surface border border-transparent'
                    }`}
                  >
                    <img
                      src={
                        patient.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                      }
                      alt={patient.full_name}
                      className="w-9 h-9 rounded-xl object-cover border border-outline-variant/40"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-xs text-on-surface truncate">
                          {patient.full_name}
                        </p>
                        {patient.rut_or_dni && (
                          <span className="text-[10px] font-bold bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                            {patient.rut_or_dni}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant truncate mt-0.5">
                        <span>{patient.email}</span>
                        {patient.phone && (
                          <>
                            <span>•</span>
                            <span>{patient.phone}</span>
                          </>
                        )}
                      </div>

                      {patient.medical_conditions && patient.medical_conditions.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[12px] text-primary">
                            medical_information
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-medium truncate">
                            {patient.medical_conditions.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <span className="material-symbols-outlined text-primary text-base opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* CASO B: NO SE ENCONTRARON RESULTADOS */}
          {query.trim().length > 0 && !isLoading && results.length === 0 && (
            <div className="p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-outline mb-1">
                person_off
              </span>
              <p className="text-xs font-bold text-on-surface">
                {t('patient.no_results', 'No se encontraron pacientes para')} "{query}"
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Verifica el nombre, documento o correo ingresado.
              </p>
              {onOpenNewPatientModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenNewPatientModal();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-container transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Registrar nuevo paciente</span>
                </button>
              )}
            </div>
          )}

          {/* CASO C: PACIENTES RECIENTES (SI LA BÚSQUEDA ESTÁ VACÍA) */}
          {!query.trim() && recentPatients.length > 0 && (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-primary">history</span>
                  {t('patient.recent_consultations', 'Consultados Recientemente')}
                </span>
              </div>

              {recentPatients.map((patient, idx) => (
                <button
                  key={`recent-${patient.id}`}
                  type="button"
                  onClick={() => handleSelect(patient)}
                  className="w-full text-left p-2 rounded-xl flex items-center gap-3 hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <img
                    src={
                      patient.avatar_url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                    }
                    alt={patient.full_name}
                    className="w-8 h-8 rounded-xl object-cover border border-outline-variant/30"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-on-surface truncate">
                      {patient.full_name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate">
                      {patient.rut_or_dni || patient.email}
                    </p>
                  </div>
                  <span className="text-[10px] text-primary font-bold">Seleccionar</span>
                </button>
              ))}
            </div>
          )}

          {/* Footer Informativo */}
          <div className="bg-surface-container-low px-3 py-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] text-on-surface-variant">
            <span>Búsqueda instantánea en tiempo real</span>
            <span className="font-bold">Multitenant KineSys</span>
          </div>
        </div>
      )}
    </div>
  );
};
