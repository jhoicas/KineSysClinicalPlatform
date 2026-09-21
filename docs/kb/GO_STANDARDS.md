# Estándares de Go - Clean Architecture

En KineSys Clinical Platform, el backend implementa Clean Architecture para asegurar que el dominio del negocio sea independiente de los frameworks, UI, bases de datos y agentes externos.

## Estructura de Paquetes

### 1. `domain`
- **Responsabilidad:** Contiene las entidades del negocio (estructuras) y las reglas de negocio puras.
- **Restricciones:** No debe importar NADA de otros paquetes del proyecto, excepto librerías estándar.
- **Ejemplo:** Entidad `Patient`, `Doctor`.

### 2. `ports`
- **Responsabilidad:** Define las interfaces que el núcleo del dominio necesita para comunicarse con el mundo exterior (ej. interfaces de repositorios, interfaces de servicios externos).
- **Restricciones:** Solo depende de `domain`.

### 3. `services` (Casos de Uso)
- **Responsabilidad:** Implementa la lógica de la aplicación y los casos de uso, orquestando las entidades del dominio usando los puertos definidos.
- **Restricciones:** Solo depende de `domain` y `ports`. No sabe de HTTP, SQL, etc.

### 4. `adapters/handlers`
- **Responsabilidad:** Maneja las solicitudes HTTP, gRPC, etc. Transforma los datos de entrada al formato que los `services` esperan y formatea las respuestas.
- **Restricciones:** Depende de `services`.

### 5. `adapters/repository`
- **Responsabilidad:** Implementa las interfaces definidas en `ports` para acceder a la base de datos (PostgreSQL vía Supabase).
- **Restricciones:** Depende de `domain` y `ports`. Contiene el código SQL o llamadas a ORM.

## Reglas Generales
- **Inyección de Dependencias:** Todos los servicios y repositorios deben instanciarse y pasarse como dependencias al inicializar la aplicación.
- **Manejo de Errores:** Retornar errores descriptivos y manejarlos centralizadamente en la capa más externa (handlers).
- **Testing:** Escribir tests unitarios principalmente para `domain` y `services` usando mocks para `ports`.
