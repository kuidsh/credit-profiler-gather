Documento funcional y de negocio

Perfilador Express de Orientación Comercial para Crédito Automotriz

1. Nombre del proyecto

Perfilador Express de Orientación Comercial para Crédito Automotriz

2. Propósito de la solución
Desarrollar una herramienta simple y rápida que ayude a vendedores de agencias y lotes a identificar, con base en preguntas básicas al cliente y datos generales del vehículo, qué tipo de ruta de financiamiento conviene explorar primero.
La herramienta no busca aprobar créditos ni sustituir el análisis formal de una financiera o banco.
 Su propósito es funcionar como un orientador comercial inicial para ayudar al vendedor a:
perfilar mejor al cliente
evitar mandar solicitudes “a ciegas”
reducir malas canalizaciones
detectar si el caso luce fuerte, ajustado o delicado
orientar al cliente con más criterio
sugerir por cuál tipo de opción de financiamiento empezar



3. Problema que resuelve
Hoy muchos vendedores tienen varias opciones de financiamiento disponibles, pero con frecuencia deciden a quién mandar un cliente con base en:
costumbre
relación con el ejecutivo
rapidez de respuesta
incentivos de colocación
preferencia personal


y no necesariamente con base en:
perfil real del cliente
capacidad de pago aproximada
enganche disponible
historial general
antigüedad del auto
viabilidad comercial inicial


Esto puede provocar:
solicitudes mal dirigidas
pérdida de tiempo
rechazos innecesarios
operaciones mal estructuradas
clientes mal asesorados
daño reputacional para la agencia

4. Objetivo general del perfilador
El perfilador debe analizar datos básicos del cliente y del auto para devolver una orientación inicial sobre:
Viabilidad inicial del caso
Tipo de perfil comercial del cliente
Capacidad de pago estimada
Nivel de carga financiera estimada
Tipo de ruta de financiamiento sugerida
Ajuste sugerido antes de ingresar solicitud
Guion breve para que el vendedor hable con el cliente



5. Qué es y qué no es
Sí es
un orientador comercial
una herramienta de perfilamiento rápido
una ayuda para decidir por dónde empezar
una guía para vendedores no financieros


No es
un aprobador de crédito
un buró
un cotizador formal
un motor de dictamen bancario
una herramienta documental



6. Usuario objetivo
Usuario principal
vendedor de agencia
vendedor de lote
asesor comercial
gerente de ventas
ejecutivo de piso


Usuario secundario
gerente F&I
coordinador comercial
capacitador

7. Caso de uso principal
El vendedor está frente al cliente o atendiendo un lead.
 Hace unas cuantas preguntas rápidas, captura datos generales del auto y recibe una lectura simple sobre:
qué tan viable luce el caso
si el cliente va más por ruta tradicional, flexible o alternativa
si conviene reestructurar antes de ingresar
si la mensualidad probable luce cómoda, justa o apretada

8. Enfoque de diseño
La herramienta debe ser:
rápida
simple
clara
útil en piso de venta
fácil de adoptar
sin lenguaje bancario complejo


Tiempo ideal de uso:
 1 a 3 minutos

9. Alcance funcional de esta versión
La versión express debe:
pedir pocas variables
no solicitar documentos
no pedir datos excesivos
clasificar perfil de forma práctica
estimar la comodidad o presión financiera del caso
orientar por tipo de opción de financiamiento
sugerir ajustes básicos


No debe:
revisar expediente documental
pedir estados de cuenta
calcular tasas reales
nombrar instituciones específicas
prometer aprobación



10. Variables mínimas de entrada

10.1 Datos del cliente
Tipo de ocupación:


asalariado
independiente
negocio propio
informal
pensionado


Antigüedad laboral o en actividad
Ingreso mensual aproximado
¿Comprueba ingresos?
sí
parcial
no
Historial crediticio percibido:
bueno
regular
malo
sin historial / no sabe


Deudas mensuales aproximadas
Enganche disponible



10.2 Datos de la operación
Mensualidad que busca el cliente
Plazo deseado
¿Está dispuesto a cambiar de unidad o ajustar monto?
sí
no

10.3 Datos del auto
Precio aproximado del auto
Año modelo
Tipo de unidad:
sedán
SUV
pickup
premium
híbrido / eléctrico
otro

11. Variables derivadas a interpretar
Con esos datos, el perfilador debe inferir:
relación entre ingreso y mensualidad deseada
relación entre deuda actual y nueva carga
presión estimada de pago
fortaleza general del perfil
impacto del enganche
riesgo por antigüedad del auto
si la estructura luce lógica o forzada

12. Módulo de capacidad de pago estimada
Este módulo sí debe existir, pero de forma simple.

12.1 Objetivo
Dar una lectura comercial orientativa sobre si el cliente parece tener margen para absorber una nueva mensualidad.

12.2 Cálculo orientativo
Tomar:
ingreso mensual aproximado
deudas mensuales actuales
mensualidad que busca el cliente
Y generar una lectura de:
capacidad de pago estimada
nivel de carga financiera estimada


12.3 Fórmulas simples

Ingreso libre estimado
Ingreso mensual - deudas actuales
Deuda total estimada
Deudas actuales + mensualidad objetivo
Relación deuda/ingreso estimada
Deuda total estimada / ingreso mensual

12.4 Semáforo sugerido

Como referencia comercial:

Cómoda / saludable: hasta 30%-35%
Justa / aceptable: más de 35% y hasta 40%
Apretada / riesgosa: arriba de 40%


Esto debe presentarse como guía comercial, no como regla universal del mercado.

13. Clasificaciones del perfilador

13.1 Viabilidad inicial
Alta
Media
Baja


Definición

Alta: el caso luce bien perfilado para iniciar por rutas competitivas
 Media: el caso puede funcionar, pero requiere ajustes o cautela
 Baja: el caso luce delicado y conviene reestructurar antes de moverlo

13.2 Tipo de perfil comercial

Perfil tradicional
Perfil tradicional con ajustes
Perfil flexible
Perfil alternativo
Perfil delicado


Definición

Perfil tradicional: cliente formal, ingreso estable, historial bueno, enganche razonable
Tradicional con ajustes: cliente aceptable, pero con alguna presión en pago, enganche o antigüedad de auto
Flexible: ingreso variable, comprobación parcial o historial limitado
Alternativo: menos bancarizado, menos formal o con condiciones fuera del perfil tradicional
Delicado: historial malo, pago muy apretado, poco enganche o estructura poco viable

13.3 Capacidad de pago estimada

Alta
Media
Baja



13.4 Nivel de carga financiera estimada

Cómoda
Justa
Apretada

13.5 Ruta sugerida de financiamiento

Explorar primero opción tradicional bancaria
Explorar primero opción tradicional con ajustes
Explorar primero opción flexible
Explorar primero opción alternativa
Reestructurar antes de ingresar

14. Reglas generales de negocio

14.1 Historial

historial bueno favorece ruta tradicional
historial regular puede requerir ajustes
historial malo o muy débil empuja a ruta alternativa o reestructura
sin historial no elimina viabilidad, pero requiere cuidado


14.2 Comprobación

comprobación sólida favorece ruta tradicional
comprobación parcial puede mover el caso a ruta flexible
sin comprobación reduce opciones tradicionales


14.3 Ocupación

asalariado y pensionado suelen abrir mejor la ruta tradicional
independiente o negocio propio pueden ser viables, pero dependen más de comprobación y estabilidad
informal tiende a ruta alternativa o a pedir ajustes


14.4 Enganche

a mayor enganche, mejor lectura general
enganche bajo debilita la operación
en perfiles más frágiles, el enganche es una palanca importante


14.5 Auto

mientras más antiguo el auto, más probable que se compliquen opciones
autos recientes abren más rutas
tipos de unidad especiales pueden requerir más cautela


14.6 Capacidad de pago

si el cliente queda con carga alta, el perfilador debe advertirlo
si la mensualidad buscada es poco congruente con el ingreso, debe sugerir ajuste
aunque un caso parezca movible, si la carga luce apretada debe señalarlo



15. Lógica orientativa de decisión

Variables de mayor peso
historial percibido
ocupación
nivel de comprobación
ingreso mensual aproximado
deuda mensual actual
enganche
mensualidad objetivo
año del auto

16. Ejemplos de lectura esperada

Caso 1
asalariado
3 años de antigüedad
ingreso 30,000
comprueba sí
historial bueno
deudas 4,000
enganche 90,000
unidad 2022 de 380,000
mensualidad buscada 7,000


Salida esperada:

 Viabilidad alta / Perfil tradicional / Capacidad media-alta / Carga cómoda o justa / Explorar primero opción tradicional bancaria

Caso 2
independiente
2 años de actividad
ingreso 24,000
comprueba parcial
historial regular
deudas 6,000
enganche 50,000
unidad 2019 de 320,000
mensualidad buscada 8,500


Salida esperada:


Viabilidad media / Perfil flexible / Capacidad media / Carga justa o apretada / Explorar opción flexible o reestructurar

Caso 3
informal
ingreso 18,000
no comprueba
historial malo
deudas 5,000
enganche 20,000
unidad 2017 de 290,000
mensualidad buscada 8,000


Salida esperada:


Viabilidad baja / Perfil delicado o alternativo / Capacidad baja / Carga apretada / Reestructurar antes de ingresar

17. Formato de salida obligatorio

El perfilador debe responder siempre con este formato:

Resultado express
Viabilidad inicial:
Alta / Media / Baja

Tipo de perfil:
Perfil tradicional / Tradicional con ajustes / Flexible / Alternativo / Delicado

Capacidad de pago estimada:
Alta / Media / Baja

Nivel de carga financiera estimada:
Cómoda / Justa / Apretada

Ruta sugerida:
Explorar primero opción tradicional bancaria / tradicional con ajustes / flexible / alternativa / reestructurar antes de ingresar

Por qué:
Explicación breve de 2 a 4 líneas

Ajuste sugerido antes de ingresar:
subir enganche / bajar monto / cambiar unidad / ampliar plazo con cuidado / fortalecer perfil / alinear expectativas

Qué debe decir el vendedor al cliente:
Mini script claro y consultivo

Advertencia comercial:
Solo cuando el caso se vea frágil o apretado

18. Estilo de respuesta
Debe hablar como:
asesor comercial
consultor práctico
orientador neutral


Debe evitar:
exceso de tecnicismo
lenguaje duro
frases absolutas
promesas de aprobación


Debe usar:
claridad
sencillez
lógica comercial
lenguaje fácil de entender

19. Restricciones del sistema
No debe:
pedir documentos en esta etapa
nombrar instituciones concretas
prometer aprobación
inventar tasas
reemplazar análisis formal
recomendar por rapidez o comisión
sonar como solicitud bancaria formal

20. Arquitectura recomendada

Capa 1: Captura simple
Formulario corto con pocas preguntas

Capa 2: Normalización
Convertir respuestas en categorías:

historial: bueno / regular / malo / sin historial
comprobación: sí / parcial / no
perfil: formal / variable / informal
carga: cómoda / justa / apretada


Capa 3: Motor de orientación
Reglas simples + Claude para redactar la recomendación
Capa 4: Salida estándar
Siempre devolver el formato express

21. Prompt base sugerido para Claude

Actúa como un perfilador express de orientación comercial para crédito automotriz en agencias y lotes de México.

Tu función es analizar datos básicos del cliente y del auto para orientar al vendedor sobre por qué tipo de opción de financiamiento conviene empezar.

No apruebas créditos. No prometes aprobación. No mencionas bancos, financieras ni instituciones específicas. No inventas tasas ni condiciones reales.

Tu objetivo es dar una lectura simple, práctica y útil para vendedores, usando solo preguntas básicas al cliente y datos generales del auto.

Analiza estas variables:
- ocupación
- antigüedad laboral o en actividad
- ingreso mensual aproximado
- si comprueba ingresos: sí / parcial / no
- historial crediticio percibido: bueno / regular / malo / sin historial
- deudas mensuales aproximadas
- enganche disponible
- mensualidad que busca
- plazo deseado
- si acepta ajustar unidad o monto
- precio aproximado del auto
- año modelo
- tipo de unidad

Calcula de forma orientativa:
- capacidad de pago estimada
- nivel de carga financiera estimada

Usa como referencia comercial:
- cómoda/saludable: hasta 30%-35%
- justa/aceptable: más de 35% y hasta 40%
- apretada/riesgosa: arriba de 40%

Clasifica el caso en:
- Viabilidad inicial: Alta / Media / Baja
- Tipo de perfil: Tradicional / Tradicional con ajustes / Flexible / Alternativo / Delicado
- Capacidad de pago estimada: Alta / Media / Baja
- Nivel de carga financiera estimada: Cómoda / Justa / Apretada
- Ruta sugerida: Explorar primero opción tradicional bancaria / tradicional con ajustes / flexible / alternativa / reestructurar antes de ingresar

Devuelve siempre este formato:

Resultado express
Viabilidad inicial:
Tipo de perfil:
Capacidad de pago estimada:
Nivel de carga financiera estimada:
Ruta sugerida:
Por qué:
Ajuste sugerido antes de ingresar:
Qué debe decir el vendedor al cliente:
Advertencia comercial:

Reglas:
- Si el perfil es fuerte, orienta a ruta tradicional.
- Si hay tensión en pago, enganche o historial, orienta a tradicional con ajustes o flexible.
- Si la comprobación es débil o el perfil es poco bancarizado, considera ruta alternativa.
- Si la carga financiera luce alta o la estructura se ve forzada, sugiere reestructurar.
- Usa lenguaje simple, comercial y claro.
- No hables como banco; habla como asesor comercial.

22. Plantilla de input recomendada

Analiza este caso con el perfilador express:

Ocupación:
Antigüedad laboral o en actividad:
Ingreso mensual aproximado:
Comprueba ingresos:
Historial crediticio percibido:
Deudas mensuales aproximadas:
Enganche disponible:
Mensualidad que busca:
Plazo deseado:
¿Acepta cambiar unidad o ajustar monto?:
Precio aproximado del auto:
Año modelo:
Tipo de unidad:

23. Ejemplo de salida esperada

Resultado express

Viabilidad inicial: Media

Tipo de perfil: Flexible

Capacidad de pago estimada: Media

Nivel de carga financiera estimada: Justa

Ruta sugerida: Explorar primero opción flexible

Por qué:
El cliente tiene ingresos razonables, pero combina comprobación parcial con historial regular y una estructura algo apretada para el auto que busca. Hay posibilidad de trabajar el caso, pero no luce como una ruta tradicional limpia desde el inicio.

Ajuste sugerido antes de ingresar:
Subir un poco el enganche o bajar ligeramente el monto de la unidad para mejorar la estructura.

Qué debe decir el vendedor al cliente:
“Sí veo posibilidad, pero para llevarte por una ruta que te quede mejor conviene revisar una opción un poco más flexible o ajustar un poco la estructura para que la operación salga más sana.”

Advertencia comercial:
No conviene mover este caso solo por rapidez; primero hay que cuidar que la mensualidad quede manejable.


24. Criterios de éxito
La herramienta será útil si logra:
ser rápida de usar
ayudar a vendedores de piso
orientar mejor la primera ruta
reducir envíos mal dirigidos
detectar casos apretados
mejorar la conversación comercial con el cliente

25. Riesgos a evitar
volverla demasiado compleja
pedir demasiados datos
hacerla sonar como solicitud formal
generar expectativa de aprobación
querer sustituir el análisis real del otorgante

26. Resumen ejecutivo para compartir con la persona que lo construirá
Necesitamos un perfilador express de orientación comercial para crédito automotriz. La herramienta debe usar solo preguntas básicas al cliente y datos generales del auto para ayudar al vendedor a identificar la viabilidad inicial del caso, el tipo de perfil, la capacidad de pago estimada, el nivel de carga financiera y la ruta de financiamiento que conviene explorar primero. No debe pedir documentos, no debe prometer aprobación y no debe recomendar instituciones por nombre. Debe ser simple, rápida y útil para vendedores de agencias y lotes.
Lo ideal
Wizard corto de 4 pasos:
Paso 1. Cliente
ocupación
antigüedad laboral
ingreso mensual
si comprueba ingresos
Paso 2. Perfil financiero
historial percibido
deudas mensuales
enganche disponible
Paso 3. Auto y operación
precio del auto
año modelo
tipo de unidad
mensualidad buscada
plazo deseado
Paso 4. Resultado express
viabilidad inicial
tipo de perfil
capacidad estimada
carga financiera
ruta sugerida
ajuste recomendado
mini script para el vendedor
Mi recomendación puntual
Hazlo tipo wizard, pero con estas reglas:
máximo 3 a 5 campos por paso
barra de progreso
lenguaje muy simple
respuestas rápidas tipo selección
casi nada de texto libre
resultado final muy visual
Incluso mejor
Al final del wizard, agrega dos botones:
Ver recomendación resumida
Ver explicación completa
Así el vendedor rápido ve lo esencial, y el gerente puede profundizar.
Cuándo sí convendría una sola página
Solo si lo fuera a usar alguien más analítico, como:
F&I
gerente de crédito
coordinador comercial
Pero para vendedor de piso, wizard corto funciona mejor.
Mi recomendación final
Wizard por pasos para capturar + pantalla final única de resultado.
Esa combinación es la más práctica.

Lineamientos graficos: 
https://www.seminuevos.com/usados/-/autos?type_autos_motor-credit-status=activado
LogoGANAcorp.jpeg