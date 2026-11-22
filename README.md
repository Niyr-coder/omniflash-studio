# ⚡ OmniFlash Studio

Un estudio sencillo y bonito para crear videos con **Gemini Omni Flash** (modelos 1.2 y 1.1) usando la API de **[Kie.ai](https://kie.ai)**.

Funciona en tu computadora: escribes lo que quieres ver, presionas **Crear video** y en 1 a 3 minutos lo tienes listo, guardado en la carpeta `videos/`. Luego puedes unir tus escenas en episodios con el editor.

**¿Primera vez?** Sigue la [Guía de instalación](#guía-de-instalación) paso a paso.

---

## Guía de instalación

Toma unos 10 minutos la primera vez. Después, para usarlo, solo haces doble clic en `Iniciar.bat`.

### Qué necesitas

| | Para qué | ¿Obligatorio? |
|---|---|---|
| Una computadora con **Windows 10 u 11** (también funciona en Mac y Linux) | Donde corre el estudio | Sí |
| **Node.js** (gratis) | El programa que hace funcionar el estudio | Sí |
| Una cuenta en **[Kie.ai](https://kie.ai)** con créditos | Es quien crea los videos | Sí |
| **FFmpeg** (gratis) | Para exportar episodios en el editor | Solo si usas el editor |

### Paso 1 · Descarga el estudio

1. En la página del repositorio en GitHub, toca el botón verde **Code** y luego **Download ZIP**.
2. Busca el archivo en tu carpeta **Descargas**, haz clic derecho → **Extraer todo…** y elige una carpeta fácil de encontrar, por ejemplo `Documentos\omniflash-studio`.
3. Entra a la carpeta extraída: debes ver los archivos `Iniciar.bat`, `server.js` y la carpeta `public`.
   > Si ves otra carpeta adentro con el mismo nombre, entra a esa.

*(Si sabes usar git: `git clone https://github.com/Niyr-coder/omniflash-studio.git`.)*

### Paso 2 · Instala Node.js

1. Entra a [nodejs.org](https://nodejs.org) y descarga la versión **LTS** (el botón recomendado).
2. Abre el instalador y presiona **Siguiente** en todo, sin cambiar nada.
3. Para comprobarlo: abre **PowerShell** (búscalo en el menú Inicio), escribe `node -v` y presiona Enter. Si aparece un número como `v24.x.x`, está listo.

### Paso 3 · Crea tu cuenta de Kie y tu llave

1. Regístrate en [kie.ai](https://kie.ai) y recarga créditos (1 crédito = $0.005 USD; un video de prueba de 4 s en 360p cuesta 16 créditos, unos /usr/bin/bash.08).
2. Entra a [kie.ai/api-key](https://kie.ai/api-key) y copia tu **API Key** (es como una contraseña: no la compartas con nadie).
3. En esa misma página revisa los **permisos de la llave**. Lo más fácil es permitir todos los modelos. Si prefieres elegir, activa:
   - Gemini Omni Flash 1.2 y 1.1 (crear videos)
   - Gemini Omni Flash 1.2 Extend (continuar videos)
   - Video Upscale (mejorar calidad)
   - Gemini Omni Character y Audio (personajes y voces)
   - Gemini 3.8 Flash (para «Mejorar con IA»)

   Si falta alguno, el estudio te dice exactamente cuál activar.

### Paso 4 · Abre el estudio

1. En la carpeta del estudio, haz doble clic en **`Iniciar.bat`**.
   - Si Windows muestra **«Windows protegió su PC»**, toca **Más información → Ejecutar de todas formas** (pasa con archivos descargados de internet).
   - Si Windows pregunta por el **acceso a la red**, elige **Redes privadas** y **Permitir**.
2. Se abre una **ventana negra** y, sola, tu navegador con el estudio. Si no se abre, entra a **http://localhost:4747**.
3. **Deja abierta la ventana negra** mientras uses el estudio. Para cerrarlo, cierra esa ventana.

*(En Mac o Linux: abre una terminal en la carpeta y escribe `npm start`.)*

### Paso 5 · Conecta tu llave

La primera vez el estudio te pide tu llave: pégala y presiona **Conectar**. Se guarda en el archivo `.env` dentro de la carpeta, solo en tu computadora. Arriba a la derecha verás tus créditos.

Para probar barato: escribe una idea corta, abre los ajustes, elige **360p** y **4 s**, y presiona **Crear video**.

### Paso 6 (opcional) · Instala FFmpeg para el editor

Sirve para exportar los episodios que armes en el editor. Abre **PowerShell**, pega esto y presiona Enter:

```
winget install Gyan.FFmpeg
```

Cuando termine, cierra la ventana negra y abre `Iniciar.bat` otra vez. *(En Mac: `brew install ffmpeg`.)*

### Actualizar a una versión nueva

1. Descarga el ZIP nuevo y extráelo en otra carpeta.
2. Copia desde tu carpeta vieja a la nueva: el archivo **`.env`** (tu llave) y las carpetas **`data`** (proyectos, personajes, episodios) y **`videos`** (tus videos).
3. Abre `Iniciar.bat` de la carpeta nueva.

*(Con git: `git pull` y listo; tus datos no se tocan.)*

### Si algo no funciona

| Lo que ves | Qué hacer |
|---|---|
| «Necesitas Node.js…» al abrir `Iniciar.bat` | Instala Node.js (paso 2) y vuelve a abrirlo. Si ya lo instalaste, reinicia la computadora. |
| «El puerto 4747 ya está en uso» | El estudio ya está abierto en otra ventana negra: usa esa, o entra a http://localhost:4747. |
| La ventana negra se abre y se cierra sola | Abre PowerShell en la carpeta (clic derecho en un espacio vacío → *Abrir en Terminal*), escribe `node server.js` y lee el mensaje. |
| «Esa llave no parece válida» o «Kie no autorizó la solicitud» | Vuelve a copiarla de kie.ai/api-key, sin espacios. Puedes cambiarla en **Tu cuenta**. |
| «Tu llave no tiene permiso para…» | Activa ese modelo en kie.ai → API Key (paso 3). |
| «No te quedan créditos suficientes en Kie» | Recarga créditos en kie.ai. |
| El editor dice «Para exportar falta FFmpeg» | Instálalo (paso 6) y reinicia el estudio. |

En la ventana negra aparecen los mensajes exactos de Kie (líneas `[Kie]`), útiles si necesitas pedir ayuda.

**Privacidad:** cada persona usa **su propia llave** y gasta sus propios créditos. Tu llave, tus videos y tus proyectos se quedan en tu computadora y nunca se suben a GitHub.

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
