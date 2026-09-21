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
