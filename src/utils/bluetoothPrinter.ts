/**
 * Web Bluetooth Direct ESC/POS & Android Classic/SPP Bridge Thermal Printing Utility.
 *
 * Supports:
 * 1. Direct Web Bluetooth (BLE / GATT Profile) with persistent device caching
 * 2. Android Bluetooth Classic/SPP Bridge via RawBT intent protocol
 */
import { toCanvas } from 'html-to-image';

export interface BluetoothPrintOptions {
  paperWidthMm: number; // 58, 80, or custom
  onStatusChange?: (status: string) => void;
}

export interface SavedBluetoothPrinter {
  id: string;
  name: string;
}

export const STORAGE_KEY_BT_PRINTER = 'ordo_bluetooth_printer';
export const STORAGE_KEY_PRINT_METHOD = 'ordo_print_method';

// Common Bluetooth Low Energy (BLE) Thermal Printer Service UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS
  '0000e0ff-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

// In-memory active BluetoothDevice reference for the current web session
let cachedBluetoothDevice: any = null;

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
}

export function getSavedBluetoothPrinter(): SavedBluetoothPrinter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BT_PRINTER);
    if (!raw) return null;
    return JSON.parse(raw);
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
    // LocalStorage failsafe
  }
}

export function clearSavedBluetoothPrinter(): void {
  if (cachedBluetoothDevice?.gatt?.connected) {
    try {
      cachedBluetoothDevice.gatt.disconnect();
    } catch {
      // ignore
    }
  }
  cachedBluetoothDevice = null;
  saveBluetoothPrinter(null);
}

/**
 * Explicit user-gesture device discovery (requestDevice) for BLE.
 * Only triggered on:
 * 1. Initial connection ("Hubungkan Printer")
 * 2. Changing printer ("Ganti Printer")
 * 3. Re-pairing when connection lost/revoked ("Hubungkan Kembali")
 */
export async function pairBluetoothPrinter(
  onStatusChange?: (status: string) => void
): Promise<SavedBluetoothPrinter> {
  if (!isBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth tidak didukung pada browser/perangkat ini. Silakan gunakan Google Chrome/Microsoft Edge atau gunakan opsi Print Sistem / Android Bridge.'
    );
  }

  onStatusChange?.('Mencari printer Bluetooth BLE...');
  let device: any;
  try {
    device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      throw new Error('Pencarian printer dibatalkan.');
    }
    throw new Error(`Gagal mendeteksi printer: ${err.message || err}`);
  }

  if (!device || !device.gatt) {
    throw new Error('Perangkat Bluetooth yang dipilih tidak memiliki antarmuka GATT.');
  }

  onStatusChange?.('Menghubungkan ke printer...');
  try {
    if (!device.gatt.connected) {
      await device.gatt.connect();
    }
  } catch (connErr: any) {
    throw new Error(`Printer tidak dapat dihubungkan: ${connErr.message || connErr}`);
  }

  cachedBluetoothDevice = device;
  const printerInfo: SavedBluetoothPrinter = {
    id: device.id || 'bt-printer',
    name: device.name || 'Printer Bluetooth',
  };
  saveBluetoothPrinter(printerInfo);

  return printerInfo;
}

/**
 * Attempts to retrieve an active or previously permitted BluetoothDevice WITHOUT triggering discovery scan.
 */
export async function getBluetoothDeviceWithoutDiscovery(): Promise<any> {
  if (cachedBluetoothDevice) {
    return cachedBluetoothDevice;
  }

  const saved = getSavedBluetoothPrinter();

  if (
    typeof navigator !== 'undefined' &&
    'bluetooth' in navigator &&
    typeof (navigator as any).bluetooth?.getDevices === 'function'
  ) {
    try {
      const devices = await (navigator as any).bluetooth.getDevices();
      if (devices && devices.length > 0) {
        const match = saved?.id ? devices.find((d: any) => d.id === saved.id) : null;
        const target = match || (saved ? devices[0] : null);
        if (target) {
          cachedBluetoothDevice = target;
          return target;
        }
      }
    } catch {
      // getDevices not permitted or failed
    }
  }

  if (saved) {
    throw new Error('PRINTER_RECONNECT_NEEDED');
  } else {
    throw new Error('PRINTER_NOT_PAIRED');
  }
}

/**
 * Calculates target dot width according to standard 203 DPI thermal printheads.
 * 58mm: 384 dots (48 bytes per line)
 * 80mm: 576 dots (72 bytes per line)
 * Custom: proportional multiple of 8
 */
export function getTargetDotsWidth(paperWidthMm: number): number {
  if (paperWidthMm <= 60) {
    return 384;
  }
  if (paperWidthMm >= 76) {
    return 576;
  }
  const dots = Math.round((paperWidthMm / 58) * 384);
  return Math.max(384, Math.floor(dots / 8) * 8);
}

/** Luminance threshold: pixels darker than this become a BLACK dot (bit = 1). */
const RASTER_THRESHOLD = 200;

/** Waits for the browser to complete layout + paint of freshly inserted DOM. */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 50);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Draws any canvas onto a brand-new, fully opaque solid-white canvas of the exact target width.
 * Guarantees there are no transparent pixels left for the thresholding step.
 */
function flattenOntoWhite(source: HTMLCanvasElement, targetWidth: number): HTMLCanvasElement {
  const scale = targetWidth / source.width;
  const out = document.createElement('canvas');
  out.width = targetWidth;
  out.height = Math.max(1, Math.round(source.height * scale));
  const ctx = out.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings);
  if (!ctx) {
    throw new Error('Gagal mendapatkan 2D context canvas.');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = scale !== 1;
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/** Counts pixels that will become black dots. Used to detect a blank render before wasting paper. */
function countDarkPixels(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < RASTER_THRESHOLD) dark++;
  }
  return dark;
}

/**
 * Renders HTML receipt element directly to 1-bit monochrome ESC/POS raster data.
 *
 * BLANK-PRINT FIX:
 * Previously the node passed to html-to-image was the offscreen wrapper itself
 * (`position: fixed; left: -99999px`). html-to-image copies the root node's computed style
 * into the SVG <foreignObject>, so the receipt content was drawn 99999px outside the canvas
 * and only the white backgroundColor remained -> 100% white image / blank paper.
 *
 * Now:
 * 1. An offscreen HOST div is positioned off-screen, but the CAPTURED node inside it is
 *    `position: static` at (0,0), and positioning is also force-reset via the `style` option.
 * 2. Output is flattened onto an opaque #FFFFFF canvas.
 * 3. Text/borders are forced to pure #000000.
 * 4. Render is verified to contain dark pixels (retried once; WebKit often returns blank on 1st pass).
 */
export async function renderReceiptToEscPosRaster(
  receiptElement: HTMLElement,
  paperWidthMm: number
): Promise<Uint8Array> {
  const targetDotsWidth = getTargetDotsWidth(paperWidthMm);

  // 1a. Offscreen HOST (only this element is moved off-screen; it is NOT captured)
  const hostContainer = document.createElement('div');
  hostContainer.id = 'ordo-thermal-raster-host';
  hostContainer.setAttribute('aria-hidden', 'true');
  hostContainer.style.position = 'fixed';
  hostContainer.style.left = '-10000px';
  hostContainer.style.top = '0';
  hostContainer.style.width = `${targetDotsWidth}px`;
  hostContainer.style.overflow = 'visible';
  hostContainer.style.pointerEvents = 'none';
  hostContainer.style.zIndex = '-1';

  // 1b. CAPTURE node: static, in normal flow, solid white background, exact dot width
  const stagingWrapper = document.createElement('div');
  stagingWrapper.id = 'ordo-thermal-raster-staging';
  stagingWrapper.style.position = 'static';
  stagingWrapper.style.width = `${targetDotsWidth}px`;
  stagingWrapper.style.maxWidth = `${targetDotsWidth}px`;
  stagingWrapper.style.minWidth = `${targetDotsWidth}px`;
  stagingWrapper.style.backgroundColor = '#FFFFFF';
  stagingWrapper.style.color = '#000000';
  stagingWrapper.style.margin = '0';
  stagingWrapper.style.padding = '0';
  stagingWrapper.style.opacity = '1';
  stagingWrapper.style.boxSizing = 'border-box';

  // 2. Clone receipt content
  const receiptClone = receiptElement.cloneNode(true) as HTMLElement;
  receiptClone.classList.add('thermal-receipt-clone');
  receiptClone.style.width = `${targetDotsWidth}px`;
  receiptClone.style.maxWidth = `${targetDotsWidth}px`;
  receiptClone.style.minWidth = `${targetDotsWidth}px`;
  receiptClone.style.backgroundColor = '#ffffff';
  receiptClone.style.color = '#000000';
  receiptClone.style.boxSizing = 'border-box';
  receiptClone.style.padding = paperWidthMm <= 60 ? '6px 4px' : '10px 8px';

  // 3. Inject strict high-contrast thermal CSS rules into staging container
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .thermal-receipt-clone,
    .thermal-receipt-clone * {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      border-color: #000000 !important;
      text-shadow: none !important;
      box-shadow: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      mix-blend-mode: normal !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
    }
    .thermal-receipt-clone {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.25 !important;
    }
    .thermal-receipt-clone div:not(.bg-black):not(.bg-zinc-950),
    .thermal-receipt-clone span,
    .thermal-receipt-clone p {
      background-color: transparent !important;
    }
    .thermal-receipt-clone .border-b,
    .thermal-receipt-clone .border-t,
    .thermal-receipt-clone .border-y,
    .thermal-receipt-clone .border {
      border-color: #000000 !important;
    }
    .thermal-receipt-clone .border-dashed {
      border-bottom-style: dashed !important;
      border-bottom-width: 1px !important;
      border-color: #000000 !important;
    }
    .thermal-receipt-clone span,
    .thermal-receipt-clone p,
    .thermal-receipt-clone div {
      font-weight: 600;
    }
    .thermal-receipt-clone .font-normal {
      font-weight: 500 !important;
    }
    .thermal-receipt-clone .font-bold,
    .thermal-receipt-clone .font-black {
      font-weight: 900 !important;
    }
    .thermal-receipt-clone .text-\\[8px\\],
    .thermal-receipt-clone .text-\\[8\\.5px\\] {
      font-size: 9.5px !important;
      line-height: 1.15 !important;
    }
    .thermal-receipt-clone .text-\\[10px\\] {
      font-size: 10.5px !important;
    }
    .thermal-receipt-clone .text-\\[11px\\] {
      font-size: 11px !important;
    }
    .thermal-receipt-clone .text-xs {
      font-size: 12px !important;
    }
    .thermal-receipt-clone img {
      max-width: 100% !important;
      height: auto !important;
      filter: grayscale(100%) contrast(140%) !important;
    }
  `;

  stagingWrapper.appendChild(styleTag);
  stagingWrapper.appendChild(receiptClone);
  hostContainer.appendChild(stagingWrapper);
  document.body.appendChild(hostContainer);

  try {
    // 4. Wait for fonts and images
    if (typeof document !== 'undefined' && 'fonts' in document) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore font ready errors
      }
    }

    const images = Array.from(stagingWrapper.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(resolve, 1500);
            })
        )
      );
    }

    // Ensure layout & paint are complete before measuring/capturing
    await waitForPaint();

    const captureHeight = Math.max(
      1,
      Math.ceil(stagingWrapper.scrollHeight || stagingWrapper.getBoundingClientRect().height)
    );

    const renderOnce = async (skipFonts: boolean): Promise<HTMLCanvasElement> => {
      const raw = await toCanvas(stagingWrapper, {
        backgroundColor: '#FFFFFF',
        pixelRatio: 1,
        width: targetDotsWidth,
        height: captureHeight,
        canvasWidth: targetDotsWidth,
        canvasHeight: captureHeight,
        skipFonts,
        cacheBust: false,
        // Force the cloned ROOT back to (0,0) inside the SVG foreignObject.
        // Without this, any inherited fixed/offscreen positioning pushes content out of frame.
        style: {
          position: 'static',
          left: '0',
          top: '0',
          right: 'auto',
          bottom: 'auto',
          transform: 'none',
          opacity: '1',
          visibility: 'visible',
          width: `${targetDotsWidth}px`,
          maxWidth: `${targetDotsWidth}px`,
          margin: '0',
          padding: '0',
          backgroundColor: '#FFFFFF',
        },
      });
      return flattenOntoWhite(raw, targetDotsWidth);
    };

    // 5. Render, verify there is actual ink, retry once if blank
    let finalCanvas: HTMLCanvasElement;
    try {
      finalCanvas = await renderOnce(false);
    } catch {
      // Web-font embedding (CORS) failure -> render with system fonts instead
      finalCanvas = await renderOnce(true);
    }

    if (countDarkPixels(finalCanvas) === 0) {
      // WebKit/Android WebView frequently produce an empty first frame (images/fonts not yet decoded in SVG)
      await waitForPaint();
      finalCanvas = await renderOnce(true);
    }

    if (countDarkPixels(finalCanvas) === 0) {
      throw new Error(
        'Render nota menghasilkan gambar kosong. Pencetakan dibatalkan agar kertas tidak terbuang. Silakan coba lagi atau gunakan opsi "Print Sistem".'
      );
    }

    return convertCanvasToEscPosRaster(finalCanvas);
  } finally {
    if (hostContainer.parentNode) {
      hostContainer.parentNode.removeChild(hostContainer);
    }
  }
}

/**
 * Converts an opaque white-backed Canvas to a single ESC/POS `GS v 0` 1-bit raster image.
 *
 * Bit semantics for GS v 0: 1 = BLACK dot (heat), 0 = WHITE (no heat). MSB = leftmost pixel.
 * Pixel rule: luminance < 200 -> BLACK (1); otherwise WHITE (0).
 * Any residual alpha is composited onto white first.
 *
 * Payload layout (one contiguous image, no banding):
 *   ESC @ | GS v 0 m=0 xL xH yL yH | widthBytes*height data | LF x4 | GS V B 0
 */
function convertCanvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal mendapatkan 2D context canvas.');
  }
  if (height > 65535) {
    throw new Error('Nota terlalu panjang untuk satu gambar raster ESC/POS.');
  }

  const rgba = ctx.getImageData(0, 0, width, height).data;
  const widthBytes = Math.ceil(width / 8);

  const HEADER = [
    0x1b, 0x40, // ESC @ - initialize
    0x1d, 0x76, 0x30, 0x00, // GS v 0, m = 0 (normal density)
    widthBytes & 0xff, (widthBytes >> 8) & 0xff, // xL xH (bytes per row)
    height & 0xff, (height >> 8) & 0xff, // yL yH (rows)
  ];
  const FOOTER = [
    0x0a, 0x0a, 0x0a, 0x0a, // feed 4 lines
    0x1d, 0x56, 0x42, 0x00, // GS V B 0 - partial cut
  ];

  const imageBytes = widthBytes * height;
  const out = new Uint8Array(HEADER.length + imageBytes + FOOTER.length);
  out.set(HEADER, 0);

  let p = HEADER.length;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        if (x >= width) break; // padding bits stay 0 (white)

        const idx = (rowOffset + x) * 4;
        const a = rgba[idx + 3] / 255;
        // Composite onto white so transparent pixels never count as black
        const r = rgba[idx] * a + 255 * (1 - a);
        const g = rgba[idx + 1] * a + 255 * (1 - a);
        const b = rgba[idx + 2] * a + 255 * (1 - a);
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance < RASTER_THRESHOLD) {
          byteVal |= 0x80 >> bit; // BLACK dot
        }
      }
      out[p++] = byteVal;
    }
  }

  out.set(FOOTER, p);
  return out;
}

/**
 * Helper to encode binary Uint8Array into standard Base64 string in chunks
 * to avoid call stack limits on large binary payloads.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  const len = bytes.length;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return window.btoa(binary);
}

/**
 * Print receipt directly via Web Bluetooth (BLE).
 * Does NOT invoke discovery scan if a printer is already saved and accessible.
 */
export async function printReceiptViaBluetooth(
  receiptElement: HTMLElement,
  options: BluetoothPrintOptions
): Promise<void> {
  const { paperWidthMm, onStatusChange } = options;

  if (!isBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth tidak didukung pada browser/perangkat ini. Silakan gunakan opsi "Print Sistem" atau "Android Classic Bridge".'
    );
  }

  // 1. Retrieve device reference without discovery scan
  let device: any;
  try {
    device = await getBluetoothDeviceWithoutDiscovery();
  } catch (err: any) {
    if (err.message === 'PRINTER_RECONNECT_NEEDED' || err.message === 'PRINTER_NOT_PAIRED') {
      throw err;
    }
    throw new Error('Printer tidak tersedia.');
  }

  onStatusChange?.('Menghubungkan ke printer...');

  let server: any;
  try {
    server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  } catch {
    cachedBluetoothDevice = null;
    throw new Error('Printer tidak dapat dihubungkan.');
  }

  // 2. Discover writeable characteristic
  let writeCharacteristic: any = null;
  for (const serviceUuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeCharacteristic = char;
          break;
        }
      }
      if (writeCharacteristic) break;
    } catch {
      // Continue to next candidate service
    }
  }

  if (!writeCharacteristic) {
    try {
      const services = await server.getPrimaryServices();
      for (const s of services) {
        const chars = await s.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            writeCharacteristic = c;
            break;
          }
        }
        if (writeCharacteristic) break;
      }
    } catch {
      // ignore
    }
  }

  if (!writeCharacteristic) {
    throw new Error(
      'Tidak ditemukan karakteristik tulis pada printer ini (printer mungkin membutuhkan koneksi Bluetooth Classic/SPP). Silakan gunakan opsi "Android Classic Bridge" atau "Print Sistem".'
    );
  }

  onStatusChange?.('Merender nota untuk printer thermal...');

  const escPosData = await renderReceiptToEscPosRaster(receiptElement, paperWidthMm);

  onStatusChange?.('Mengirim data nota ke printer...');

  // Transmit in chunks (256 bytes per packet)
  const chunkSize = 256;
  for (let offset = 0; offset < escPosData.length; offset += chunkSize) {
    const chunk = escPosData.slice(offset, offset + chunkSize);
    if (writeCharacteristic.writeValueWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await writeCharacteristic.writeValue(chunk);
    }
    await new Promise((res) => setTimeout(res, 25));
  }

  onStatusChange?.('Pencetakan selesai!');
}

/**
 * Print receipt via Android RawBT Intent Protocol.
 * For Bluetooth Classic / SPP and USB thermal printers on Android.
 */
export async function printReceiptViaRawBt(
  receiptElement: HTMLElement,
  paperWidthMm: number,
  onStatusChange?: (status: string) => void
): Promise<void> {
  onStatusChange?.('Merender nota untuk printer thermal...');

  const escPosData = await renderReceiptToEscPosRaster(receiptElement, paperWidthMm);
  const base64Data = uint8ArrayToBase64(escPosData);

  onStatusChange?.('Meneruskan nota ke printer Android...');

  // RawBT Android Intent URL
  // NOTE: encodeURIComponent is critical! Base64 contains '+', '/', and '='.
  // In Android Chrome Intent URIs, unencoded '+' is parsed by Android as a space,
  // which silently corrupts the binary ESC/POS payload!
  const encodedBase64 = encodeURIComponent(base64Data);
  const intentUrl = `intent:base64,${encodedBase64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;

  // Trigger Intent via anchor click with window.location fallback
  try {
    const anchor = document.createElement('a');
    anchor.href = intentUrl;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 1000);
  } catch {
    window.location.href = intentUrl;
  }

  onStatusChange?.('Nota berhasil diteruskan ke Android!');
}
