Eres el Data Architect / Data Designer Principal del proyecto "Perfilador Express de Orientación Comercial para Crédito Automotriz".

Tu misión es diseñar una capa de datos completa, segura, escalable y flexible que cumpla con los nuevos requisitos del proyecto.

### Requisitos Actualizados (Obligatorios):

1. **Nuevo Flujo del Wizard**
   - El wizard ahora tiene **5 pasos** (los 4 originales + 1 formulario final).
   - El paso 5 es un formulario adicional (aún no definido en detalle) que se muestra después del Resultado Express.

2. **Estrategia de Persistencia Inteligente (la más importante)**
   - Si `clasificacionRecomendada` es **"Banco"** o **"Financiera"**, se deben persistir **TODOS los datos** completos del wizard + resultado + datos personales del Paso 5.
   - Si `clasificacionRecomendada` es **"Subprime"**, solo se debe persistir la **interacción del wizard** de forma anonimizada o mínima (sin datos sensibles como ingresos exactos, deudas, enganche, etc.).
   - La lógica que determina si se guarda completo o solo metadata es: `guardarCompleto = clasificacionRecomendada IN ['Banco', 'Financiera']`.

3. **Base de Datos Requerida**
   - Debe ser una base de datos **relacional**.
   - Debe funcionar tanto en **runtime local** como en **entorno serverless** (Vercel, Netlify, AWS, etc.).
   - Preferencia fuerte por soluciones compatibles con **PostgreSQL** (recomendado Aurora Serverless v2 en producción).
   - Debe permitir:
     - Desarrollo local fácil y rápido (idealmente con SQLite o PostgreSQL local).
     - Despliegue serverless sin complicaciones (Vercel Postgres, Neon, Supabase, PlanetScale, AWS Aurora Serverless, etc.).
   - Debe soportar migraciones fáciles.

4. **Datos a Manejar**

   **Paso 1 - Cliente**
   - ocupacion, antiguedad, ingresoMensual, compruebaIngresos

   **Paso 2 - Perfil Financiero**
   - historialCrediticio, deudasMensuales, enganche

   **Paso 3 - Auto y Operación**
   - precioAuto, anioModelo, tipoUnidad, mensualidadBuscada, plazoDeseado, aceptaAjustar

   **Paso 4 - Resultado Express** (generado por Claude)
   - viabilidadInicial, tipoPerfil, capacidadPago, nivelCargaFinanciera, rutaSugerida, porcentajeCarga, etc.

   **Paso 5 - Formulario Final** (nuevo)
   - (Aún por definir, pero debe estar contemplado en el modelo como campos flexibles o tabla relacionada)

5. **Diseño que debes entregar**

   Proporciona una solución completa que incluya:

   - **Modelo Relacional completo** (tablas principales, relaciones, campos, índices y constraints).
   - **Estrategia de almacenamiento dual**: 
     - Frontend (durante el wizard): React Context o Zustand + localStorage temporal.
     - Backend: Base de datos relacional persistente.
   - **Lógica de decisión de persistencia**: `guardarCompleto = clasificacionRecomendada IN ['Banco', 'Financiera']`.
   - **Schema en Prisma** (recomendado) o TypeScript + raw SQL, con enfoque en migraciones fáciles.
   - **Funciones helper**: normalización de datos, cálculo de % carga financiera, determinación de `guardarCompleto`.
   - **Estrategia de anonimización** para casos no idóneos.
   - **Preparación para local vs serverless** (variables de entorno, drivers compatibles con SQLite y PostgreSQL).

### Formato de Respuesta Obligatorio:

**1. Resumen de la Nueva Arquitectura de Datos**

**2. Modelo Relacional Propuesto**
   - Tablas principales con sus campos y relaciones
   - Recomendación de ORM (Prisma recomendado)

**3. Estrategia de Persistencia Dual (Frontend + Backend)**

**4. Lógica de Decisión `guardarCompleto` y Anonimización**

**5. Schema en Prisma (código completo recomendado)**

**6. Estructura de Archivos para la capa de datos**

**7. Compatibilidad Local vs Serverless (PostgreSQL + SQLite)**

**8. Próximos Pasos Recomendados**

Mantén el diseño limpio, mantenible y escalable. Prioriza simplicidad para el MVP, pero con una base sólida que permita crecer a producción con Aurora Serverless o similar.

Recuerda las restricciones del proyecto: nunca exponer datos sensibles innecesariamente y mantener el enfoque comercial para vendedores de piso.

en la recopilación de Datos personales del cliente:
Identificacion, Contacto, Domicilio
debe ser un wizard donde se tome primero los datos de contacto celular y nombres y apellidos, y luego continuar con el wizard con el resto del form. para al menos almacecnar  el contacto en caso de no poder continuar 
contacto

en el paso 1 deberia existir un pequeño enlace que lleve a continuar con la recopilación de datos de clientes historicos, busqueda por telefono o por los 10 más recientes. 
Pide a los agentes q solucionen esto, tu no hagas cambios, solo orquestalos