Eres un experto en crédito automotriz en México. Voy a actualizar mi herramienta "Perfilador Express de Orientación Comercial para Crédito Automotriz".

Tengo dos documentos adjuntos:
1. "Politicas_entidades.pdf" → contiene las políticas actuales de:
   - CREDITAS (financiera)
   - COPPEL (financiera)
   - RAPIDUATO (financiera)
   - AFIRME (banco)
   - SCOTIABANK (banco)

2. "Perfilador Express de Orientación Comercial para Crédito Automotriz.pdf" → documento funcional original del perfilador.

Necesito que actualices completamente el sistema con las siguientes mejoras:

### 1. Nueva clasificación por tipo de riesgo (obligatorio)
Crear 3 categorías claras según riesgo:
- **Banco** → Bajo riesgo: buen historial, comprobación sólida, perfil tradicional estable.
- **Financiera** → Riesgo medio: historial regular, comprobación parcial, independientes o perfiles con alguna tensión.
- **Subprime** → Alto riesgo: historial malo, sin comprobación, informal, carga financiera alta o clientes que no califican en Banco ni Financiera.

### 2. Criterios claros de viabilidad (Alta / Media / Baja)
Definir rangos basados en:
- % de endeudamiento proyectado (incluyendo nueva mensualidad)
- Ingreso mensual
- % de enganche
- Tipo de cliente y ocupación

### 3. Mejorar el formulario de captura
**Campos obligatorios:**
- Ingreso mensual aproximado
- Ocupación (asalariado, independiente, negocio propio, informal, pensionado)
- Antigüedad laboral o en actividad
- Precio aproximado del vehículo
- Año modelo del vehículo
- Enganche disponible (en pesos y/o %)

**Nuevos campos:**
- Gastos familiares aproximados:
  - Renta o hipoteca mensual
  - Número de dependientes económicos
- Tipo de domicilio (propio, rentado, familiar, otro)

### 4. Ajustes en enganche
Mover el enganche a la sección del vehículo.
Validaciones:
- Mínimo 20%
- Máximo sugerido 80-90%

### 5. Ajustes en variables poco confiables
- Historial crediticio: mantener como referencia solo (no como decisión principal). El cliente puede mentir.
- No eliminarlo, pero reducir su peso.

### 6. Nueva métrica: Carga financiera proyectada
Calcular:
- Carga actual: (deudas + gastos familiares) / ingreso
- Carga proyectada: (deudas + gastos familiares + mensualidad estimada) / ingreso
Usar los mismos semáforos comerciales:
- Cómoda: ≤ 35%
- Justa: 36% – 40%
- Apretada: > 40%

### 7. Validaciones de congruencia
- Ingreso vs mensualidad deseada
- Enganche vs precio del vehículo
- Reglas adicionales según ocupación, antigüedad del auto y tipo de unidad

### 8. Output obligatorio (nuevo formato mejorado)

**Resultado Express Actualizado**

Viabilidad inicial: Alta / Media / Baja  
Clasificación recomendada: Banco / Financiera / Subprime  
Capacidad de pago estimada: Alta / Media / Baja  
Nivel de carga financiera proyectada: Cómoda / Justa / Apretada  

**Por qué:** (explicación clara y comercial de 3-5 líneas)

**Recomendaciones accionables:**
- (ej. “Aumentar enganche mínimo a 25%”, “Bajar el valor del vehículo a $XXX”, “Ampliar plazo con cuidado”, “No viable en condiciones actuales – sugerir reestructurar”, etc.)

**Qué debe decir el vendedor al cliente:** (mini script consultivo y natural)

**Advertencia comercial:** (solo si aplica)

### 9. Cambios visuales
Logo_Seminuevos_Rojo_Mesa de trabajo 1.png reemplaza a semi_nuevos.jpg
El ultimo cuadro "Qué decirle al cliente" siempre es rojo, el color deberia ir acorde con la viabilidad inicial  (verde, amarilla, roja)

---

Reglas generales que debes seguir:
- Nunca prometas aprobación.
- No nombres bancos ni financieras específicas en el output (solo usa Banco / Financiera / Subprime).
- Habla siempre como asesor comercial práctico y neutral.
- Mantén el lenguaje simple y útil para vendedores de piso.
- Usa toda la información de ambos PDFs para alimentar la lógica.

Por favor, genera la **versión completa actualizada del sistema** (lógica interna + nuevo formulario + nuevo output) lista para implementar.

¿Estás listo? Cuando digas "Listo", te pasaré los datos del cliente para probar el nuevo perfilador.