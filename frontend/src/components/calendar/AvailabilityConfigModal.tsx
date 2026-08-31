import React, { useEffect, useState } from 'react';
import { CalendarOff, Clock, Plus, Save, Trash2, X } from 'lucide-react';
import { ProfessionalAvailability, ProfessionalAvailabilityException } from '../../types';
import {
  fetchProfessionalAvailability,
  fetchProfessionalAvailabilityExceptions,
  saveProfessionalAvailabilityExceptions,
  saveProfessionalWeeklyAvailability,
} from '../../services/dataService';
import { DAY_LABELS_FULL } from '../../utils/availabilityUtils';

interface DayBlockDraft {
  key: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface AvailabilityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSaved?: () => void;
}

const SLOT_DURATION_OPTIONS = [15, 30, 45, 60, 90];

function createEmptyDayBlocks(): DayBlockDraft[] {
  return Array.from({ length: 7 }, (_, day) => ({
    key: `day_${day}`,
    day_of_week: day,
    start_time: '08:00',
    end_time: '17:00',
    is_active: day >= 1 && day <= 5,
  }));
}

export function AvailabilityConfigModal({
  isOpen,
  onClose,
  userId,
  onSaved,
}: AvailabilityConfigModalProps) {
  const [blocks, setBlocks] = useState<DayBlockDraft[]>(createEmptyDayBlocks());
  const [extraBlocks, setExtraBlocks] = useState<
    Omit<ProfessionalAvailability, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
  >([]);
  const [slotDuration, setSlotDuration] = useState(45);
  const [exceptions, setExceptions] = useState<
    Omit<ProfessionalAvailabilityException, 'id' | 'user_id' | 'created_at'>[]
  >([]);
  const [newExceptionDate, setNewExceptionDate] = useState('');
  const [newExceptionReason, setNewExceptionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [avail, exc] = await Promise.all([
          fetchProfessionalAvailability(userId),
          fetchProfessionalAvailabilityExceptions(userId),
        ]);

        const baseDays = createEmptyDayBlocks();
        const additional: typeof extraBlocks = [];
        const seenPrimaryDays = new Set<number>();

        for (const row of avail) {
          if (row.slot_duration) setSlotDuration(row.slot_duration);
          if (!seenPrimaryDays.has(row.day_of_week)) {
            const existingDay = baseDays.find((d) => d.day_of_week === row.day_of_week);
            if (existingDay) {
              existingDay.start_time = row.start_time;
              existingDay.end_time = row.end_time;
              existingDay.is_active = row.is_active;
            }
            seenPrimaryDays.add(row.day_of_week);
          } else {
            additional.push({
              day_of_week: row.day_of_week,
              start_time: row.start_time,
              end_time: row.end_time,
              slot_duration: row.slot_duration,
              is_active: row.is_active,
            });
          }
        }

        setBlocks(baseDays);
        setExtraBlocks(additional);
        setExceptions(exc.map(({ exception_date, reason }) => ({ exception_date, reason })));
      } catch {
        setError('No se pudo cargar la disponibilidad actual.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const updateBlock = (day: number, patch: Partial<DayBlockDraft>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.day_of_week === day ? { ...b, ...patch } : b))
    );
  };

  const addExtraBlock = (day: number) => {
    setExtraBlocks((prev) => [
      ...prev,
      {
        day_of_week: day,
        start_time: '14:00',
        end_time: '18:00',
        slot_duration: slotDuration,
        is_active: true,
      },
    ]);
  };

  const removeExtraBlock = (index: number) => {
    setExtraBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExtraBlock = (
    index: number,
    patch: Partial<Omit<ProfessionalAvailability, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    setExtraBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  };

  const addException = () => {
    if (!newExceptionDate) return;
    if (exceptions.some((e) => e.exception_date === newExceptionDate)) return;
    setExceptions((prev) => [
      ...prev,
      { exception_date: newExceptionDate, reason: newExceptionReason.trim() || 'Día no disponible' },
    ]);
    setNewExceptionDate('');
    setNewExceptionReason('');
  };

  const removeException = (date: string) => {
    setExceptions((prev) => prev.filter((e) => e.exception_date !== date));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const payload: Omit<
      ProfessionalAvailability,
      'id' | 'user_id' | 'created_at' | 'updated_at'
    >[] = [];

    for (const block of blocks) {
      if (!block.is_active) continue;
      payload.push({
        day_of_week: block.day_of_week,
        start_time: block.start_time,
        end_time: block.end_time,
        slot_duration: slotDuration,
        is_active: true,
      });
    }

    for (const block of extraBlocks) {
      if (!block.is_active) continue;
      payload.push({
        ...block,
        slot_duration: slotDuration,
      });
    }

    const availResult = await saveProfessionalWeeklyAvailability(userId, payload);
    if (!availResult.success) {
      setError(availResult.error || 'Error al guardar disponibilidad.');
      setSaving(false);
      return;
    }

    const excResult = await saveProfessionalAvailabilityExceptions(userId, exceptions);
    if (!excResult.success) {
      setError(excResult.error || 'Error al guardar excepciones.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl w-full max-w-3xl clinical-shadow-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 sm:p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-on-surface tracking-tight">
                Configurar mi Disponibilidad
              </h3>
              <p className="text-xs text-on-surface-variant">
                Publica tus bloques de atención semanal y excepciones (vacaciones / días bloqueados)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-on-surface-variant">Cargando...</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                <label className="text-xs font-black uppercase text-on-surface-variant">
                  Duración estándar por cita
                </label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer"
                >
                  {SLOT_DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} minutos
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-on-surface">Jornada semanal</h4>
                {blocks.map((block) => {
                  const dayExtras = extraBlocks
                    .map((b, i) => ({ ...b, index: i }))
                    .filter((b) => b.day_of_week === block.day_of_week);

                  return (
                    <div
                      key={block.key}
                      className="p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 space-y-3"
                    >
                      <div className="flex flex-wrap items-center gap-3 justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={block.is_active}
                            onChange={(e) =>
                              updateBlock(block.day_of_week, { is_active: e.target.checked })
                            }
                            className="rounded border-outline-variant text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-extrabold text-on-surface">
                            {DAY_LABELS_FULL[block.day_of_week]}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => addExtraBlock(block.day_of_week)}
                          className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar bloque
                        </button>
                      </div>

                      {block.is_active && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase">
                              Inicio
                            </label>
                            <input
                              type="time"
                              value={block.start_time}
                              onChange={(e) =>
                                updateBlock(block.day_of_week, { start_time: e.target.value })
                              }
                              className="w-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-2 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase">
                              Fin
                            </label>
                            <input
                              type="time"
                              value={block.end_time}
                              onChange={(e) =>
                                updateBlock(block.day_of_week, { end_time: e.target.value })
                              }
                              className="w-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-2 text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {dayExtras.map((extra) => (
                        <div
                          key={`extra_${extra.index}`}
                          className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end pt-2 border-t border-outline-variant/20"
                        >
                          <div>
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase">
                              Bloque adicional — inicio
                            </label>
                            <input
                              type="time"
                              value={extra.start_time}
                              onChange={(e) =>
                                updateExtraBlock(extra.index, { start_time: e.target.value })
                              }
                              className="w-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-2 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase">
                              Fin
                            </label>
                            <input
                              type="time"
                              value={extra.end_time}
                              onChange={(e) =>
                                updateExtraBlock(extra.index, { end_time: e.target.value })
                              }
                              className="w-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-2 text-xs font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExtraBlock(extra.index)}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Eliminar bloque"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 pt-2 border-t border-outline-variant/20">
                <h4 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                  <CalendarOff className="w-4 h-4 text-amber-600" />
                  Excepciones (vacaciones / días bloqueados)
                </h4>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={newExceptionDate}
                    onChange={(e) => setNewExceptionDate(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Motivo (opcional)"
                    value={newExceptionReason}
                    onChange={(e) => setNewExceptionReason(e.target.value)}
                    className="flex-1 min-w-[160px] bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addException}
                    className="px-3 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 cursor-pointer"
                  >
                    Agregar excepción
                  </button>
                </div>
                {exceptions.length > 0 && (
                  <ul className="space-y-2">
                    {exceptions.map((exc) => (
                      <li
                        key={exc.exception_date}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 text-xs"
                      >
                        <span>
                          <strong>{exc.exception_date}</strong>
                          {exc.reason ? ` — ${exc.reason}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeException(exc.exception_date)}
                          className="text-red-600 hover:underline cursor-pointer"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-outline-variant/20 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-primary hover:bg-primary-container text-white font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Publicando...' : 'Publicar Disponibilidad'}
          </button>
        </div>
      </div>
    </div>
  );
}
