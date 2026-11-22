# ⚡ OmniFlash Studio

Un estudio sencillo y bonito para crear videos con **Gemini Omni Flash** (modelos 1.2 y 1.1) usando la API de **[Kie.ai](https://kie.ai)**.

Funciona en tu computadora: escribes lo que quieres ver, presionas **Crear video** y en 1 a 3 minutos lo tienes listo, guardado en la carpeta `videos/`.

---

## Cómo empezar (2 minutos)

0. **Descarga el estudio** (si te lo compartieron por GitHub): en la página del repositorio, botón verde **Code → Download ZIP**, y descomprímelo en una carpeta. *(O con git: `git clone` y la dirección del repositorio.)*
1. **Instala Node.js** (solo la primera vez): descárgalo en [nodejs.org](https://nodejs.org), versión LTS.
2. **Abre el estudio**: haz doble clic en **`Iniciar.bat`**. Se abre solo en tu navegador.
   *(O desde una terminal: `npm start` y entra a http://localhost:4747)*
3. **Conecta tu cuenta de Kie**: la primera vez te pide tu llave.
   - Entra a [kie.ai/api-key](https://kie.ai/api-key) y copia tu **API Key**.
   - Pégala en el estudio y presiona **Conectar**.
   - Se guarda en el archivo `.env` de esta carpeta, solo en tu computadora.
4. **Revisa los permisos de tu llave** en kie.ai → API Key. Si tu llave está limitada a ciertos modelos, activa estos (o permite todos):
   - Gemini Omni Flash 1.2 y 1.1 (crear videos)
   - Gemini Omni Flash 1.2 Extend (continuar videos)
   - Video Upscale (mejorar calidad)
   - Gemini Omni Character y Audio (personajes y voces)
   - Gemini 3.8 Flash (para «Mejorar con IA»)

   Si falta un permiso, el estudio te dice exactamente cuál activar.

5. **Opcional, para el editor: instala FFmpeg** (gratis). Sirve para exportar tus episodios. Abre **PowerShell**, pega esto y presiona Enter:
   ```
   winget install Gyan.FFmpeg
   ```
   Después cierra la ventana negra y abre `Iniciar.bat` otra vez. *(En Mac: `brew install ffmpeg`.)*

Listo. Deja abierta la ventana negra mientras uses el estudio (para cerrarlo: `Ctrl + C` o cierra la ventana).

Cada persona usa **su propia llave de Kie** y gasta sus propios créditos. Tus videos, proyectos y llave nunca se suben al repositorio.

---

## Las 4 formas de crear

| Modo | Para qué sirve |
|---|---|
| **Texto** | Describes la escena y la IA la crea desde cero. |
| **Imágenes** | Subes fotos (un personaje, un producto, un lugar) y el video las usa como referencia. |
| **Inicio y fin** | Eliges la imagen con la que empieza el video y, si quieres, con la que termina. |
| **Video** | Subes un video corto y describes cómo transformarlo. |

**Dos modelos** (arriba del panel):

| | Omni 1.2 (recomendado) | Omni 1.1 |
|---|---|---|
| Duración | 4 a 15 s | 4, 6, 8 o 10 s |
| Precio | Por segundo (borradores muy baratos) | Precio fijo por duración |
| Continuar videos | Sí | No |
| Video de entrada | Hasta 15 s, completo | Hasta 30 s, eliges un tramo de 10 s |
| Personajes a la vez | 2 | 3 |

**Ajustes:** aparecen resumidos en una línea (ej. «Omni 1.2 · Horizontal · 6 s · 720p»); tócala para cambiar formato (horizontal o vertical), duración, calidad (360p borrador, 720p, 1080p, 4K), versiones (1 a 4) y, en opciones avanzadas, la semilla.

---

## La biblia del proyecto (tu «system prompt»)

Arriba del panel eliges el **proyecto** y, al lado, el botón **Biblia**. Ahí defines las reglas que se aplican solas a **cada video** de ese proyecto:
- **Estilo base:** cómo se ve y se siente todo (colores, luz, cámara, época, ambiente, idioma de los diálogos).
- **Evitar siempre:** lo que nunca quieres ver (toca las sugerencias: texto en pantalla, marcas de agua…).
- **Estilo guardado**, **semilla fija** (para que la «textura» se parezca entre escenas) y **personajes fijos** (se eligen solos).
- **Ajustes del proyecto:** modelo, formato y calidad que se ponen solos al elegir el proyecto.

Debajo de tu descripción aparece **«Así se enviará»** con el texto final exacto.
Ojo: el modelo de video no tiene un «system prompt» real; el estudio añade estas reglas al final de tu descripción. Funciona bien, pero el modelo puede no cumplirlas al 100 %.

## Estilo: un solo lugar

El botón **Estilo** (dentro de la caja de descripción) abre un solo selector con: el estilo del proyecto, tus estilos guardados, estilos rápidos (Cine, Anime, Documental…) y **toques** que se suman (cámara lenta, drone, hora dorada…). Tus estilos se crean en «Mis estilos». Desde un video terminado, **Guardar su estilo** crea uno con ese video como ejemplo; **Mejorar con IA** convierte unas pocas palabras (o la descripción del video) en un estilo completo.

## Continuidad entre escenas

En un video terminado, **Siguiente escena desde aquí** toma su último cuadro y lo pone como inicio del siguiente video (modo «Inicio y fin»), en el mismo proyecto. Así la historia sigue sin saltos. Funciona con los dos modelos y cualquier calidad. (En ese modo no se pueden elegir personajes, pero ya aparecen en el cuadro.)

---

## Personajes con voz

Crea un personaje una vez (foto de la cara, foto de cuerpo opcional, descripción y una voz) y aparecerá **igual en todos tus videos**. Crearlo es gratis.
Para usarlo, tócalo en la fila **Personajes** y escribe su nombre en la descripción («Lucía camina por…»).
Las voces vienen de Kie con nombres de estrellas (Sulafat, Kore, Puck…); al lado de cada una dice su tono. Puedes describir el acento o la forma de hablar.

---

## Hacer más con un video terminado

Abre cualquier video (clic encima) y encontrarás:
- **Continuar este video** (modelo 1.2, en 360p o 720p): escribes qué pasa después y Kie lo alarga con una escena nueva. El resultado incluye el original. Puedes seguir alargando hasta ~15 s.
- **Recrear en alta calidad**: vuelve a crear la misma idea en 1080p o 4K, con la misma semilla para que salga muy parecida. Ideal después de probar en borrador.
- **Mejorar calidad**: agranda *el mismo video exacto* a 1080p, 2K o 4K. Kie no publica este precio; lo verás cuando termine.
- **Comparar las versiones** (si pediste varias), **favorito ★**, **mover a un proyecto**, descargar y copiar la descripción.

---

## Editor: une tus escenas en un episodio

Botón **Editor** (arriba de la galería), o **Añadir al editor** desde un video abierto.
- **Tus clips** (izquierda): los videos listos del proyecto. Toca **+** para añadir uno al final, o **Añadir todos** para ponerlos en el orden en que los creaste.
- **Línea de tiempo** (abajo): arrastra los clips para cambiar el orden. Toca uno para elegirlo.
- **Recortar** (derecha): mueve los bordes blancos para quitar segundos al inicio o al final. La pantalla muestra el cuadro exacto mientras arrastras. También puedes moverlo, repetirlo o quitarlo.
- **Episodio**: formato (horizontal o vertical), **corte directo** o **fundido suave** entre clips, volumen del sonido de los clips y **música de fondo** (se repite si es corta y baja suave al final).
- **Vista previa al instante** con el botón ▶ (o la barra espaciadora), con tus recortes, fundidos y música.
- **Exportar episodio** crea un solo MP4 en `videos/` y lo pone en la galería. **No gasta créditos**: lo arma FFmpeg en tu computadora. Si vuelves a exportar, se reemplaza el anterior.

Puedes tener varios episodios (selector de arriba a la izquierda). Todo se guarda solo. Si mezclas clips verticales y horizontales, se ajustan al formato del episodio con bordes negros, sin deformarse.

---

## Organizar

- **Proyectos:** agrupa tus videos (por ejemplo, «Miniserie del robot»). Elige en la galería qué proyecto ver; los videos nuevos se guardan en el proyecto elegido abajo, junto al botón Crear.
- **Favoritos ★** y **buscador** en la galería.
- **Comparar:** botón «Comparar» → elige de 2 a 4 videos → se reproducen lado a lado, sincronizados. Toca el altavoz de uno para escuchar su sonido.
- **Plantillas:** guarda la idea completa (descripción, estilo, ajustes y personajes) y úsala otra vez con un clic.
- **Mejorar con IA:** convierte una idea corta en una descripción completa (cámara, luz, ambiente). Cuesta muy poco y se puede deshacer.

---

## Cola, tiempos y gastos

- Pide todos los videos que quieras seguidos: se forman en una **cola** y se crean solos, en orden. Puedes pausarla, reanudarla y elegir cuántos se crean **a la vez**.
- Cada video muestra en qué paso va, cuánto lleva y cuánto falta (el cálculo aprende de tus videos anteriores).
- **Tu cuenta** (clic en los créditos): saldo, lo gastado hoy / 7 días / total con gráfica, y un **límite diario**: si un video lo superaría, la cola se pausa sola.
- Todo se actualiza solo, sin recargar, incluso en varias pestañas o en el celular.

---

## Usar desde el celular

Botón del celular (arriba) → activa **Permitir el acceso desde el celular** → escanea el código QR con la cámara.
- El celular tiene que estar en el **mismo Wi-Fi** y la computadora encendida con el estudio abierto.
- La primera vez Windows puede preguntar si permites el acceso a la red: elige **Redes privadas**.
- Solo entra quien tenga el código. Si lo compartiste por error, usa «Cambiar el código».

---

## ¿Cuánto cuesta?

Kie cobra en créditos (1 crédito = $0.005 USD). El botón **Crear video** te muestra el precio antes de gastar.

**Omni 1.2** — por segundo de video:

| 360p | 720p | 1080p | 4K |
|---|---|---|---|
| 4 créditos/s | 9 créditos/s | 10 créditos/s | 22 créditos/s |

Ejemplo: 8 s en 360p = 32 créditos ($0.16). Con video de entrada se cobra según la duración de ese video.

**Omni 1.1** — precio fijo:

| Calidad | 4 s | 6 s | 8 s | 10 s |
|---|---|---|---|---|
| 360p / 720p / 1080p | 63 | 84 | 105 | 126 |
| 4K | 147 | 168 | 189 | 210 |
| Con video de entrada | 168 (hasta 1080p) · 252 (4K) |||

Personajes y voces: gratis. Continuar un video y Mejorar calidad: Kie no publica el precio exacto; el estudio muestra un aproximado (continuar) y el costo real al terminar.
Precios tomados de kie.ai en noviembre de 2026; si cambian, actualiza la tabla `PRICES` en `server.js`.

---

## Bueno saber

- **Tus videos se guardan solos** en la carpeta `videos/`. Kie los borra de sus servidores a los 14 días, pero tu copia queda. (Continuar y Mejorar calidad solo funcionan mientras el video siga en Kie.)
- **Los archivos que subes** Kie los borra a las 24 horas. Si reutilizas un video más viejo, vuelve a subirlos.
- **Puedes cerrar el navegador** mientras se crea un video: mientras la ventana negra siga abierta, el estudio lo sigue esperando y lo descarga.
- La ventana negra muestra los mensajes de error exactos de Kie (líneas `[Kie]`), útiles si algo falla.

---

## Para desarrolladores

Sin dependencias de servidor: solo Node 18+. La interfaz incluye `qrcode-generator` (MIT) en `public/vendor/`. El editor usa FFmpeg si está instalado (lo busca en el PATH, en WinGet o en `FFMPEG_PATH` del `.env`).

```
server.js        Servidor local: llave, cola, eventos en vivo (SSE), Kie, descargas, acceso LAN, exportar episodios (FFmpeg)
public/          Interfaz (HTML + CSS + JS sin frameworks); editor.js es el editor
data/            Historial, ajustes, personajes, recetas, episodios y música (JSON + data/music/) — no se sube a git
videos/          Videos descargados — no se sube a git
.env             Tu llave KIE_API_KEY y el puerto PORT — no se sube a git
```

**API de Kie usada:**
- `POST /api/v1/jobs/createTask` — modelos `google/gemini-omni-flash-1-2`, `google/gemini-omni-flash-1-1`, `google/gemini-omni-flash-1-2-extend`, `video/upscale`
- `GET  /api/v1/jobs/recordInfo?taskId=…` — estado y resultado
- `POST /api/v1/omni/character/create` y `/api/v1/omni/audio/create` — personajes y voces
- `POST /gemini-3-8-flash-openai/v1/chat/completions` — «Mejorar con IA»
- `GET  /api/v1/chat/credit` — créditos
- `POST https://kieai.redpandaai.co/api/file-stream-upload` — subir archivos

Documentación: [docs.kie.ai](https://docs.kie.ai)
