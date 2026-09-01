import { UserRole } from '../types';

/** Roles normalizados (nuevos) */
export const NORMALIZED_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  PHYSIO: 'PHYSIO',
  NUTRITIONIST: 'NUTRITIONIST',
  GENERAL_DOCTOR: 'GENERAL_DOCTOR',
} as const;

/** Mapeo legacy frontend → normalizado */
export const LEGACY_TO_NORMALIZED: Record<string, string> = {
  super_admin: NORMALIZED_ROLES.SUPER_ADMIN,
  clinic_admin: NORMALIZED_ROLES.CLINIC_ADMIN,
  fisioterapeuta: NORMALIZED_ROLES.PHYSIO,
  nutricionista: NORMALIZED_ROLES.NUTRITIONIST,
  medico_general: NORMALIZED_ROLES.GENERAL_DOCTOR,
  professional: NORMALIZED_ROLES.PHYSIO,
};

/** Mapeo normalizado → legacy (para compatibilidad con RBAC existente) */
export const NORMALIZED_TO_LEGACY: Record<string, UserRole> = {
  [NORMALIZED_ROLES.SUPER_ADMIN]: 'super_admin',
  [NORMALIZED_ROLES.CLINIC_ADMIN]: 'clinic_admin',
  [NORMALIZED_ROLES.PHYSIO]: 'fisioterapeuta',
  [NORMALIZED_ROLES.NUTRITIONIST]: 'nutricionista',
  [NORMALIZED_ROLES.GENERAL_DOCTOR]: 'medico_general',
};

export function toLegacyRole(role: string): UserRole {
  if (NORMALIZED_TO_LEGACY[role]) return NORMALIZED_TO_LEGACY[role];
  return role as UserRole;
}

export function toNormalizedRole(role: string): string {
  return LEGACY_TO_NORMALIZED[role] || role;
}
