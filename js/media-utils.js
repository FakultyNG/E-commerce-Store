/* ==========================================================================
   WigsbyAmah — Shared media upload helpers (image compression, video
   chunking) used by admin/js/products-admin.js, admin/js/content-admin.js,
   and the storefront product-detail page.

   WHY THIS EXISTS: the Table API enforces a hard cap of roughly 2.0-2.1
   million characters per text/rich_text field. A raw 5MB photo becomes
   ~6.7MB (≈7,000,000 chars) once base64-encoded by FileReader — more than
   3x over that cap — so saving a product with an unmodified uploaded photo
   always failed with "Failed to create/update ...". Videos are far worse
   (a 25MB video ≈ 33,000,000 base64 chars).

   FIX:
   - Photos are compressed client-side (resized + re-encoded as JPEG) until
     their data URL fits safely under the field cap, then stored directly
     in one `product_media.url` field.
   - Videos cannot be meaningfully "compressed" in-browser, so the base64
     data is split into ~1.7M-char slices stored as separate rows in the
     `media_chunks` table (linked by `media_id`), and reassembled into a
     playable Blob URL on demand.
   ========================================================================== */

const MEDIA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5MB upload limit (raw file)
const MEDIA_MAX_VIDEO_BYTES = 25 * 1024 * 1024;  // 25MB upload limit (raw file)
const MEDIA_CHUNK_CHARS = 1700000;               // safely under the ~2.09M field cap
const MEDIA_IMAGE_TARGET_CHARS = 1500000;        // target compressed photo data-URL size

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This browser could not decode that image file.'));
    img.src = src;
  });
}

// Compresses/resizes an uploaded image file down to a JPEG data URL that
// safely fits within the Table API's per-field character cap. Tries
// progressively smaller dimensions/quality until it fits.
async function compressImageFile(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  let img;
  try {
    img = await loadImageEl(rawDataUrl);
  } catch (e) {
    throw new Error(`"${file.name}" couldn't be read as an image by your browser — try converting it to JPG or PNG first.`);
  }

  const attempts = [
    { maxDim: 1600, quality: 0.85 },
    { maxDim: 1600, quality: 0.7 },
    { maxDim: 1200, quality: 0.7 },
    { maxDim: 1200, quality: 0.55 },
    { maxDim: 900, quality: 0.55 },
    { maxDim: 700, quality: 0.5 },
    { maxDim: 500, quality: 0.45 }
  ];

  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', attempt.quality);
    if (dataUrl.length <= MEDIA_IMAGE_TARGET_CHARS) return dataUrl;
  }

  throw new Error(`"${file.name}" couldn't be compressed small enough to save. Try a smaller/simpler image.`);
}

// Converts a base64 data URL string into a Blob (used to turn reassembled
// video chunks into an efficient, playable Blob URL instead of a giant
// data: URI on the <video> element).
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function splitStringIntoChunks(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size));
  return chunks;
}

// Runs async tasks with limited concurrency (avoids firing 20+ simultaneous
// requests for a large video while still being much faster than serial).
async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// Splits a video File's base64 data URL into `media_chunks` rows linked to
// `mediaId`. `onProgress(done, total)` is called after each chunk saves.
async function saveVideoChunks(file, mediaId, onProgress) {
  const dataUrl = await readFileAsDataUrl(file);
  const parts = splitStringIntoChunks(dataUrl, MEDIA_CHUNK_CHARS);
  let done = 0;
  const tasks = parts.map((part, i) => async () => {
    await API.create('media_chunks', {
      id: mediaId + '_c' + i,
      media_id: mediaId,
      chunk_index: i,
      chunk_data: part
    });
    done++;
    if (onProgress) onProgress(done, parts.length);
  });
  await runWithConcurrency(tasks, 4);
  return parts.length;
}

async function deleteVideoChunks(mediaId) {
  let all = [];
  try { all = await API.listAll('media_chunks'); } catch (e) { return; }
  const mine = all.filter(c => c.media_id === mediaId);
  for (const c of mine) { try { await API.remove('media_chunks', c.id); } catch (e) {} }
}

// Reassembles a chunked video's chunks into a playable Blob URL.
async function loadVideoBlobUrl(mediaId) {
  const all = await API.listAll('media_chunks');
  const mine = all.filter(c => c.media_id === mediaId).sort((a, b) => a.chunk_index - b.chunk_index);
  if (!mine.length) return null;
  const dataUrl = mine.map(c => c.chunk_data).join('');
  const blob = dataUrlToBlob(dataUrl);
  return URL.createObjectURL(blob);
}
