# Estándares de React 19 + Supabase

Para el frontend de KineSys Clinical Platform, seguimos un enfoque modular y seguro, aprovechando React 19 y la infraestructura de Supabase.

## Arquitectura del Frontend

### 1. Componentes de Presentación (UI)
- **Responsabilidad:** Renderizar la interfaz visual. Deben ser lo más "tontos" posible, recibiendo datos y callbacks a través de props.
- **Restricciones:** No deben realizar llamadas directas a Supabase ni contener lógica de negocio compleja.

### 2. Custom Hooks
- **Responsabilidad:** Encapsular la lógica de estado y efectos de React. Actúan como intermediarios entre la UI y los servicios de API, manejando estados de carga y errores.
- **Ejemplo:** `usePatients()`, `useAuth()`.

### 3. Servicios de API
- **Responsabilidad:** Contener todas las llamadas directas al cliente de Supabase (`@supabase/supabase-js`).
- **Restricciones:** Son funciones puramente asíncronas que retornan datos o lanzan errores, sin dependencias de hooks de React.

## Supabase y Seguridad (RLS)

### Row Level Security (RLS) Multi-Tenant
- **Principio:** Todo acceso a datos debe estar estrictamente protegido por RLS a nivel de base de datos en PostgreSQL.
- **Implementación:** 
  - Usar `auth.uid()` para asegurar que los usuarios solo accedan a sus propios datos.
  - Para arquitectura multi-tenant, asegurar que las políticas validen el `tenant_id` del usuario logueado contra el `tenant_id` del registro (por ejemplo, a través de claims JWT personalizados o tablas de relación).
- **Cliente Seguro:** En el frontend, instanciar el cliente de Supabase asegurando el manejo correcto de la sesión actual de usuario.

## Reglas de TypeScript
- **Tipado Fuerte:** Usar `interfaces` o `types` para todas las props de componentes, respuestas de API y estados complejos.
- **Evitar `any`:** Está prohibido el uso de `any`. Usar `unknown` si es estrictamente necesario o definir el tipo genérico correcto.
- **Generación de Tipos de Supabase:** Mantener sincronizados los tipos generados automáticamente desde el esquema de la base de datos de Supabase.

## Autoguardado de formularios

- Los formularios clínicos no usan botón "Guardar": usan `useAutosave` (`frontend/src/hooks/useAutosave.ts`).
- **Contrato:** el formulario pasa su valor (objeto nuevo en cada cambio), un `scopeKey` (p. ej. el id del paciente) y un `onSave(changes, snapshot)` que persiste **solo** los campos modificados.
- Tras cargar datos del servidor se llama a `reset(snapshot)` con el mismo valor que se pone en el formulario; mientras no se llame, el autoguardado está inerte (evita guardar datos de otro contexto).
- Usa `onBlur={() => void autosave.flush()}` en el `<form>` y muestra el estado con `AutosaveIndicator`.
- Cuando el destino del guardado es propio del contexto (p. ej. el id de un registro que se crea en el primer guardado), pasa el `onSave` a `reset(snapshot, onSave)`.
- Para guardados parciales en Supabase usa `upsert` con `onConflict` o `update` por id enviando solo las columnas modificadas; para JSONB usa una RPC que fusione claves (ver `kinesys.patch_antropometria_draft`).
- La lógica vive en `autosaveEngine.ts` (sin React) y se prueba con `npm test`.
