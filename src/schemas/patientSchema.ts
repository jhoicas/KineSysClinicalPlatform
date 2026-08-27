import { z } from 'zod';

/**
 * Esquema de validación Zod para Registro de Pacientes
 */
export const patientRegistrationSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, 'El nombre completo debe tener al menos 3 caracteres.')
    .max(100, 'El nombre completo no puede superar los 100 caracteres.')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/, 'El nombre solo debe contener letras y espacios.'),
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es requerido.')
    .email('Ingrese una dirección de correo electrónico válida.'),
  phone: z
    .string()
    .trim()
    .min(7, 'El teléfono debe tener al menos 7 dígitos.')
    .regex(/^[\d\s+\-()]+$/, 'El formato del teléfono es inválido.'),
  rut_or_dni: z
    .string()
    .trim()
    .min(4, 'La identificación o RUT debe tener al menos 4 caracteres.')
    .max(25, 'La identificación no puede superar 25 caracteres.'),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Seleccione un género válido.',
  }),
  birth_date: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const now = new Date();
      return !isNaN(date.getTime()) && date <= now;
    }, 'La fecha de nacimiento no puede ser futura.'),
  medical_conditions: z
    .string()
    .trim()
    .max(200, 'El diagnóstico inicial no puede exceder 200 caracteres.')
    .optional(),
  allergies: z
    .string()
    .trim()
    .max(200, 'El campo de alergias no puede exceder 200 caracteres.')
    .optional(),
  emergency_contact_name: z
    .string()
    .trim()
    .max(100, 'El nombre del contacto no puede exceder 100 caracteres.')
    .optional(),
  emergency_contact_phone: z
    .string()
    .trim()
    .optional(),
});

export type PatientRegistrationFormData = z.infer<typeof patientRegistrationSchema>;
