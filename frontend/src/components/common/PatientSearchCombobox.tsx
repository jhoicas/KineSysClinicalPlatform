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
        const { data, error } = await supabase
          .from('pacientes_clinicos')
          .select(`
            id,
            first_name,
            last_name,
            telecom_email,
            telecom_phone,
            identifier_number,
            birth_date,
            gender,
            blood_type,
            known_allergies,
            chronic_conditions,
            emergency_contact,
            tenant_id
          `)
          .eq('active', true)
          .eq('tenant_id', tenantId)
          .or(
            `first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%,identifier_number.ilike.%${trimmedQuery}%,telecom_email.ilike.%${trimmedQuery}%`
          )
          .limit(8);

        if (error) throw error;

        const mappedPatients: ActivePatient[] = (data || []).map((p: Record<string, unknown>) => {
          const firstName = String(p.first_name || '');
          const lastName = String(p.last_name || '');
          const conditions = Array.isArray(p.chronic_conditions) ? (p.chronic_conditions as string[]) : [];
          const allergies = Array.isArray(p.known_allergies) ? (p.known_allergies as string[]) : [];
          const emergency = p.emergency_contact as ActivePatient['emergency_contact'] | undefined;

          return {
            id: String(p.id),
            full_name: `${firstName} ${lastName}`.trim(),
            email: String(p.telecom_email || ''),
            phone: String(p.telecom_phone || ''),
            rut_or_dni: String(p.identifier_number || ''),
            birth_date: p.birth_date ? String(p.birth_date) : undefined,
            gender: p.gender ? String(p.gender) : undefined,
            medical_conditions: conditions,
            allergies,
            emergency_contact: emergency,
            role: 'patient',
            tenant_id: p.tenant_id ? String(p.tenant_id) : tenantId,
            raw_data: p,
          };
        });

        setResults(mappedPatients);
        setHighlightedIndex(mappedPatients.length > 0 ? 0 : -1);
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
  // RENDER 1: COMPACT PILL BADGE DE PACIENTE ACTIVO (SI YA ESTÁ SELECCIONADO)
  // =========================================================================
  if (activePatient && showActiveBadge) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <div
          id="active-patient-badge"
          className="inline-flex items-center gap-2 bg-surface-container-lowest border border-primary/30 px-2.5 py-1.5 rounded-full transition-all group h-fit max-h-10 whitespace-nowrap"
        >
          {/* Avatar pequeño */}
          <div className="relative shrink-0">
            <img
              src={
                activePatient.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={activePatient.full_name}
              className="w-7 h-7 rounded-full object-cover border border-primary/20"
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-surface-container-lowest rounded-full"
              title="Paciente Activo"
            />
          </div>

          {/* Nombre + RUT compacto */}
          <div className="text-left min-w-0 flex flex-col gap-0.5">
            <p className="text-xs font-bold text-on-surface truncate leading-none">
              {activePatient.full_name?.split(' ').slice(0, 2).join(' ') || 'Paciente'}
            </p>
            {activePatient.rut_or_dni && (
              <p className="text-[10px] text-on-surface-variant truncate leading-none">
                {activePatient.rut_or_dni}
              </p>
            )}
          </div>

          {/* Botones de acción (compactos) */}
          <div className="flex items-center gap-0.5 shrink-0 ml-1 pl-1 border-l border-outline-variant/20">
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setQuery('');
                setHighlightedIndex(-1);
              }}
              className="p-1 hover:bg-surface-container-high text-on-surface-variant hover:text-primary rounded-md transition-colors cursor-pointer"
              title="Cambiar de paciente"
              aria-label="Cambiar paciente"
            >
              <span className="material-symbols-outlined text-sm">swap_horiz</span>
            </button>

            {allowClear && (
              <button
                type="button"
                id="btn-clear-active-patient"
                onClick={clearActivePatient}
                className="p-1 hover:bg-error-container/30 text-on-surface-variant hover:text-error rounded-md transition-colors cursor-pointer"
                title="Deseleccionar paciente"
                aria-label="Cerrar sesión"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown overlay (posicionado absolutamente) */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-80 max-h-96 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-lg z-50 overflow-hidden flex flex-col">
            {/* Search input in dropdown */}
            <div className="sticky top-0 p-3 border-b border-outline-variant/20 bg-surface-container-lowest">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Results list */}
            <ul className="flex-1 overflow-y-auto">
              {query.trim() === '' ? (
                <div className="p-4 text-center text-xs text-on-surface-variant">
                  Empieza a escribir para buscar
                </div>
              ) : isLoading ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-xs text-on-surface-variant">
                  Sin resultados
                </div>
              ) : (
                results.map((patient, idx) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(patient)}
                      className={`w-full text-left px-4 py-2.5 text-xs border-b border-outline-variant/10 last:border-0 ${
                        idx === highlightedIndex
                          ? 'bg-primary/10'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <p className="font-semibold text-on-surface">{patient.full_name}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {patient.rut_or_dni || patient.email || patient.phone || '—'}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
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
