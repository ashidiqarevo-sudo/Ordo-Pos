/**
 * ORDO Universal Thermal Printer Module
 * =====================================
 *
 * One file, four lanes. No device sniffing is needed to make output correct:
 * every lane renders the receipt at a FIXED printer-native width, so a narrow
 * phone viewport can never squeeze the layout.
 *
 *   LANE 1 - Canvas Render   : DOM -> fixed-width (384 / 576 px) opaque white canvas.
 *   LANE 2 - RawBT (Android) : Canvas -> ONE `GS v 0` raster image -> base64 -> intent URL.
 *   LANE 3 - System Print    : Isolated iframe + thermal @page CSS -> window.print().
 *   LANE 4 - BLE Direct      : Canvas -> ESC/POS -> 200-byte paced GATT writes.
 *
 * Public API is backward compatible with the previous module.
 */
import { toCanvas } from 'html-to-image';

/* ========================================================================== */
/* Public types & constants                                                   */
/* ========================================================================== */

export interface BluetoothPrintOptions {
  /** Paper width in millimetres (58, 80, or custom). */
  paperWidthMm: number;
  onStatusChange?: StatusCallback;
}

export interface SystemPrintOptions {
  paperWidthMm: number;
  onComplete?: () => void;
  onError?: (err: Error) => void;
}

export interface SavedBluetoothPrinter {
  id: string;
  name: string;
}

export type StatusCallback = (status: string) => void;

export const STORAGE_KEY_BT_PRINTER = 'ordo_bluetooth_printer';
export const STORAGE_KEY_PRINT_METHOD = 'ordo_print_method';

/** Printhead width in dots for 203 DPI thermal printers. */
const DOTS_58MM = 384; // 48 bytes per raster row
const DOTS_80MM = 576; // 72 bytes per raster row

/** Pixels with luminance below this value become a black (heated) dot. */
const INK_THRESHOLD = 200;

/** BLE pacing: payload per write and pause between writes (cheap printer buffers are tiny). */
const BLE_CHUNK_SIZE = 200;
const BLE_FALLBACK_CHUNK_SIZE = 20; // ATT MTU 23 - 3 header bytes
const BLE_CHUNK_DELAY_MS = 20;

/** Common BLE thermal-printer GATT service UUIDs. */
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS
  '0000e0ff-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / Microchip
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const RAWBT_PACKAGE = 'ru.a402d.rawbtprinter';

/* ========================================================================== */
/* Small shared helpers                                                       */
/* ========================================================================== */

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function toError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string' && err) return new Error(err);
  return new Error(fallback);
}

/** Waits two animation frames so freshly inserted DOM is laid out AND painted. */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 50);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Resolves once every <img> under `root` has loaded or failed (max `timeoutMs` each). */
async function waitForImages(root: ParentNode, timeoutMs = 1500): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, timeoutMs);
        })
    )
  );
}

async function waitForFonts(doc: Document): Promise<void> {
  try {
    await doc.fonts?.ready;
  } catch {
    // Font loading API unavailable / failed -> continue with fallback fonts.
  }
}

/* ========================================================================== */
/* Environment & persistence                                                  */
/* ========================================================================== */

export function isBluetoothSupported(): boolean {
  return getBluetoothApi() !== null;
}

export function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
}

export function getSavedBluetoothPrinter(): SavedBluetoothPrinter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BT_PRINTER);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as SavedBluetoothPrinter).id === 'string' &&
      typeof (parsed as SavedBluetoothPrinter).name === 'string'
    ) {
      return parsed as SavedBluetoothPrinter;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBluetoothPrinter(printer: SavedBluetoothPrinter | null): void {
  try {
    if (printer) {
      localStorage.setItem(STORAGE_KEY_BT_PRINTER, JSON.stringify(printer));
    } else {
      localStorage.removeItem(STORAGE_KEY_BT_PRINTER);
    }
  } catch {
    // Storage blocked (private mode / quota) -> non-fatal.
  }
}

/**
 * Maps paper width to printhead dots. Always one of the two native widths,
 * both of which are exact multiples of 8 (required by `GS v 0`).
 */
export function getTargetDotsWidth(paperWidthMm: number): number {
  return paperWidthMm >= 70 ? DOTS_80MM : DOTS_58MM;
}

/* ========================================================================== */
/* LANE 1 - Canvas Render (universal, viewport-independent)                   */
/* ========================================================================== */

/**
 * High-contrast thermal stylesheet applied ONLY to the off-screen clone.
 * Scoped by `.ordo-thermal-clone` so the live UI is never affected.
 */
const THERMAL_CLONE_CSS = `
  .ordo-thermal-clone,
  .ordo-thermal-clone * {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    border-color: #000000 !important;
    text-shadow: none !important;
    box-shadow: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    mix-blend-mode: normal !important;
    max-width: none;
  }
  .ordo-thermal-clone {
    background: #FFFFFF !important;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif !important;
    line-height: 1.25 !important;
  }
  .ordo-thermal-clone div:not(.bg-black):not(.bg-zinc-950),
  .ordo-thermal-clone span,
  .ordo-thermal-clone p {
    background-color: transparent !important;
  }
  .ordo-thermal-clone span,
  .ordo-thermal-clone p,
  .ordo-thermal-clone div { font-weight: 600; }
  .ordo-thermal-clone .font-normal { font-weight: 500 !important; }
  .ordo-thermal-clone .font-bold,
  .ordo-thermal-clone .font-black { font-weight: 900 !important; }
  .ordo-thermal-clone .border-dashed {
    border-bottom-style: dashed !important;
    border-bottom-width: 1px !important;
  }
  .ordo-thermal-clone .text-\\[8px\\],
  .ordo-thermal-clone .text-\\[8\\.5px\\] { font-size: 9.5px !important; line-height: 1.15 !important; }
  .ordo-thermal-clone .text-\\[10px\\] { font-size: 10.5px !important; }
  .ordo-thermal-clone .text-\\[11px\\] { font-size: 11px !important; }
  .ordo-thermal-clone .text-xs { font-size: 12px !important; }
  .ordo-thermal-clone img {
    max-width: 100% !important;
    height: auto !important;
    filter: grayscale(100%) contrast(140%) !important;
  }
`;

/** Forces a fixed, non-shrinkable width on an element. */
function lockWidth(el: HTMLElement, widthPx: number): void {
  el.style.boxSizing = 'border-box';
  el.style.width = `${widthPx}px`;
  el.style.minWidth = `${widthPx}px`;
  el.style.maxWidth = `${widthPx}px`;
  el.style.flex = 'none';
}

/**
 * Builds an off-screen staging area whose width is LOCKED to the printhead width.
 *
 * Why this fixes the "mie lidi" (thin strip) bug on phones:
 * the clone no longer inherits its width from the narrow modal / viewport.
 * Host, capture node and clone all carry an absolute pixel width with
 * min-width = max-width, so nothing can shrink them.
 *
 * Only the HOST is moved off-screen. The CAPTURE node stays `position: static`
 * at (0,0) inside it - otherwise html-to-image would copy the off-screen offset
 * into the SVG and produce a blank image.
 */
function createStaging(source: HTMLElement, widthPx: number, paperWidthMm: number) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-20000px',
    top: '0',
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: '-1',
    contain: 'layout style',
  } satisfies Partial<CSSStyleDeclaration>);
  lockWidth(host, widthPx);

  const capture = document.createElement('div');
  Object.assign(capture.style, {
    position: 'static',
    margin: '0',
    padding: '0',
    background: '#FFFFFF',
    color: '#000000',
  } satisfies Partial<CSSStyleDeclaration>);
  lockWidth(capture, widthPx);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add('ordo-thermal-clone');
  clone.removeAttribute('id');
  lockWidth(clone, widthPx);
  clone.style.margin = '0';
  clone.style.background = '#FFFFFF';
  clone.style.padding = paperWidthMm >= 70 ? '10px 8px' : '6px 4px';

  const style = document.createElement('style');
  style.textContent = THERMAL_CLONE_CSS;

  capture.append(style, clone);
  host.appendChild(capture);
  document.body.appendChild(host);

  return { capture, destroy: () => host.remove() };
}

/** Returns true if the canvas contains at least one pixel that will print black. */
function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < INK_THRESHOLD) {
      return true;
    }
  }
  return false;
}

/** Copies `source` onto a brand-new fully opaque #FFFFFF canvas of exactly `width` px. */
function flattenOntoWhite(source: HTMLCanvasElement, width: number): HTMLCanvasElement {
  const scale = width / source.width;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = Math.max(1, Math.round(source.height * scale));

  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Gagal membuat konteks canvas 2D.');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = scale !== 1;
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/**
 * LANE 1: Renders a receipt element into an opaque white canvas whose width is
 * exactly the printhead width (384 px for 58 mm, 576 px for 80 mm).
 * Throws if the result is blank so no paper is wasted.
 */
export async function renderReceiptToCanvas(
  receiptElement: HTMLElement,
  paperWidthMm: number
): Promise<HTMLCanvasElement> {
  const width = getTargetDotsWidth(paperWidthMm);
  const staging = createStaging(receiptElement, width, paperWidthMm);

  try {
    await waitForFonts(document);
    await waitForImages(staging.capture);
    await waitForPaint();

    const height = Math.max(1, Math.ceil(staging.capture.scrollHeight));

    const renderOnce = async (skipFonts: boolean): Promise<HTMLCanvasElement> => {
      const raw = await toCanvas(staging.capture, {
        backgroundColor: '#FFFFFF',
        pixelRatio: 1,
        width,
        height,
        canvasWidth: width,
        canvasHeight: height,
        skipFonts,
        cacheBust: false,
        // Reset the cloned ROOT inside the SVG foreignObject to (0,0) at the locked width.
        style: {
          position: 'static',
          left: '0',
          top: '0',
          transform: 'none',
          margin: '0',
          width: `${width}px`,
          minWidth: `${width}px`,
          maxWidth: `${width}px`,
          backgroundColor: '#FFFFFF',
        },
      });
      return flattenOntoWhite(raw, width);
    };

    let canvas: HTMLCanvasElement;
    try {
      canvas = await renderOnce(false);
    } catch {
      // Web-font embedding can fail on CORS -> retry with system fonts.
      canvas = await renderOnce(true);
    }

    // WebKit / Android WebView often return an empty first frame -> retry once.
    if (!canvasHasInk(canvas)) {
      await waitForPaint();
      canvas = await renderOnce(true);
    }

    if (!canvasHasInk(canvas)) {
      throw new Error(
        'Render nota menghasilkan gambar kosong. Pencetakan dibatalkan agar kertas tidak terbuang. Coba lagi atau gunakan "Sistem Bawaan".'
      );
    }
    return canvas;
  } finally {
    staging.destroy();
  }
}

/* ========================================================================== */
/* ESC/POS raster encoder (shared by RawBT and BLE)                           */
/* ========================================================================== */

/**
 * Encodes a canvas as a single ESC/POS `GS v 0` raster job.
 *
 *   ESC @ | ESC a 0 | GS v 0 m xL xH yL yH | bitmap | LF x4 | GS V B 0
 *
 * - Width is padded up to a multiple of 8 (extra columns stay white).
 * - xL/xH = bytes per row (little endian), yL/yH = rows (little endian).
 * - The bitmap is EXACTLY widthBytes * height bytes, so the printer can never
 *   read past the image into the footer ("byte shift / alien text").
 * - Bit = 1 -> black dot. MSB = leftmost pixel.
 */
function encodeCanvasToEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal membaca konteks canvas 2D.');

  const srcWidth = canvas.width;
  const height = canvas.height;
  if (srcWidth <= 0 || height <= 0) throw new Error('Ukuran gambar nota tidak valid.');
  if (height > 0xffff) throw new Error('Nota terlalu panjang untuk satu gambar raster.');

  const widthBytes = Math.ceil(srcWidth / 8);
  const rgba = ctx.getImageData(0, 0, srcWidth, height).data;

  // 1. Pack 1-bit bitmap.
  const bitmap = new Uint8Array(widthBytes * height); // zero = white
  for (let y = 0; y < height; y++) {
    const srcRow = y * srcWidth * 4;
    const dstRow = y * widthBytes;
    for (let x = 0; x < srcWidth; x++) {
      const i = srcRow + x * 4;
      const alpha = rgba[i + 3] / 255;
      // Composite on white so transparent pixels can never become black.
      const lum =
        (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) * alpha + 255 * (1 - alpha);
      if (lum < INK_THRESHOLD) {
        bitmap[dstRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  // 2. Assemble command stream with a pre-computed exact length.
  const header = new Uint8Array([
    0x1b, 0x40, //                   ESC @   : initialise
    0x1b, 0x61, 0x00, //             ESC a 0 : left align
    0x1d, 0x76, 0x30, 0x00, //       GS v 0 m=0 (normal density)
    widthBytes & 0xff, //            xL
    (widthBytes >> 8) & 0xff, //     xH
    height & 0xff, //                yL
    (height >> 8) & 0xff, //         yH
  ]);
  const footer = new Uint8Array([
    0x0a, 0x0a, 0x0a, 0x0a, //       feed 4 lines
    0x1d, 0x56, 0x42, 0x00, //       GS V B 0 : partial cut
  ]);

  const job = new Uint8Array(header.length + bitmap.length + footer.length);
  job.set(header, 0);
  job.set(bitmap, header.length);
  job.set(footer, header.length + bitmap.length);
  return job;
}

/** Renders a receipt element straight to ESC/POS raster bytes (Lane 1 + encoder). */
export async function renderReceiptToEscPosRaster(
  receiptElement: HTMLElement,
  paperWidthMm: number
): Promise<Uint8Array> {
  const canvas = await renderReceiptToCanvas(receiptElement, paperWidthMm);
  return encodeCanvasToEscPos(canvas);
}

/** Binary -> standard base64, chunked to stay clear of call-stack limits. */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/* ========================================================================== */
/* LANE 2 - RawBT (Android, Bluetooth Classic / SPP / USB)                    */
/* ========================================================================== */

/**
 * LANE 2: Sends the receipt to the RawBT Android app as ONE raster image.
 * Base64 is wrapped in `encodeURIComponent` so '+', '/' and '=' survive the intent URL.
 */
export async function printReceiptViaRawBt(
  receiptElement: HTMLElement,
  paperWidthMm: number,
  onStatusChange?: StatusCallback
): Promise<void> {
  onStatusChange?.('Merender nota untuk printer thermal...');
  const job = await renderReceiptToEscPosRaster(receiptElement, paperWidthMm);

  onStatusChange?.('Meneruskan nota ke aplikasi RawBT...');
  const payload = encodeURIComponent(bytesToBase64(job));
  const intentUrl = `intent:base64,${payload}#Intent;scheme=rawbt;package=${RAWBT_PACKAGE};end;`;

  launchUrl(intentUrl);
  onStatusChange?.('Nota berhasil diteruskan ke RawBT!');
}

/** Opens a custom-scheme URL via a synthetic anchor click, with location fallback. */
function launchUrl(url: string): void {
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => anchor.remove(), 1000);
  } catch {
    window.location.href = url;
  }
}

/* ========================================================================== */
/* LANE 3 - System Print (PC / browser print dialog)                          */
/* ========================================================================== */

function buildPrintDocument(receiptHtml: string, paperWidthMm: number): string {
  const inheritedStyles = Array.from(
    document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]')
  )
    .map((el) => el.outerHTML)
    .join('\n');

  const padding = paperWidthMm >= 70 ? '3mm 2mm' : '2mm 1.5mm';
  const fontSize = paperWidthMm >= 70 ? '11px' : '10px';

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Nota</title>
  ${inheritedStyles}
  <style>
    @page {
      size: ${paperWidthMm}mm auto;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: ${paperWidthMm}mm !important;
      min-width: ${paperWidthMm}mm !important;
      max-width: ${paperWidthMm}mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: #000000 !important;
      overflow: visible !important;
    }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
      font-size: ${fontSize} !important;
      line-height: 1.25 !important;
    }
    #ordo-print-root {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: ${padding} !important;
      background: white !important;
      color: #000000 !important;
      box-sizing: border-box !important;
    }
    #ordo-print-root > * {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    img { max-width: 100% !important; height: auto !important; }
  </style>
</head>
<body><div id="ordo-print-root">${receiptHtml}</div></body>
</html>`;
}

/**
 * LANE 3: Prints ONLY the receipt through an isolated hidden iframe.
 * The app UI is never part of the printed document, and the page is sized to
 * the thermal roll width with an exact height (no trailing blank page).
 */
export function printReceiptViaSystem(
  receiptElement: HTMLElement,
  options: SystemPrintOptions
): Promise<void> {
  const { paperWidthMm, onComplete, onError } = options;
  const IFRAME_ID = 'ordo-system-print-frame';

  return new Promise<void>((resolve, reject) => {
    document.getElementById(IFRAME_ID)?.remove();

    const iframe = document.createElement('iframe');
    const fail = (err: unknown) => {
      const error = toError(err, 'Gagal membuka dialog cetak.');
      iframe.remove();
      onError?.(error);
      reject(error);
    };

    iframe.id = IFRAME_ID;
    iframe.title = 'Receipt Print Frame';
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: `${paperWidthMm}mm`,
      height: '0',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1',
    } satisfies Partial<CSSStyleDeclaration>);

    iframe.addEventListener(
      'load',
      async () => {
        try {
          const win = iframe.contentWindow;
          const doc = iframe.contentDocument;
          if (!win || !doc) throw new Error('Dokumen cetak tidak dapat diakses.');

          await waitForFonts(doc);
          await waitForImages(doc);

          const cleanup = () => setTimeout(() => iframe.remove(), 500);
          win.addEventListener('afterprint', cleanup, { once: true });
          setTimeout(() => iframe.remove(), 60_000); // safety net if afterprint never fires

          win.focus();
          win.print();

          onComplete?.();
          resolve();
        } catch (err) {
          fail(err);
        }
      },
      { once: true }
    );

    try {
      iframe.srcdoc = buildPrintDocument(receiptElement.innerHTML, paperWidthMm);
      document.body.appendChild(iframe);
    } catch (err) {
      fail(err);
    }
  });
}

/* ========================================================================== */
/* LANE 4 - BLE Direct (Web Bluetooth GATT)                                   */
/* ========================================================================== */

/* Minimal Web Bluetooth typings (avoids a dependency on @types/web-bluetooth). */
interface BleCharacteristic {
  readonly properties: { readonly write: boolean; readonly writeWithoutResponse: boolean };
  writeValue(value: Uint8Array): Promise<void>;
  writeValueWithResponse?(value: Uint8Array): Promise<void>;
  writeValueWithoutResponse?(value: Uint8Array): Promise<void>;
}
interface BleService {
  getCharacteristics(): Promise<BleCharacteristic[]>;
}
interface BleGattServer {
  readonly connected: boolean;
  connect(): Promise<BleGattServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BleService>;
  getPrimaryServices(): Promise<BleService[]>;
}
interface BleDevice {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BleGattServer;
}
interface BleApi {
  requestDevice(options: { acceptAllDevices: boolean; optionalServices: string[] }): Promise<BleDevice>;
  getDevices?(): Promise<BleDevice[]>;
}

/** Active device for the current page session. */
let activeDevice: BleDevice | null = null;

function getBluetoothApi(): BleApi | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { bluetooth?: BleApi }).bluetooth ?? null;
}

function requireBluetoothApi(): BleApi {
  const api = getBluetoothApi();
  if (!api) {
    throw new Error(
      'Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge, atau pilih "Bluetooth (RawBT)" / "Sistem Bawaan".'
    );
  }
  return api;
}

export function clearSavedBluetoothPrinter(): void {
  try {
    if (activeDevice?.gatt?.connected) activeDevice.gatt.disconnect();
  } catch {
    // Already disconnected.
  }
  activeDevice = null;
  saveBluetoothPrinter(null);
}

/**
 * Explicit user-gesture pairing (opens the browser device chooser).
 * Use for "Hubungkan Printer", "Ganti Printer", and "Hubungkan Kembali".
 */
export async function pairBluetoothPrinter(
  onStatusChange?: StatusCallback
): Promise<SavedBluetoothPrinter> {
  const api = requireBluetoothApi();

  onStatusChange?.('Mencari printer Bluetooth BLE...');
  let device: BleDevice;
  try {
    device = await api.requestDevice({ acceptAllDevices: true, optionalServices: PRINTER_SERVICES });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      throw new Error('Pencarian printer dibatalkan.');
    }
    throw new Error(`Gagal mendeteksi printer: ${toError(err, 'unknown').message}`);
  }

  if (!device.gatt) {
    throw new Error('Perangkat yang dipilih tidak memiliki antarmuka GATT (bukan printer BLE).');
  }

  onStatusChange?.('Menghubungkan ke printer...');
  try {
    if (!device.gatt.connected) await device.gatt.connect();
  } catch (err) {
    throw new Error(`Printer tidak dapat dihubungkan: ${toError(err, 'unknown').message}`);
  }

  activeDevice = device;
  const info: SavedBluetoothPrinter = {
    id: device.id || 'bt-printer',
    name: device.name || 'Printer Bluetooth',
  };
  saveBluetoothPrinter(info);
  return info;
}

/**
 * Returns a previously permitted device WITHOUT showing the chooser.
 * Throws `PRINTER_RECONNECT_NEEDED` (saved but not reachable) or
 * `PRINTER_NOT_PAIRED` (nothing saved). The UI relies on these exact messages.
 */
export async function getBluetoothDeviceWithoutDiscovery(): Promise<BleDevice> {
  if (activeDevice) return activeDevice;

  const saved = getSavedBluetoothPrinter();
  const api = getBluetoothApi();

  if (saved && api?.getDevices) {
    try {
      const devices = await api.getDevices();
      const match = devices.find((d) => d.id === saved.id) ?? devices[0];
      if (match) {
        activeDevice = match;
        return match;
      }
    } catch {
      // getDevices() not permitted -> fall through.
    }
  }

  throw new Error(saved ? 'PRINTER_RECONNECT_NEEDED' : 'PRINTER_NOT_PAIRED');
}

const isWritable = (c: BleCharacteristic): boolean =>
  c.properties.write || c.properties.writeWithoutResponse;

/** Finds the first writable characteristic: known printer services first, then any service. */
async function findWritableCharacteristic(server: BleGattServer): Promise<BleCharacteristic | null> {
  for (const uuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const found = (await service.getCharacteristics()).find(isWritable);
      if (found) return found;
    } catch {
      // Service not present on this printer.
    }
  }

  try {
    for (const service of await server.getPrimaryServices()) {
      const found = (await service.getCharacteristics()).find(isWritable);
      if (found) return found;
    }
  } catch {
    // Enumeration not permitted.
  }
  return null;
}

/** Picks the most reliable write primitive the characteristic supports. */
function createWriter(c: BleCharacteristic): (chunk: Uint8Array) => Promise<void> {
  if (c.properties.write && c.writeValueWithResponse) {
    return (chunk) => c.writeValueWithResponse!(chunk); // ACK = natural flow control
  }
  if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) {
    return (chunk) => c.writeValueWithoutResponse!(chunk);
  }
  return (chunk) => c.writeValue(chunk);
}

/**
 * Streams bytes in 200-byte chunks with a short pause between writes so cheap
 * printer buffers never overflow. If the link rejects 200-byte packets (small
 * MTU), the SAME offset is retried at 20 bytes - no byte is ever skipped.
 */
async function streamToCharacteristic(c: BleCharacteristic, data: Uint8Array): Promise<void> {
  const write = createWriter(c);
  let chunkSize = BLE_CHUNK_SIZE;
  let offset = 0;

  while (offset < data.length) {
    const chunk = data.subarray(offset, offset + chunkSize);
    try {
      await write(chunk);
    } catch (err) {
      if (chunkSize > BLE_FALLBACK_CHUNK_SIZE) {
        chunkSize = BLE_FALLBACK_CHUNK_SIZE;
        continue;
      }
      throw toError(err, 'Pengiriman data ke printer gagal.');
    }
    offset += chunk.length;
    await sleep(BLE_CHUNK_DELAY_MS);
  }
}

/**
 * LANE 4: Prints via Web Bluetooth (BLE). Never opens the chooser - call
 * `pairBluetoothPrinter()` first if `PRINTER_NOT_PAIRED` / `PRINTER_RECONNECT_NEEDED` is thrown.
 */
export async function printReceiptViaBluetooth(
  receiptElement: HTMLElement,
  options: BluetoothPrintOptions
): Promise<void> {
  const { paperWidthMm, onStatusChange } = options;
  requireBluetoothApi();

  const device = await getBluetoothDeviceWithoutDiscovery();
  if (!device.gatt) throw new Error('Printer tidak memiliki antarmuka GATT.');

  onStatusChange?.('Menghubungkan ke printer...');
  let server: BleGattServer;
  try {
    server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  } catch {
    activeDevice = null;
    throw new Error('Printer tidak dapat dihubungkan.');
  }

  const characteristic = await findWritableCharacteristic(server);
  if (!characteristic) {
    throw new Error(
      'Printer ini tidak menyediakan karakteristik tulis BLE (kemungkinan Bluetooth Classic/SPP). Gunakan "Bluetooth (RawBT)" atau "Sistem Bawaan".'
    );
  }

  onStatusChange?.('Merender nota untuk printer thermal...');
  const job = await renderReceiptToEscPosRaster(receiptElement, paperWidthMm);

  onStatusChange?.('Mengirim data nota ke printer...');
  await streamToCharacteristic(characteristic, job);

  onStatusChange?.('Pencetakan selesai!');
}
