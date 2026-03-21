# Despliegue de Lambda — Perfilador Express

Instrucciones paso a paso para crear y conectar la función Lambda que sirve como backend del Perfilador Express de Crédito Automotriz.

---

## Requisitos previos

- Acceso a la consola de AWS con permisos para Lambda, API Gateway e IAM
- La clave de API de DeepSeek (`DEEPSEEK_API_KEY`)
- La URL del API Gateway ya creado en AWS Amplify (o uno nuevo)

---

## Paso 1 — Empaquetar el archivo

Desde la raíz del proyecto, genera el archivo ZIP que subirás a Lambda:

```bash
# En macOS / Linux
cd lambda
zip function.zip index.mjs

# En Windows (PowerShell)
cd lambda
Compress-Archive -Path index.mjs -DestinationPath function.zip
```

El ZIP debe contener `index.mjs` en su raíz (sin subdirectorio).

---

## Paso 2 — Crear la función Lambda en AWS Console

1. Abre [AWS Console > Lambda](https://console.aws.amazon.com/lambda/).
2. Haz clic en **Crear función**.
3. Selecciona **Crear desde cero**.
4. Configura los campos:
   - **Nombre de la función**: `perfilador-express-handler` (o el nombre que prefieras)
   - **Runtime**: `Node.js 20.x` (recomendado) o `Node.js 18.x`
   - **Arquitectura**: `x86_64`
5. En **Permisos**, usa el rol de ejecución predeterminado (se crea automáticamente con permisos básicos para CloudWatch Logs).
6. Haz clic en **Crear función**.

---

## Paso 3 — Subir el código

1. En la página de la función recién creada, ve a la pestaña **Código**.
2. En el panel **Código fuente**, haz clic en **Subir desde > Archivo .zip**.
3. Selecciona el archivo `lambda/function.zip` que generaste en el Paso 1.
4. Haz clic en **Guardar**.
5. Verifica que el archivo `index.mjs` aparece en el explorador de archivos del editor.

Importante: en la sección **Configuración de tiempo de ejecución** (dentro de la pestaña Código), asegúrate de que el **Controlador** esté configurado como:

```
index.handler
```

---

## Paso 4 — Agregar la variable de entorno DEEPSEEK_API_KEY

1. Ve a la pestaña **Configuración > Variables de entorno**.
2. Haz clic en **Editar**.
3. Haz clic en **Agregar variable de entorno**:
   - **Clave**: `DEEPSEEK_API_KEY`
   - **Valor**: tu clave de DeepSeek (empieza con `sk-...`)
4. Haz clic en **Guardar**.

La clave nunca sale del entorno de Lambda — el frontend no la ve en ningún momento.

---

## Paso 5 — Configurar el timeout de la función

La llamada a DeepSeek puede tardar hasta 25 segundos. El timeout predeterminado de Lambda (3 s) no es suficiente.

1. Ve a **Configuración > Configuración general**.
2. Haz clic en **Editar**.
3. Cambia el **Tiempo de espera** a `0 min 30 s` (30 segundos).
4. Haz clic en **Guardar**.

---

## Paso 6 — Conectar con API Gateway (ruta POST /api/analyze)

### Opción A: usar el API Gateway existente de Amplify

Si Amplify ya creó un API Gateway, agrégale el recurso:

1. Abre [AWS Console > API Gateway](https://console.aws.amazon.com/apigateway/).
2. Selecciona el API HTTP o REST asociado a tu app de Amplify.
3. Crea un recurso `/api/analyze` (o verifica que ya exista).
4. Agrega un método **POST** con:
   - **Tipo de integración**: Lambda Function
   - **Usar integración Lambda Proxy**: activado (palomita marcada)
   - **Función Lambda**: selecciona `perfilador-express-handler`
5. Repite el Paso 4 para el método **OPTIONS** con el mismo tipo de integración (necesario para el preflight CORS).

### Opción B: crear un nuevo API Gateway HTTP

1. En API Gateway, elige **Crear API > API HTTP**.
2. En **Integraciones**, agrega tu función Lambda.
3. En **Rutas**, configura:
   - `POST /api/analyze` → tu función Lambda
   - `OPTIONS /api/analyze` → tu función Lambda (para preflight CORS)
4. En **Etapas**, usa `$default` o crea una etapa llamada `api`.
5. Haz clic en **Crear**.

---

## Paso 7 — Habilitar CORS en API Gateway

El handler Lambda ya devuelve los headers CORS en cada respuesta. Sin embargo, API Gateway también puede necesitar configuración CORS a nivel de gateway:

### Para API HTTP (recomendado):
1. En tu API, ve a **CORS**.
2. Configura:
   - **Allow origin**: `*` (o el dominio de Amplify, ej. `https://main.xxxx.amplifyapp.com`)
   - **Allow headers**: `Content-Type`
   - **Allow methods**: `POST, OPTIONS`
3. Haz clic en **Guardar**.

### Para API REST:
1. Selecciona el recurso `/api/analyze`.
2. Haz clic en **Acciones > Habilitar CORS**.
3. Usa los valores predeterminados o ajusta el origen.
4. Haz clic en **Habilitar CORS y reemplazar cabeceras CORS existentes**.

---

## Paso 8 — Desplegar / redesplegar el API Gateway

### Para API HTTP:
Los cambios se despliegan automáticamente en la etapa `$default`.

### Para API REST:
1. Haz clic en **Acciones > Implementar API**.
2. Selecciona la etapa (ej. `prod` o `api`).
3. Haz clic en **Implementar**.

La URL de invocación tiene este formato:
```
https://[api-id].execute-api.[region].amazonaws.com/[stage]/api/analyze
```

Cópiala — la necesitarás en el siguiente paso.

---

## Paso 9 — Configurar la variable de entorno en Amplify

Para que el frontend en producción apunte al endpoint de Lambda:

1. Abre [AWS Console > Amplify](https://console.aws.amazon.com/amplify/).
2. Selecciona tu app.
3. Ve a **Variables de entorno**.
4. Agrega:
   - **Variable**: `VITE_API_URL`
   - **Valor**: `https://[api-id].execute-api.[region].amazonaws.com/[stage]`

   Ejemplo:
   ```
   VITE_API_URL=https://abc123def.execute-api.us-east-1.amazonaws.com/prod
   ```

   Nota: el frontend concatenará `/api/analyze` al final automáticamente.

5. Redespliega la app en Amplify para que tome la nueva variable.

---

## Paso 10 — Verificar con curl

Reemplaza `[URL]` con tu URL de API Gateway completa:

```bash
curl -X POST https://[URL]/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "Eres un perfilador comercial. Responde solo con: Resultado express",
    "userMessage": "Prueba de conectividad"
  }'
```

Respuesta esperada:
```json
{ "text": "Resultado express" }
```

Si ves un error de CORS al probar desde el navegador, verifica que los headers `Access-Control-Allow-Origin` estén presentes en la respuesta usando:

```bash
curl -I -X OPTIONS https://[URL]/api/analyze \
  -H "Origin: https://main.xxxx.amplifyapp.com" \
  -H "Access-Control-Request-Method: POST"
```

---

## Resumen de archivos relevantes

| Archivo | Descripcion |
|---|---|
| `lambda/index.mjs` | Handler de Lambda (este archivo se sube a AWS) |
| `lambda/function.zip` | ZIP generado para subir a Lambda (no incluir en git) |
| `src/hooks/usePerfilador.js` | Hook del frontend — usa `VITE_API_URL` en produccion |
| `amplify.yml` | Configuracion de build para AWS Amplify |
| `.env.local` | Variables de entorno locales (no incluir en git) |
