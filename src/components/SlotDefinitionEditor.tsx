import React, { useRef, useState, useEffect } from 'react';
import { Move, Maximize2 } from 'lucide-react';

interface Slot {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  w: number; // percentage (0-100)
  h: number; // percentage (0-100)
}

interface SlotDefinitionEditorProps {
  imageUrl: string;
  slot: Slot;
  onChange: (newSlot: Slot) => void;
}

export const SlotDefinitionEditor: React.FC<SlotDefinitionEditorProps> = ({
  imageUrl,
  slot,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'idle' | 'moving' | 'resizing';
    startX: number;
    startY: number;
    startSlotX: number;
    startSlotY: number;
    startSlotW: number;
    startSlotH: number;
  }>({
    type: 'idle',
    startX: 0,
    startY: 0,
    startSlotX: 0,
    startSlotY: 0,
    startSlotW: 0,
    startSlotH: 0,
  });

  const handleStart = (
    e: React.MouseEvent | React.TouchEvent,
    type: 'moving' | 'resizing'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState({
      type,
      startX: clientX,
      startY: clientY,
      startSlotX: slot.x,
      startSlotY: slot.y,
      startSlotW: slot.w,
      startSlotH: slot.h,
    });
  };

  useEffect(() => {
    if (dragState.type === 'idle') return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaXPix = clientX - dragState.startX;
      const deltaYPix = clientY - dragState.startY;

      // Convert pixel delta to percentages
      const deltaXPct = (deltaXPix / rect.width) * 100;
      const deltaYPct = (deltaYPix / rect.height) * 100;

      if (dragState.type === 'moving') {
        let nextX = dragState.startSlotX + deltaXPct;
        let nextY = dragState.startSlotY + deltaYPct;

        // Constraint check
        nextX = Math.max(0, Math.min(100 - dragState.startSlotW, nextX));
        nextY = Math.max(0, Math.min(100 - dragState.startSlotH, nextY));

        onChange({
          ...slot,
          x: Math.round(nextX * 10) / 10,
          y: Math.round(nextY * 10) / 10,
        });
      } else if (dragState.type === 'resizing') {
        let nextW = dragState.startSlotW + deltaXPct;
        let nextH = dragState.startSlotH + deltaYPct;

        // Constraints
        nextW = Math.max(10, Math.min(100 - dragState.startSlotX, nextW));
        nextH = Math.max(10, Math.min(100 - dragState.startSlotY, nextH));

        onChange({
          ...slot,
          w: Math.round(nextW * 10) / 10,
          h: Math.round(nextH * 10) / 10,
        });
      }
    };

    const handleEnd = () => {
      setDragState((prev) => ({ ...prev, type: 'idle' }));
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragState, onChange, slot]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
        <span>Slot Bounds</span>
        <span>
          X: {slot.x}%, Y: {slot.y}% | W: {slot.w}%, H: {slot.h}%
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative border border-[#E4E1D8] bg-zinc-100 select-none overflow-hidden mx-auto max-w-xs shadow-md"
        style={{ aspectRatio: '1/1' }}
      >
        {/* Template Background Image */}
        <img
          src={imageUrl}
          alt="Bespoke template"
          className="w-full h-full object-contain pointer-events-none"
          referrerPolicy="no-referrer"
        />

        {/* Drag-to-place Photo Slot Overlay */}
        <div
          className="absolute border-2 border-dashed border-[#C9822E] bg-[#C9822E]/25 transition-shadow cursor-move flex flex-col items-center justify-center shadow-[0_0_8px_rgba(201,130,46,0.25)] group"
          style={{
            left: `${slot.x}%`,
            top: `${slot.y}%`,
            width: `${slot.w}%`,
            height: `${slot.h}%`,
          }}
          onMouseDown={(e) => handleStart(e, 'moving')}
          onTouchStart={(e) => handleStart(e, 'moving')}
        >
          {/* Internal Slot Decoration */}
          <div className="text-center p-2 pointer-events-none select-none">
            <Move className="h-4 w-4 mx-auto text-[#1B2A4A] opacity-70 mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-[9px] font-mono font-bold text-[#1B2A4A] uppercase tracking-wider">
              PORTRAIT SLOT
            </p>
            <p className="text-[7px] font-mono text-zinc-700 uppercase tracking-tight mt-0.5">
              Drag to position
            </p>
          </div>

          {/* Resize Handle in bottom-right corner */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 bg-[#C9822E] text-white cursor-se-resize flex items-center justify-center hover:bg-[#b06f23] transition-colors shadow-md z-10"
            onMouseDown={(e) => handleStart(e, 'resizing')}
            onTouchStart={(e) => handleStart(e, 'resizing')}
            title="Drag to resize slot"
          >
            <Maximize2 className="h-2.5 w-2.5 rotate-90" />
          </div>
        </div>
      </div>
      <p className="text-[9px] font-mono text-center text-zinc-400 uppercase leading-relaxed">
        ✨ Press & drag the center to move the slot, or drag the bottom-right handle to resize where your photo will sit.
      </p>
    </div>
  );
};
