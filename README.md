# ⚡ OmniFlash Studio

Un estudio sencillo y bonito para crear videos con **Gemini Omni Flash** (modelo `google/gemini-omni-flash-1-1`) usando la API de **[Kie.ai](https://kie.ai)**.

Funciona en tu computadora: escribes lo que quieres ver, presionas **Crear video** y en 1 a 3 minutos lo tienes listo, guardado en la carpeta `videos/`.

---

## Cómo empezar (2 minutos)

1. **Instala Node.js** (solo la primera vez): descárgalo en [nodejs.org](https://nodejs.org), versión LTS.
2. **Abre el estudio**: haz doble clic en **`Iniciar.bat`**. Se abre solo en tu navegador.
   *(O desde una terminal: `npm start` y entra a http://localhost:4747)*
3. **Conecta tu cuenta de Kie**: la primera vez te pide tu llave.
   - Entra a [kie.ai/api-key](https://kie.ai/api-key) y copia tu **API Key**.
   - Pégala en el estudio y presiona **Conectar**.
   - Se guarda en el archivo `.env` de esta carpeta, solo en tu computadora.

Listo. Deja abierta la ventana negra mientras uses el estudio (para cerrarlo: `Ctrl + C` o cierra la ventana).

---

## Las 4 formas de crear

| Modo | Para qué sirve |
|---|---|
| **Texto** | Describes la escena y la IA la crea desde cero. |
| **Imágenes** | Subes de 1 a 7 fotos (un personaje, un producto, un lugar) y el video las usa como referencia. |
| **Inicio y fin** | Eliges la imagen con la que empieza el video y, si quieres, con la que termina. La IA crea lo que pasa en medio. |
| **Video** | Subes un video corto (máx. 30 s) y eliges un tramo de hasta 10 s para transformarlo o continuarlo. Puedes añadir hasta 5 imágenes. |

**Ajustes:**
- **Formato:** horizontal (16:9) o vertical (9:16, ideal para TikTok, Reels y Shorts).
- **Duración:** 4, 6, 8 o 10 segundos (en modo Video la elige la IA).
- **Calidad:** 360p (borrador rápido), 720p, 1080p o 4K.
- **Semilla** (opciones avanzadas): si repites el mismo número con la misma descripción, sale un resultado parecido.

**Cola de videos:**
- Pide todos los videos que quieras seguidos: se forman en una **cola** y se crean solos, en orden.
- **Versiones (1 a 4):** crea varias versiones de la misma idea de una vez.
- **A la vez:** cuántos videos se crean al mismo tiempo (los demás esperan su turno).
- **Pausar / Reanudar:** detiene los envíos; los que ya se están creando terminan igual.
- Quitar un video de la cola no cuesta nada. Si te quedas sin créditos, la cola se pausa sola.
- Cada video muestra en qué paso va (en cola, enviando, generando, guardando), cuánto lleva y cuánto falta aproximadamente. El cálculo aprende de lo que tardaron tus videos anteriores.
- Todo se actualiza solo, sin recargar, incluso si tienes el estudio abierto en dos pestañas. El punto verde arriba indica que está conectado.

**Atajos útiles:**
- `Ctrl + Enter` crea el video.
- `Ctrl + V` pega una imagen copiada directamente.
- Arrastra archivos sobre las zonas de subida.
- **Dame una idea** escribe un ejemplo; los botones de estilo (Cine, Anime, Drone…) añaden detalles a tu descripción.
- Pasa el mouse sobre cualquier botón o sobre los **?** para ver qué hace, en palabras sencillas.
- En cada video: el **lápiz** lleva la idea al panel para cambiarla; las **flechas** reintentan uno que falló.
- En el visor grande, usa **← →** para pasar de un video a otro.
- Lo que subes y lo que escribes se guarda aunque recargues la página.

---

## ¿Cuánto cuesta?

Kie cobra en créditos (1 crédito = $0.005 USD). El botón **Crear video** te muestra el precio antes de gastar.

| Calidad | 4 s | 6 s | 8 s | 10 s |
|---|---|---|---|---|
| 360p / 720p / 1080p | 63 | 84 | 105 | 126 |
| 4K | 147 | 168 | 189 | 210 |
| Con video de entrada | 168 (hasta 1080p) · 252 (4K) |||

Precios tomados de [kie.ai/gemini-omni-1-1-flash](https://kie.ai/gemini-omni-1-1-flash) en noviembre de 2026; revisa esa página si cambian (y la tabla `PRICES` en `server.js`).

---

## Bueno saber

- **Tus videos se guardan solos** en la carpeta `videos/` (botón de carpeta arriba a la derecha). Kie los borra de sus servidores a los 14 días, pero tu copia queda.
- **Los archivos que subes** (fotos y videos de referencia) Kie los borra a las 24 horas. Si reutilizas un video más viejo, vuelve a subirlos.
- **Puedes cerrar el navegador** mientras se crea un video: mientras la ventana negra siga abierta, el estudio lo sigue esperando y lo descarga.
- Si Kie rechaza un video por sus reglas de contenido, cambia la descripción o la imagen e intenta otra vez.

---

## Para desarrolladores

Sin dependencias: solo Node 18+.

```
server.js        Servidor local: guarda la llave, habla con Kie, vigila tareas y descarga videos
public/          Interfaz (HTML + CSS + JS sin frameworks)
data/            Historial local (history.json) — no se sube a git
videos/          Videos descargados — no se sube a git
.env             Tu llave KIE_API_KEY y el puerto PORT — no se sube a git
```

**API de Kie usada:**
- `POST https://api.kie.ai/api/v1/jobs/createTask` — crear el video
- `GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=…` — estado y resultado (`resultJson.resultUrls[0]`)
- `GET  https://api.kie.ai/api/v1/chat/credit` — créditos disponibles
- `POST https://kieai.redpandaai.co/api/file-stream-upload` — subir imágenes y videos

Documentación: [docs.kie.ai/market/google/gemini-omni-flash-1-1](https://docs.kie.ai/market/google/gemini-omni-flash-1-1)
