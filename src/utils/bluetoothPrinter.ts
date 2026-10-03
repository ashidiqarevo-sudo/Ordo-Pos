/**
 * Web Bluetooth Direct ESC/POS Thermal Printing Utility.
 * Converts receipt DOM to 1-bit raster image (384 dots for 58mm, 576 dots for 80mm)
 * and transmits ESC/POS commands directly to compatible Bluetooth thermal printers.
 *
 * Implements persistent device binding to avoid re-scanning/discovery on every print.
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
 * Explicit user-gesture device discovery (requestDevice).
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
      'Web Bluetooth tidak didukung pada browser/perangkat ini. Silakan gunakan Google Chrome/Microsoft Edge atau opsi "Print Sistem".'
    );
  }

  onStatusChange?.('Mencari printer Bluetooth...');
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
  // 1. Check in-memory session cache first
  if (cachedBluetoothDevice) {
    return cachedBluetoothDevice;
  }

  const saved = getSavedBluetoothPrinter();

  // 2. Check navigator.bluetooth.getDevices() if available in Chromium
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
 * Print receipt element directly to the selected Bluetooth thermal printer.
 * Does NOT invoke discovery scan if a printer is already saved and accessible.
 */
export async function printReceiptViaBluetooth(
  receiptElement: HTMLElement,
  options: BluetoothPrintOptions
): Promise<void> {
  const { paperWidthMm, onStatusChange } = options;

  if (!isBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth tidak didukung pada browser/perangkat ini. Silakan gunakan opsi "Print Sistem".'
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
      'Tidak ditemukan karakteristik tulis pada printer ini (printer mungkin membutuhkan koneksi Bluetooth Classic/SPP). Silakan gunakan "Print Sistem".'
    );
  }

  onStatusChange?.('Merender nota untuk printer thermal...');

  // 3. Target raster dot width (384 dots for 58mm, 576 dots for 80mm)
  const targetDotsWidth = paperWidthMm <= 60 ? 384 : 576;

  // 4. Render receipt to HTML Canvas using html-to-image
  const canvas = await toCanvas(receiptElement, {
    backgroundColor: '#ffffff',
    pixelRatio: 1,
    style: {
      width: `${targetDotsWidth}px`,
      maxWidth: `${targetDotsWidth}px`,
      margin: '0',
      padding: '4px',
    },
  });

  // Scale or ensure canvas matches exact target dots width
  let finalCanvas = canvas;
  if (canvas.width !== targetDotsWidth) {
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = targetDotsWidth;
    const scale = targetDotsWidth / canvas.width;
    resizedCanvas.height = Math.round(canvas.height * scale);
    const ctx = resizedCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, resizedCanvas.width, resizedCanvas.height);
      ctx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
      finalCanvas = resizedCanvas;
    }
  }

  onStatusChange?.('Mengirim data nota ke printer...');

  // 5. Convert Canvas to ESC/POS Monochrome Raster Bit Image (GS v 0)
  const escPosData = convertCanvasToEscPosRaster(finalCanvas);

  // 6. Transmit in chunks (256 bytes per packet to avoid BLE buffer overflow)
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
 * Converts a Canvas to standard ESC/POS GS v 0 1-bit raster data
 */
function convertCanvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, width, height);
  const rgba = imgData.data;

  // ESC/POS raster requires width in bytes: width / 8
  const widthBytes = Math.ceil(width / 8);
  const rasterData: number[] = [];

  // ESC @ (Initialize printer)
  rasterData.push(0x1b, 0x40);

  // GS v 0 0 xL xH yL yH
  const xL = widthBytes % 256;
  const xH = Math.floor(widthBytes / 256);
  const yL = height % 256;
  const yH = Math.floor(height / 256);

  rasterData.push(0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH);

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        if (x < width) {
          const idx = (y * width + x) * 4;
          const r = rgba[idx];
          const g = rgba[idx + 1];
          const b = rgba[idx + 2];
          // Grayscale luminance
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          // In ESC/POS raster: 1 = black dot, 0 = white dot
          if (luminance < 160) {
            byteVal |= 1 << (7 - bit);
          }
        }
      }
      rasterData.push(byteVal);
    }
  }

  // Line feeds and paper cut command (GS V 66 0)
  rasterData.push(0x0a, 0x0a, 0x0a, 0x0a);
  rasterData.push(0x1d, 0x56, 0x42, 0x00);

  return new Uint8Array(rasterData);
}
