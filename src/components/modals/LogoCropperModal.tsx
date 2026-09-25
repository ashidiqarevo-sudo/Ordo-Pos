import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface LogoCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedBase64: string) => void;
}

export const LogoCropperModal: React.FC<LogoCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.15, 3.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.15, 0.4));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleApply = () => {
    if (!imageRef.current) return;

    // Export with high-res 400x400 canvas
    const canvas = document.createElement('canvas');
    const OUTPUT_SIZE = 400;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Clip to perfect circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // Coordinate space mapping from preview container (256x256) to output (400x400)
    const CROP_BOX_DISPLAY_SIZE = 256;
    const scaleRatio = OUTPUT_SIZE / CROP_BOX_DISPLAY_SIZE;

    // Center canvas
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    // Translate with position adjusted by ratio
    ctx.translate(position.x * scaleRatio, position.y * scaleRatio);
    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);
    // Scale
    ctx.scale(scale, scale);

    const img = imageRef.current;
    // Calculate aspect ratio fit
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    // Fit image to initial box size
    let renderW = CROP_BOX_DISPLAY_SIZE;
    let renderH = CROP_BOX_DISPLAY_SIZE;
    if (imgWidth > imgHeight) {
      renderW = CROP_BOX_DISPLAY_SIZE * (imgWidth / imgHeight);
    } else {
      renderH = CROP_BOX_DISPLAY_SIZE * (imgHeight / imgWidth);
    }

    renderW *= scaleRatio;
    renderH *= scaleRatio;

    ctx.drawImage(
      img,
      -renderW / 2,
      -renderH / 2,
      renderW,
      renderH
    );
    ctx.restore();

    const finalBase64 = canvas.toDataURL('image/png', 0.95);
    onConfirm(finalBase64);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Sesuaikan Posisi Logo</h3>
              <p className="text-[11px] text-zinc-400">Geser & atur zoom agar pas di nota & header</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Box (Interactive Stage) */}
        <div className="p-6 flex flex-col items-center justify-center bg-zinc-900/40">
          <div className="text-[11px] text-zinc-400 mb-2 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-emerald-400" />
            <span>Klik & geser gambar untuk mengatur posisi tengah</span>
          </div>

          {/* Circular Crop Frame */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-60 h-60 rounded-full bg-zinc-950 border-4 border-emerald-500/80 shadow-2xl shadow-emerald-500/20 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none ring-4 ring-zinc-800"
          >
            {/* Circular Guide Grid */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20 z-10">
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
            </div>

            {/* Target Image being adjusted */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Logo Target"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: '100%',
                maxHeight: '100%',
              }}
              className="pointer-events-none object-contain select-none"
            />
          </div>

          <div className="mt-3 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Format Bulat (Circle Avatar & Nota)</span>
          </div>
        </div>

        {/* Toolbar Controls: Zoom, Rotate, Reset */}
        <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Ukuran:</span>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Perkecil (-)"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-24 accent-emerald-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={handleZoomIn}
                title="Perbesar (+)"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotate & Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate}
                title="Putar 90 Derajat"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer transition-colors flex items-center gap-1 text-xs"
              >
                <RotateCw className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline font-bold">Putar</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset Posisi & Skala"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons: Batal & Simpan Logo (Oke) */}
        <div className="px-6 py-3.5 border-t border-zinc-800 flex items-center justify-end gap-2 bg-zinc-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Oke, Pasang Logo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
