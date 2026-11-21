# Captura N6 (South N6+ por Bluetooth)

Incluye ícono propio (`assets/icon.svg`; los PNG de Android están en `resources/android/res` y se instalan solos al compilar).

App Android que recibe por Bluetooth los puntos de la estación total South N6+, los muestra en lista, dibujo y mapa, y los exporta a CSV y DXF.

## Generar el APK en línea (sin instalar nada)

1. Crea una cuenta gratis en https://github.com y un repositorio nuevo (privado está bien).
2. En el repositorio pulsa **Add file > Upload files** y arrastra TODO el contenido de esta carpeta, incluida la carpeta `.github` (si tu explorador no la muestra porque empieza con punto, créala aparte: **Add file > Create new file**, escribe como nombre `.github/workflows/apk.yml` y pega el contenido del archivo del mismo nombre). Confirma con **Commit changes**.
3. Ve a la pestaña **Actions**. Si pide habilitar los flujos, acepta. Elige **Compilar APK** y pulsa **Run workflow**.
4. Espera unos 5 a 8 minutos hasta que aparezca una marca verde. Abre la ejecución y, abajo en **Artifacts**, descarga `captura-n6-apk` (es un zip con `app-debug.apk`).
5. Pasa el APK al celular, ábrelo y permite «instalar apps de origen desconocido» cuando Android lo pida.

Si la marca sale roja, abre el paso que falló y envíame el texto del error.

## Primer uso

1. En Ajustes de Android > Bluetooth, empareja la estación (el PIN suele ser 0000 o 1234).
2. En la estación, activa el envío de datos por Bluetooth y elige el formato de salida.
3. En la app: **Buscar equipos Bluetooth**, elige la estación, **Conectar**. Acepta los permisos que pida Android.
4. Envía puntos desde la estación. Cada línea recibida aparece en la tabla.
5. Si no llega nada, prueba cambiar «Fin de línea» a Retorno (\r) y conecta de nuevo.

Descargar CSV o DXF abre el menú Compartir de Android para guardar el archivo o enviarlo.

## Versión 2 (estilo SurvStar)
Código fuente en `src/` (core.js, app1-3.js, style.css, index.tpl.html). Para regenerar `www/index.html`: `python3 scripts/build.py`. Pruebas del núcleo: `node src/test_core.js`.
