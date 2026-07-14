import React, { useState, useEffect, useRef } from 'react';
import { Undo2, Redo2, RotateCcw, Image as ImageIcon, Sliders, Palette, Move, Type, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { TemplateStyle } from '../types';

interface TextElement {
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  font: string;
}

interface CanvasSettings {
  photoX: number;
  photoY: number;
  photoZoom: number;
  backgroundPresetIdx: number;
  showBorders: boolean;
  showOrnaments: boolean;
  showConfetti: boolean;
  showWatermark: boolean;
  nameElement: TextElement;
  captionElement: TextElement;
}

interface TemplateVisualEditorProps {
  imageSrc: string;
  style: TemplateStyle | 'custom';
  variantIdx: number;
  initialName: string;
  initialCaption: string;
  onUpdate: (dataUrl: string) => void;
  onReplacePhoto: (base64Data: string) => void;
  customTemplatePreview?: string | null;
  customTemplateSlot?: { x: number; y: number; w: number; h: number } | null;
}

const FONTS = [
  { value: '"Inter", sans-serif', label: 'Inter Sans' },
  { value: '"Playfair Display", serif', label: 'Elegant Serif' },
  { value: '"JetBrains Mono", monospace', label: 'Tech Mono' },
  { value: '"Space Grotesk", sans-serif', label: 'Space Grotesk' },
  { value: 'Georgia, serif', label: 'Classic Serif' }
];

export function TemplateVisualEditor({
  imageSrc,
  style,
  variantIdx,
  initialName,
  initialCaption,
  onUpdate,
  onReplacePhoto,
  customTemplatePreview = null,
  customTemplateSlot = null
}: TemplateVisualEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [loadedCustomTemplateImg, setLoadedCustomTemplateImg] = useState<HTMLImageElement | null>(null);
  
  // History State
  const [settings, setSettings] = useState<CanvasSettings>(() => getInitialSettings(style, variantIdx, initialName, initialCaption));
  const [history, setHistory] = useState<CanvasSettings[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<'preset' | 'text' | 'toggles'>('preset');

  // Selected State
  const [selectedElement, setSelectedElement] = useState<'name' | 'caption' | 'borders' | 'ornaments' | 'confetti' | 'watermark' | null>(null);
  const [draggedItem, setDraggedItem] = useState<'name' | 'caption' | 'photo' | null>(null);
  const [hoveredElement, setHoveredElement] = useState<'name' | 'caption' | 'photo' | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, initX: 0, initY: 0 });
  const settingsRef = useRef<CanvasSettings>(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  const [containerWidth, setContainerWidth] = useState(400);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  // ResizeObserver to track container clientWidth for scaling absolute text overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, item: 'name' | 'caption') => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const elem = item === 'name' ? settings.nameElement : settings.captionElement;
    setDraggedItem(item);
    dragStartRef.current = { x, y, initX: elem.x, initY: elem.y };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = d;
      touchStartZoomRef.current = settings.photoZoom;
    } else {
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      const align = style === 'linkedin' ? 'left' : 'center';
      const hitName = isPointInText(x, y, settings.nameElement, align);
      const hitCaption = isPointInText(x, y, settings.captionElement, align);
      const hitPhoto = isInsidePhotoSlot(x, y);

      if (hitName) {
        setSelectedElement('name');
        setDraggedItem('name');
        dragStartRef.current = { x, y, initX: settings.nameElement.x, initY: settings.nameElement.y };
      } else if (hitCaption) {
        setSelectedElement('caption');
        setDraggedItem('caption');
        dragStartRef.current = { x, y, initX: settings.captionElement.x, initY: settings.captionElement.y };
      } else if (hitPhoto) {
        setSelectedElement(null);
        setDraggedItem('photo');
        dragStartRef.current = { x, y, initX: settings.photoX, initY: settings.photoY };
      } else {
        setSelectedElement(null);
        setDraggedItem(null);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = d / touchStartDistRef.current;
      const nextZoom = Math.max(0.4, Math.min(6.0, touchStartZoomRef.current * ratio));
      setSettings(prev => ({ ...prev, photoZoom: nextZoom }));
    } else if (draggedItem) {
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;

      if (draggedItem === 'name') {
        setSettings(prev => ({
          ...prev,
          nameElement: {
            ...prev.nameElement,
            x: dragStartRef.current.initX + dx,
            y: dragStartRef.current.initY + dy
          }
        }));
      } else if (draggedItem === 'caption') {
        setSettings(prev => ({
          ...prev,
          captionElement: {
            ...prev.captionElement,
            x: dragStartRef.current.initX + dx,
            y: dragStartRef.current.initY + dy
          }
        }));
      } else if (draggedItem === 'photo') {
        setSettings(prev => ({
          ...prev,
          photoX: dragStartRef.current.initX + dx,
          photoY: dragStartRef.current.initY + dy
        }));
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    handleMouseUp();
  };

  // Load user uploaded photo
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImage(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Load custom template design background if applicable
  useEffect(() => {
    if (!customTemplatePreview || style !== 'custom') {
      setLoadedCustomTemplateImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedCustomTemplateImg(img);
    };
    img.src = customTemplatePreview;
  }, [customTemplatePreview, style]);

  // Reset settings if template style or variation changes
  useEffect(() => {
    const init = getInitialSettings(style, variantIdx, initialName, initialCaption);
    setSettings(init);
    setHistory([init]);
    setHistoryIdx(0);
    setSelectedElement(null);
  }, [style, variantIdx]);

  // Canvas Drawing and Update loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;

    // For custom template, wait for template backdrop image to be ready
    if (style === 'custom' && !loadedCustomTemplateImg) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const isLinkedin = style === 'linkedin';
    canvas.width = isLinkedin ? 1600 : 1000;
    canvas.height = isLinkedin ? 900 : 1000;

    drawCanvas(
      ctx, 
      canvas.width, 
      canvas.height, 
      loadedImage, 
      settings, 
      style, 
      variantIdx,
      loadedCustomTemplateImg,
      customTemplateSlot
    );
    
    // Fire callback to sync with parent download/PDF functions
    const timer = setTimeout(() => {
      onUpdate(canvas.toDataURL('image/png'));
    }, 150);
    return () => clearTimeout(timer);
  }, [settings, loadedImage, style, variantIdx, loadedCustomTemplateImg, customTemplateSlot]);

  function pushHistory(newSettings: CanvasSettings) {
    const nextHistory = history.slice(0, historyIdx + 1);
    nextHistory.push(JSON.parse(JSON.stringify(newSettings)));
    setHistory(nextHistory);
    setHistoryIdx(nextHistory.length - 1);
  }

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setSettings(JSON.parse(JSON.stringify(history[prevIdx])));
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setSettings(JSON.parse(JSON.stringify(history[nextIdx])));
    }
  };

  const handleReset = () => {
    const resetVal = getInitialSettings(style, variantIdx, initialName, initialCaption);
    setSettings(resetVal);
    pushHistory(resetVal);
  };

  const handleReplacePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        onReplacePhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Global Keyboard Shortcuts Effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT' || 
                      document.activeElement?.tagName === 'TEXTAREA';
      
      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Y or Cmd+Y (or Cmd+Shift+Z) for Redo
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      
      // Delete or Backspace key for removing selected text element or decorative graphic
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInput && selectedElement) {
          e.preventDefault();
          if (selectedElement === 'name') {
            const updated = {
              ...settings,
              nameElement: { ...settings.nameElement, text: '' }
            };
            setSettings(updated);
            pushHistory(updated);
          } else if (selectedElement === 'caption') {
            const updated = {
              ...settings,
              captionElement: { ...settings.captionElement, text: '' }
            };
            setSettings(updated);
            pushHistory(updated);
          } else if (selectedElement === 'borders') {
            const updated = { ...settings, showBorders: false };
            setSettings(updated);
            pushHistory(updated);
          } else if (selectedElement === 'ornaments') {
            const updated = { ...settings, showOrnaments: false };
            setSettings(updated);
            pushHistory(updated);
          } else if (selectedElement === 'confetti') {
            const updated = { ...settings, showConfetti: false };
            setSettings(updated);
            pushHistory(updated);
          } else if (selectedElement === 'watermark') {
            const updated = { ...settings, showWatermark: false };
            setSettings(updated);
            pushHistory(updated);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings, selectedElement, historyIdx, history]);

  // Preset background list based on style & variant
  const bgPresets = getBackgroundPresets(style, variantIdx);

  // Mouse / Canvas Interactions
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const isInsidePhotoSlot = (cx: number, cy: number) => {
    if (style === 'custom') {
      if (!customTemplateSlot) return false;
      const slotX = (customTemplateSlot.x / 100) * canvasW;
      const slotY = (customTemplateSlot.y / 100) * canvasH;
      const slotW = (customTemplateSlot.w / 100) * canvasW;
      const slotH = (customTemplateSlot.h / 100) * canvasH;
      return cx >= slotX && cx <= slotX + slotW && cy >= slotY && cy <= slotY + slotH;
    }
    if (style === 'festival') {
      if (variantIdx === 0) {
        // Circle center at 500, 350, r=175
        const dist = Math.sqrt((cx - 500) ** 2 + (cy - 350) ** 2);
        return dist <= 175;
      } else {
        // Rounded square center at 500, 350, side=330
        return cx >= 335 && cx <= 665 && cy >= 185 && cy <= 515;
      }
    } else if (style === 'idcard') {
      if (variantIdx === 0) {
        return cx >= 350 && cx <= 650 && cy >= 280 && cy <= 660;
      } else {
        return cx >= 350 && cx <= 650 && cy >= 250 && cy <= 610;
      }
    } else if (style === 'birthday') {
      if (variantIdx === 0) {
        return cx >= 285 && cx <= 715 && cy >= 205 && cy <= 625;
      } else {
        return cx >= 340 && cx <= 660 && cy >= 250 && cy <= 570;
      }
    } else if (style === 'linkedin') {
      if (variantIdx === 0) {
        // Circle center at 350, 450, r=210
        const dist = Math.sqrt((cx - 350) ** 2 + (cy - 450) ** 2);
        return dist <= 210;
      } else {
        return cx >= 150 && cx <= 600 && cy >= 175 && cy <= 625;
      }
    }
    return false;
  };

  const isPointInText = (px: number, py: number, elem: TextElement, align: 'center' | 'left') => {
    const size = elem.size;
    const approxWidth = 0.55 * size * Math.max(elem.text.length, 5);
    const approxHeight = size * 1.3;
    if (align === 'center') {
      const left = elem.x - approxWidth / 2;
      const right = elem.x + approxWidth / 2;
      const top = elem.y - approxHeight / 2;
      const bottom = elem.y + approxHeight / 2;
      return px >= left && px <= right && py >= top && py <= bottom;
    } else {
      const left = elem.x;
      const right = elem.x + approxWidth;
      const top = elem.y - approxHeight / 2;
      const bottom = elem.y + approxHeight / 2;
      return px >= left && px <= right && py >= top && py <= bottom;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const align = style === 'linkedin' ? 'left' : 'center';

    const hitName = isPointInText(x, y, settings.nameElement, align);
    const hitCaption = isPointInText(x, y, settings.captionElement, align);
    const hitPhoto = isInsidePhotoSlot(x, y);

    if (hitName) {
      setSelectedElement('name');
      setDraggedItem('name');
      dragStartRef.current = { x, y, initX: settings.nameElement.x, initY: settings.nameElement.y };
    } else if (hitCaption) {
      setSelectedElement('caption');
      setDraggedItem('caption');
      dragStartRef.current = { x, y, initX: settings.captionElement.x, initY: settings.captionElement.y };
    } else if (hitPhoto) {
      setSelectedElement(null);
      setDraggedItem('photo');
      dragStartRef.current = { x, y, initX: settings.photoX, initY: settings.photoY };
    } else {
      setSelectedElement(null);
      setDraggedItem(null);
    }
  };

  const getCanvasCursorClass = () => {
    if (draggedItem) {
      return draggedItem === 'photo' ? 'cursor-grabbing' : 'cursor-move';
    }
    if (hoveredElement === 'name' || hoveredElement === 'caption') {
      return 'cursor-text';
    }
    if (hoveredElement === 'photo') {
      return 'cursor-grab';
    }
    return 'cursor-default';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    
    if (!draggedItem) {
      const align = style === 'linkedin' ? 'left' : 'center';
      const hitName = isPointInText(x, y, settings.nameElement, align);
      const hitCaption = isPointInText(x, y, settings.captionElement, align);
      const hitPhoto = isInsidePhotoSlot(x, y);

      if (hitName) {
        setHoveredElement('name');
      } else if (hitCaption) {
        setHoveredElement('caption');
      } else if (hitPhoto) {
        setHoveredElement('photo');
      } else {
        setHoveredElement(null);
      }
      return;
    }

    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;

    if (draggedItem === 'name') {
      setSettings(prev => ({
        ...prev,
        nameElement: {
          ...prev.nameElement,
          x: dragStartRef.current.initX + dx,
          y: dragStartRef.current.initY + dy
        }
      }));
    } else if (draggedItem === 'caption') {
      setSettings(prev => ({
        ...prev,
        captionElement: {
          ...prev.captionElement,
          x: dragStartRef.current.initX + dx,
          y: dragStartRef.current.initY + dy
        }
      }));
    } else if (draggedItem === 'photo') {
      setSettings(prev => ({
        ...prev,
        photoX: dragStartRef.current.initX + dx,
        photoY: dragStartRef.current.initY + dy
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggedItem) {
      pushHistory(settingsRef.current);
      setDraggedItem(null);
    }
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    if (isInsidePhotoSlot(x, y)) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      const nextZoom = Math.max(0.4, Math.min(6.0, settings.photoZoom + delta));
      const updated = { ...settings, photoZoom: nextZoom };
      setSettings(updated);
      pushHistory(updated);
    }
  };

  const updateSelectedText = (field: keyof TextElement, value: any) => {
    if (!selectedElement) return;
    const key = selectedElement === 'name' ? 'nameElement' : 'captionElement';
    const updated = {
      ...settings,
      [key]: {
        ...settings[key],
        [field]: value
      }
    };
    setSettings(updated);
    pushHistory(updated);
  };

  const isLinkedin = style === 'linkedin';
  const canvasW = isLinkedin ? 1600 : 1000;
  const canvasH = isLinkedin ? 900 : 1000;

  const nameX = settings.nameElement.x;
  const nameY = settings.nameElement.y;
  const nameLeftPct = (nameX / canvasW) * 100;
  const nameTopPct = (nameY / canvasH) * 100;

  const captionX = settings.captionElement.x;
  const captionY = settings.captionElement.y;
  const captionLeftPct = (captionX / canvasW) * 100;
  const captionTopPct = (captionY / canvasH) * 100;

  const textAlignment = isLinkedin ? 'left' : 'center';

  const renderFloatingToolbar = () => {
    if (!selectedElement) return null;
    const elem = selectedElement === 'name' ? settings.nameElement : settings.captionElement;
    const yRatio = elem.y / canvasH;
    
    // Flip toolbar below the text element if the text is in the top 25% of the canvas
    const toolbarTop = yRatio < 0.25 
      ? `calc(${yRatio * 100}% + 80px)` 
      : `calc(${yRatio * 100}% - 75px)`;

    return (
      <div
        className="absolute bg-[#1B2A4A] text-white p-2.5 shadow-2xl rounded-lg flex flex-wrap items-center gap-3 z-30 border border-white/10"
        style={{
          left: `${(elem.x / canvasW) * 100}%`,
          top: toolbarTop,
          transform: 'translate(-50%, -50%)',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Font Selector */}
        <select
          value={elem.font}
          onChange={(e) => updateSelectedText('font', e.target.value)}
          className="bg-zinc-800 text-white text-[10px] font-mono px-2 py-1.5 rounded border border-zinc-700 focus:outline-none"
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Size Slider */}
        <div className="flex items-center gap-1.5 min-w-[100px]">
          <span className="text-[9px] font-mono opacity-80 uppercase">Size</span>
          <input
            type="range"
            min="12"
            max="110"
            value={elem.size}
            onChange={(e) => updateSelectedText('size', parseInt(e.target.value))}
            className="w-16 accent-[#C9822E] h-1 bg-zinc-700 rounded-lg cursor-pointer"
          />
          <span className="text-[9px] font-mono w-6 text-right">
            {elem.size}px
          </span>
        </div>

        {/* Color Picker Bubble */}
        <div className="flex items-center gap-1">
          {['#FFFFFF', '#FFE6AF', '#0F172A', '#10B981', '#EC4899', '#38BDF8', '#FBBF24'].slice(0, 5).map(color => (
            <button
              key={color}
              onClick={() => updateSelectedText('color', color)}
              className={`w-4 h-4 rounded-full border border-white/20 transition-all ${
                elem.color === color ? 'scale-125 ring-1 ring-white' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={elem.color}
            onChange={(e) => updateSelectedText('color', e.target.value)}
            className="w-5 h-5 p-0 bg-transparent border-0 cursor-pointer"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-5 items-center">
      {/* Editor Main Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between w-full border-b border-[#E4E1D8] pb-3.5 gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="p-2 border border-[#E4E1D8] text-[#1B2A4A] hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="p-2 border border-[#E4E1D8] text-[#1B2A4A] hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 border border-[#E4E1D8] text-[#1B2A4A] hover:bg-zinc-100 transition-colors flex items-center gap-1.5 text-[10px] font-mono font-bold"
            title="Reset to Default Layout"
          >
            <RotateCcw className="h-3.5 w-3.5" /> RESET
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 border border-[#E4E1D8]">
          <button
            onClick={() => setActiveTab('preset')}
            className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 font-bold transition-all ${
              activeTab === 'preset' ? 'bg-[#1B2A4A] text-white' : 'text-zinc-600 hover:text-[#1B2A4A]'
            }`}
          >
            <Palette className="h-3.5 w-3.5 inline mr-1" /> Preset Backgrounds
          </button>
          <button
            onClick={() => setActiveTab('toggles')}
            className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 font-bold transition-all ${
              activeTab === 'toggles' ? 'bg-[#1B2A4A] text-white' : 'text-zinc-600 hover:text-[#1B2A4A]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 inline mr-1" /> Elements
          </button>
          {selectedElement && (
            <button
              onClick={() => setActiveTab('text')}
              className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 font-bold transition-all ${
                activeTab === 'text' ? 'bg-[#1B2A4A] text-white animate-pulse' : 'text-zinc-600 hover:text-[#1B2A4A]'
              }`}
            >
              <Type className="h-3.5 w-3.5 inline mr-1" /> Format Text
            </button>
          )}
        </div>

        <div>
          <button
            onClick={handleReplacePhotoClick}
            className="px-3.5 py-2 border border-[#C9822E] text-[#C9822E] bg-white hover:bg-[#C9822E]/5 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Replace Photo
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      {/* Canva-style Workspace and settings panel */}
      <div className="w-full flex flex-col gap-4">
        {/* Workspace Canvas Panel */}
        <div className="relative p-3 bg-zinc-50 border border-[#E4E1D8] w-full flex flex-col justify-center items-center overflow-hidden min-h-[440px] gap-4">
          <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none z-10">
            <span className="text-[9px] font-mono text-zinc-500 bg-white/90 border border-zinc-200/60 px-1.5 py-0.5 shadow-sm">
              ✨ Drag photo/text to move, scroll to Zoom • shortcuts: Ctrl+Z (Undo) • Ctrl+Y (Redo) • Del (Remove selection)
            </span>
          </div>

          <div className="relative max-w-[400px] w-full shadow-lg border border-zinc-200 bg-white select-none">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheelZoom}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`w-full h-auto block ${getCanvasCursorClass()}`}
            />

            {/* Direct Inline HTML Bounding Box / Text Editor overlays */}
            
            {/* NAME ELEMENT OVERLAY */}
            <div
              className={`absolute group transition-all duration-150 z-20 ${
                selectedElement === 'name' 
                  ? 'border-2 border-dashed border-[#38BDF8] p-1.5 bg-black/10' 
                  : 'border border-transparent hover:border-dashed hover:border-zinc-400 p-1.5 cursor-text'
              }`}
              style={{
                left: `${nameLeftPct}%`,
                top: `${nameTopPct}%`,
                transform: `translate(${textAlignment === 'center' ? '-50%' : '0'}, -50%)`,
                width: isLinkedin ? '60%' : '80%',
                textAlign: textAlignment
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement('name');
              }}
            >
              {selectedElement === 'name' ? (
                <input
                  type="text"
                  value={settings.nameElement.text}
                  onChange={(e) => updateSelectedText('text', e.target.value)}
                  className="w-full bg-transparent focus:outline-none focus:ring-0 font-bold uppercase caret-[#38BDF8] border-0 p-0"
                  style={{
                    fontFamily: settings.nameElement.font,
                    fontSize: `${settings.nameElement.size * (containerWidth / canvasW)}px`,
                    color: settings.nameElement.color,
                    textAlign: textAlignment
                  }}
                  autoFocus
                />
              ) : (
                <div
                  style={{
                    fontFamily: settings.nameElement.font,
                    fontSize: `${settings.nameElement.size * (containerWidth / canvasW)}px`,
                    color: settings.nameElement.color,
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                >
                  {settings.nameElement.text}
                </div>
              )}

              {/* Move Handle below name overlay when selected */}
              {selectedElement === 'name' && (
                <div
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#1B2A4A] text-white p-1 rounded-full cursor-move shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all pointer-events-auto"
                  onMouseDown={(e) => handleDragStart(e, 'name')}
                  onTouchStart={(e) => handleDragStart(e, 'name')}
                  title="Drag to position name"
                >
                  <Move className="h-3 w-3" />
                </div>
              )}
            </div>

            {/* CAPTION ELEMENT OVERLAY */}
            <div
              className={`absolute group transition-all duration-150 z-20 ${
                selectedElement === 'caption' 
                  ? 'border-2 border-dashed border-[#38BDF8] p-1.5 bg-black/10' 
                  : 'border border-transparent hover:border-dashed hover:border-zinc-400 p-1.5 cursor-text'
              }`}
              style={{
                left: `${captionLeftPct}%`,
                top: `${captionTopPct}%`,
                transform: `translate(${textAlignment === 'center' ? '-50%' : '0'}, -50%)`,
                width: isLinkedin ? '55%' : '75%',
                textAlign: textAlignment
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement('caption');
              }}
            >
              {selectedElement === 'caption' ? (
                <textarea
                  value={settings.captionElement.text}
                  onChange={(e) => updateSelectedText('text', e.target.value)}
                  className="w-full bg-transparent focus:outline-none focus:ring-0 caret-[#38BDF8] border-0 p-0 resize-none leading-normal"
                  style={{
                    fontFamily: settings.captionElement.font,
                    fontSize: `${settings.captionElement.size * (containerWidth / canvasW)}px`,
                    color: settings.captionElement.color,
                    textAlign: textAlignment,
                    height: 'auto',
                    minHeight: '2em'
                  }}
                  rows={2}
                  autoFocus
                />
              ) : (
                <div
                  style={{
                    fontFamily: settings.captionElement.font,
                    fontSize: `${settings.captionElement.size * (containerWidth / canvasW)}px`,
                    color: settings.captionElement.color,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 'normal'
                  }}
                >
                  {settings.captionElement.text}
                </div>
              )}

              {/* Move Handle below caption overlay when selected */}
              {selectedElement === 'caption' && (
                <div
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#1B2A4A] text-white p-1 rounded-full cursor-move shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all pointer-events-auto"
                  onMouseDown={(e) => handleDragStart(e, 'caption')}
                  onTouchStart={(e) => handleDragStart(e, 'caption')}
                  title="Drag to position caption"
                >
                  <Move className="h-3 w-3" />
                </div>
              )}
            </div>

            {/* FLOATING TYPOGRAPHY TOOLBAR */}
            {renderFloatingToolbar()}
          </div>

          {/* Zoom & Navigation Assistant Control Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 bg-white border border-[#E4E1D8] px-4 py-2 shadow-sm text-xs select-none max-w-[400px] w-full">
            <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              🔍 Photo Zoom:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const nextZoom = Math.max(0.4, Math.min(6.0, settings.photoZoom - 0.1));
                  const updated = { ...settings, photoZoom: nextZoom };
                  setSettings(updated);
                  pushHistory(updated);
                }}
                className="w-7 h-7 flex items-center justify-center border border-[#E4E1D8] hover:bg-zinc-100 text-[#1B2A4A] transition-colors font-bold text-sm bg-white"
                title="Zoom Out"
              >
                -
              </button>
              <span className="font-mono text-[10px] text-zinc-700 font-bold w-12 text-center bg-zinc-50 py-1 border border-[#E4E1D8]">
                {Math.round(settings.photoZoom * 100)}%
              </span>
              <button
                onClick={() => {
                  const nextZoom = Math.max(0.4, Math.min(6.0, settings.photoZoom + 0.1));
                  const updated = { ...settings, photoZoom: nextZoom };
                  setSettings(updated);
                  pushHistory(updated);
                }}
                className="w-7 h-7 flex items-center justify-center border border-[#E4E1D8] hover:bg-zinc-100 text-[#1B2A4A] transition-colors font-bold text-sm bg-white"
                title="Zoom In"
              >
                +
              </button>
            </div>
            <div className="h-4 w-px bg-zinc-200 mx-1" />
            <button
              onClick={() => {
                const updated = { ...settings, photoZoom: 1.0, photoX: 0, photoY: 0 };
                setSettings(updated);
                pushHistory(updated);
              }}
              className="px-2.5 py-1.5 border border-[#E4E1D8] text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-100 transition-colors bg-white"
            >
              Reset Position & Zoom
            </button>
          </div>
        </div>

        {/* Dynamic Controls Drawer */}
        <div className="w-full border border-[#E4E1D8] p-4 bg-zinc-50/50">
          {activeTab === 'preset' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#1B2A4A] uppercase tracking-wider">Background Theme Presets</span>
                <span className="text-[9px] font-mono text-zinc-400">SELECT TO CHANGE INSTANTLY</span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {bgPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const updated = { ...settings, backgroundPresetIdx: idx };
                      setSettings(updated);
                      pushHistory(updated);
                    }}
                    className={`h-11 border-2 flex items-center justify-center p-1 relative group transition-all ${
                      settings.backgroundPresetIdx === idx ? 'border-[#C9822E] bg-white' : 'border-[#E4E1D8] hover:border-zinc-400 bg-[#FAFAF8]'
                    }`}
                  >
                    <div
                      className="w-full h-full rounded-none shadow-inner"
                      style={{ background: preset.gradient }}
                    />
                    <span className="absolute bottom-1 right-1 text-[7px] font-mono bg-black/75 text-white px-1 leading-none">
                      P{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'toggles' && (
            <div className="space-y-3.5">
              <span className="text-xs font-mono font-bold text-[#1B2A4A] uppercase tracking-wider block">Visual Template Elements <span className="text-[10px] text-zinc-400 font-normal font-sans">(Click to select, then press "Delete" to remove)</span></span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div 
                  onClick={() => setSelectedElement('borders')}
                  className={`flex items-center gap-2 font-mono text-[11px] text-zinc-700 cursor-pointer select-none p-2.5 border transition-all ${
                    selectedElement === 'borders' 
                      ? 'border-[#C9822E] bg-[#C9822E]/5 font-bold text-[#1B2A4A]' 
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={settings.showBorders}
                    onChange={(e) => {
                      const updated = { ...settings, showBorders: e.target.checked };
                      setSettings(updated);
                      pushHistory(updated);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-none border-[#E4E1D8] text-[#1B2A4A] focus:ring-0 mr-1"
                  />
                  <span>Show Borders</span>
                  {selectedElement === 'borders' && (
                    <span className="text-[8px] text-[#C9822E] font-bold ml-auto bg-[#C9822E]/10 px-1 py-0.5 font-sans">SELECTED</span>
                  )}
                </div>

                <div 
                  onClick={() => setSelectedElement('ornaments')}
                  className={`flex items-center gap-2 font-mono text-[11px] text-zinc-700 cursor-pointer select-none p-2.5 border transition-all ${
                    selectedElement === 'ornaments' 
                      ? 'border-[#C9822E] bg-[#C9822E]/5 font-bold text-[#1B2A4A]' 
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={settings.showOrnaments}
                    onChange={(e) => {
                      const updated = { ...settings, showOrnaments: e.target.checked };
                      setSettings(updated);
                      pushHistory(updated);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-none border-[#E4E1D8] text-[#1B2A4A] focus:ring-0 mr-1"
                  />
                  <span>Accents</span>
                  {selectedElement === 'ornaments' && (
                    <span className="text-[8px] text-[#C9822E] font-bold ml-auto bg-[#C9822E]/10 px-1 py-0.5 font-sans">SELECTED</span>
                  )}
                </div>

                <div 
                  onClick={() => setSelectedElement('confetti')}
                  className={`flex items-center gap-2 font-mono text-[11px] text-zinc-700 cursor-pointer select-none p-2.5 border transition-all ${
                    selectedElement === 'confetti' 
                      ? 'border-[#C9822E] bg-[#C9822E]/5 font-bold text-[#1B2A4A]' 
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={settings.showConfetti}
                    onChange={(e) => {
                      const updated = { ...settings, showConfetti: e.target.checked };
                      setSettings(updated);
                      pushHistory(updated);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-none border-[#E4E1D8] text-[#1B2A4A] focus:ring-0 mr-1"
                  />
                  <span>Confetti</span>
                  {selectedElement === 'confetti' && (
                    <span className="text-[8px] text-[#C9822E] font-bold ml-auto bg-[#C9822E]/10 px-1 py-0.5 font-sans">SELECTED</span>
                  )}
                </div>

                <div 
                  onClick={() => setSelectedElement('watermark')}
                  className={`flex items-center gap-2 font-mono text-[11px] text-zinc-700 cursor-pointer select-none p-2.5 border transition-all ${
                    selectedElement === 'watermark' 
                      ? 'border-[#C9822E] bg-[#C9822E]/5 font-bold text-[#1B2A4A]' 
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={settings.showWatermark}
                    onChange={(e) => {
                      const updated = { ...settings, showWatermark: e.target.checked };
                      setSettings(updated);
                      pushHistory(updated);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-none border-[#E4E1D8] text-[#1B2A4A] focus:ring-0 mr-1"
                  />
                  <span>Watermark</span>
                  {selectedElement === 'watermark' && (
                    <span className="text-[8px] text-[#C9822E] font-bold ml-auto bg-[#C9822E]/10 px-1 py-0.5 font-sans">SELECTED</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'text' && selectedElement && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E4E1D8]/60 pb-1.5">
                <span className="text-xs font-mono font-bold text-[#1B2A4A] uppercase tracking-wider">
                  Formatting Selected: {selectedElement.toUpperCase()}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 bg-zinc-200/60 px-1.5 py-0.5">
                  DRAG ON CANVAS TO MOVE ANYWHERE
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                {/* Text Input Content */}
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-600 uppercase">Text Value</label>
                  <input
                    type="text"
                    value={selectedElement === 'name' ? settings.nameElement.text : settings.captionElement.text}
                    onChange={(e) => updateSelectedText('text', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E1D8] bg-white text-[#1B2A4A] focus:outline-none focus:border-[#C9822E]"
                  />
                </div>

                {/* Font Selector */}
                <div className="w-full md:w-48 space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-600 uppercase">Typography</label>
                  <select
                    value={selectedElement === 'name' ? settings.nameElement.font : settings.captionElement.font}
                    onChange={(e) => updateSelectedText('font', e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-[#E4E1D8] bg-white text-[#1B2A4A] focus:outline-none focus:border-[#C9822E]"
                  >
                    {FONTS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Font Size Slider */}
                <div className="w-full md:w-56 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-600">
                    <span className="uppercase">Font Size</span>
                    <span>{(selectedElement === 'name' ? settings.nameElement.size : settings.captionElement.size)}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="110"
                    value={selectedElement === 'name' ? settings.nameElement.size : settings.captionElement.size}
                    onChange={(e) => updateSelectedText('size', parseInt(e.target.value))}
                    className="w-full accent-[#C9822E] h-1 bg-zinc-200 cursor-pointer"
                  />
                </div>

                {/* Color Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-600 uppercase block">Color</label>
                  <div className="flex items-center gap-1.5">
                    {['#FFFFFF', '#FFE6AF', '#0F172A', '#10B981', '#EC4899', '#38BDF8', '#FBBF24', '#000000'].map((color) => (
                      <button
                        key={color}
                        onClick={() => updateSelectedText('color', color)}
                        className={`w-6 h-6 border transition-all ${
                          (selectedElement === 'name' ? settings.nameElement.color : settings.captionElement.color) === color 
                            ? 'border-black ring-2 ring-[#C9822E]/40' 
                            : 'border-zinc-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={selectedElement === 'name' ? settings.nameElement.color : settings.captionElement.color}
                      onChange={(e) => updateSelectedText('color', e.target.value)}
                      className="w-7 h-7 p-0 bg-transparent border border-zinc-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Draw Canvas implementation recreating canvasGenerator.ts templates perfectly, but parameterizing elements
function drawCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  img: HTMLImageElement,
  settings: CanvasSettings,
  style: TemplateStyle | 'custom',
  variantIdx: number,
  customTemplateImg?: HTMLImageElement | null,
  customTemplateSlot?: { x: number; y: number; w: number; h: number } | null
) {
  const isVarA = variantIdx === 0;
  const presets = getBackgroundPresets(style, variantIdx);
  const activePreset = presets[settings.backgroundPresetIdx] || presets[0];

  // Draw Background
  if (activePreset.gradient.includes('linear-gradient')) {
    // Parse linear gradient
    const parts = activePreset.gradient.match(/#[A-Za-z0-9]+/g);
    if (parts && parts.length >= 2) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, parts[0]);
      grad.addColorStop(1, parts[parts.length - 1]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#1A0B2E';
    }
  } else {
    ctx.fillStyle = activePreset.gradient;
  }
  ctx.fillRect(0, 0, w, h);

  // Style rendering logic
  if (style === 'custom') {
    // 1. Draw template background design
    if (customTemplateImg) {
      ctx.drawImage(customTemplateImg, 0, 0, w, h);
    }

    // 2. Draw user photo inside custom slot bounds
    if (customTemplateSlot) {
      const slotX = (customTemplateSlot.x / 100) * w;
      const slotY = (customTemplateSlot.y / 100) * h;
      const slotW = (customTemplateSlot.w / 100) * w;
      const slotH = (customTemplateSlot.h / 100) * h;

      ctx.save();
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotW, slotH);
      ctx.closePath();
      ctx.clip();

      if (variantIdx === 1) { // Grayscale for Custom Var B
        ctx.filter = 'grayscale(100%) contrast(120%)';
      }

      drawUserPhoto(ctx, img, slotX, slotY, slotW, slotH, settings, 0.3);
      ctx.restore();
    }

    // Confetti or decorative stars
    if (settings.showConfetti) {
      drawStar(ctx, 150, 150, 20, 8, '#FFD700');
      drawStar(ctx, 850, 180, 18, 7, '#FF69B4');
      drawStar(ctx, 200, 750, 15, 6, '#00FFFF');
      drawStar(ctx, 800, 780, 22, 9, '#32CD32');
    }

    // Outer frame border
    if (settings.showBorders) {
      ctx.strokeStyle = '#C9822E';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, w - 40, h - 40);
    }
  } else if (style === 'festival') {
    if (isVarA) {
      // Background geometric grid lines (Ornaments)
      if (settings.showOrnaments) {
        ctx.strokeStyle = 'rgba(218, 165, 32, 0.08)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= w; i += 80) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }
        
        // Corner Ornaments
        drawCornerDecors(ctx, w, h, '#DAA520');
        // Hanging Lanterns
        drawLantern(ctx, 150, 0, 160, '#DAA520');
        drawLantern(ctx, 850, 0, 160, '#DAA520');
      }

      // Outer gold border (Borders)
      if (settings.showBorders) {
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, w - 80, h - 80);
        ctx.strokeStyle = '#8B6508';
        ctx.lineWidth = 1;
        ctx.strokeRect(46, 46, w - 92, h - 92);
      }

      // Portrait frame and drawing
      ctx.save();
      ctx.beginPath();
      ctx.arc(500, 350, 175, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawUserPhoto(ctx, img, 325, 175, 350, 350, settings, 0.25);
      ctx.restore();

      // Gold circular frame ring
      if (settings.showBorders) {
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(500, 350, 175, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(500, 350, 178, 0, Math.PI * 2); ctx.stroke();
      }

      // Sparkles (Confetti)
      if (settings.showConfetti) {
        drawStar(ctx, 220, 280, 20, 8, '#DAA520');
        drawStar(ctx, 780, 300, 16, 6, '#DAA520');
        drawStar(ctx, 180, 520, 12, 5, '#DAA520');
        drawStar(ctx, 820, 490, 18, 7, '#DAA520');
      }

      // HEADER TEXT
      if (settings.showOrnaments) {
        ctx.fillStyle = '#DAA520';
        ctx.font = 'bold 22px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦  S E A S O N \' S   G R E E T I N G S  ✦', 500, 115);
      }

    } else {
      // Festival Var B: Cyber Space
      if (settings.showOrnaments) {
        // Neon Diagonal laser lines
        ctx.strokeStyle = 'rgba(254, 1, 154, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();

        drawStar(ctx, 200, 250, 25, 10, '#00F2FE');
        drawStar(ctx, 820, 280, 22, 8, '#FE019A');
      }

      if (settings.showConfetti) {
        drawStar(ctx, 150, 480, 18, 7, '#FFD700');
        drawStar(ctx, 850, 520, 24, 9, '#00FF66');
      }

      if (settings.showBorders) {
        ctx.strokeStyle = '#00F2FE';
        ctx.lineWidth = 4;
        ctx.strokeRect(40, 40, w - 80, h - 80);
      }

      // Rotated Photo Frame (Festival Var B is slightly rotated)
      ctx.save();
      ctx.translate(500, 350);
      ctx.rotate(-4 * Math.PI / 180);
      ctx.beginPath();
      ctx.rect(-165, -165, 330, 330);
      ctx.closePath();
      ctx.clip();
      
      // We simulate translated coordinate system for drawing zoomed/panned photo
      ctx.save();
      // Translate back so user photo helper operates properly
      ctx.translate(-500, -350);
      drawUserPhoto(ctx, img, 335, 185, 330, 330, settings, 0.3);
      ctx.restore();
      ctx.restore();

      // Neon Frame
      if (settings.showBorders) {
        ctx.save();
        ctx.translate(500, 350);
        ctx.rotate(-4 * Math.PI / 180);
        ctx.strokeStyle = '#FE019A';
        ctx.lineWidth = 5;
        ctx.strokeRect(-165, -165, 330, 330);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-168, -168, 336, 336);
        ctx.restore();
      }

      if (settings.showOrnaments) {
        ctx.fillStyle = '#00F2FE';
        ctx.font = '900 24px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FESTIVAL MODE // CYBER EXPOSURE', 500, 120);
      }
    }
  } else if (style === 'idcard') {
    if (isVarA) {
      // ID Card Var A: Executive Slate-Navy
      // Draw Inner white card container
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(150, 120, 700, 760);
      
      if (settings.showBorders) {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 12;
        ctx.strokeRect(150, 120, 700, 760);
      }

      // Top Navy Header
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(156, 126, 688, 110);

      // Card Header text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SECURE IDENTIFICATION', 500, 175);
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('CLEARANCE AUTHORITY LEVEL: A-9', 500, 205);

      // User Photo Frame
      ctx.save();
      ctx.beginPath();
      ctx.rect(350, 280, 300, 380);
      ctx.closePath();
      ctx.clip();
      drawUserPhoto(ctx, img, 350, 280, 300, 380, settings, 0.2);
      ctx.restore();

      if (settings.showBorders) {
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 5;
        ctx.strokeRect(350, 280, 300, 380);
      }

      // ID Card accessories (Ornaments)
      if (settings.showOrnaments) {
        // Holographic seal
        ctx.fillStyle = 'rgba(201, 130, 46, 0.15)';
        ctx.beginPath(); ctx.arc(740, 320, 45, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(201, 130, 46, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(740, 320, 45, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(201, 130, 46, 0.5)';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText('SECURE', 740, 317);
        ctx.fillText('VALID', 740, 329);

        // Barcode at bottom
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 40; i++) {
          const wBar = (i % 3 === 0) ? 6 : (i % 2 === 0) ? 3 : 1;
          ctx.fillRect(320 + i * 9, 810, wBar, 40);
        }
      }
    } else {
      // ID Card Var B: Cyberpunk Neon Green Pass
      if (settings.showBorders) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, w - 80, h - 80);
        // Neon corners
        drawCyberCorners(ctx, w, h, '#10B981');
      }

      if (settings.showOrnaments) {
        // Cyber barcode lines or grids
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 80; i < w - 80; i += 40) {
          ctx.beginPath(); ctx.moveTo(i, 80); ctx.lineTo(i, h - 80); ctx.stroke();
        }
        
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('>> CYBERNETIC CLEARANCE AUTHENTICATED <<', 500, 110);
      }

      // User photo slot
      ctx.save();
      ctx.beginPath();
      ctx.rect(350, 250, 300, 360);
      ctx.closePath();
      ctx.clip();
      drawUserPhoto(ctx, img, 350, 250, 300, 360, settings, 0.25);
      ctx.restore();

      if (settings.showBorders) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.strokeRect(350, 250, 300, 360);
      }

      // Tech details (Ornaments)
      if (settings.showOrnaments) {
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(500, 430, 210, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText('[ ACCESS STATUS: FULL MASTER ]', 500, 645);
      }
    }
  } else if (style === 'birthday') {
    if (isVarA) {
      // Birthday Var A: Pastel Polaroid Celebration
      if (settings.showOrnaments) {
        // Upper Buntings
        drawBuntingTriangles(ctx, w, '#F472B6', '#38BDF8', '#FBBF24');
        // Decorative Balloons
        drawBalloon(ctx, 160, 280, 50, '#F472B6');
        drawBalloon(ctx, 840, 250, 60, '#38BDF8');
      }

      // Polaroid Frame (Borders)
      if (settings.showBorders) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(260, 180, 480, 560);
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.strokeRect(260, 180, 480, 560);
      }

      // User photo inside Polaroid
      ctx.save();
      ctx.beginPath();
      ctx.rect(285, 205, 430, 420);
      ctx.closePath();
      ctx.clip();
      drawUserPhoto(ctx, img, 285, 205, 430, 420, settings, 0.22);
      ctx.restore();

      if (settings.showBorders) {
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 2;
        ctx.strokeRect(285, 205, 430, 420);
      }

      if (settings.showConfetti) {
        drawConfettiParticles(ctx, w, h);
      }

      if (settings.showOrnaments) {
        ctx.fillStyle = '#EC4899';
        ctx.font = 'bold 36px "Playfair Display", serif';
        ctx.textAlign = 'center';
        ctx.fillText('Happy Birthday!', 500, 130);
      }
    } else {
      // Birthday Var B: Retro Wave Geometric
      if (settings.showOrnaments) {
        // Perspective Grid Lines
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)';
        ctx.lineWidth = 1.5;
        for (let i = -100; i <= w + 100; i += 80) {
          ctx.beginPath(); ctx.moveTo(500, 300); ctx.lineTo(i, h); ctx.stroke();
        }
        for (let i = 300; i < h; i += 50) {
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }

        // Retrowave Glowing Sun
        const sunGrad = ctx.createLinearGradient(0, 100, 0, 340);
        sunGrad.addColorStop(0, '#F59E0B');
        sunGrad.addColorStop(1, '#EC4899');
        ctx.fillStyle = sunGrad;
        ctx.beginPath(); ctx.arc(500, 240, 110, Math.PI, 0); ctx.fill();

        // Horizontal sun cuts
        ctx.fillStyle = activePreset.gradient.includes('linear') ? '#1E1B4B' : activePreset.gradient;
        for (let sy = 160; sy < 240; sy += 16) {
          ctx.fillRect(380, sy, 240, 4);
        }

        // Star sparkles
        drawStar(ctx, 150, 300, 30, 12, '#EC4899');
        drawStar(ctx, 850, 350, 25, 10, '#38BDF8');
        drawStar(ctx, 300, 720, 18, 7, '#FBBF24');
      }

      // Rotated Photo Frame (slightly 5 deg)
      ctx.save();
      ctx.translate(500, 410);
      ctx.rotate(5 * Math.PI / 180);
      ctx.beginPath();
      ctx.rect(-160, -160, 320, 320);
      ctx.closePath();
      ctx.clip();
      
      // We simulate translated coordinate system
      ctx.save();
      ctx.translate(-500, -410);
      drawUserPhoto(ctx, img, 340, 250, 320, 320, settings, 0.25);
      ctx.restore();
      ctx.restore();

      // Double Neon Borders
      if (settings.showBorders) {
        ctx.save();
        ctx.translate(500, 410);
        ctx.rotate(5 * Math.PI / 180);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 5;
        ctx.strokeRect(-160, -160, 320, 320);
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-164, -164, 328, 328);
        ctx.restore();
      }

      if (settings.showOrnaments) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 32px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('P A R T Y   S T A R !', 500, 120);
      }
    }
  } else if (style === 'linkedin') {
    if (isVarA) {
      // LinkedIn Var A: Deep Ocean Tech
      if (settings.showOrnaments) {
        // Modern technology dots & constellation connections
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1.5;
        const pts = [
          { x: 120, y: 150 }, { x: 450, y: 180 }, { x: 280, y: 720 },
          { x: 1400, y: 150 }, { x: 1100, y: 220 }, { x: 1300, y: 700 },
          { x: 1450, y: 550 }, { x: 920, y: 750 }
        ];
        pts.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
        });
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y);
        ctx.moveTo(pts[1].x, pts[1].y); ctx.lineTo(pts[2].x, pts[2].y);
        ctx.moveTo(pts[3].x, pts[3].y); ctx.lineTo(pts[4].x, pts[4].y);
        ctx.moveTo(pts[4].x, pts[4].y); ctx.lineTo(pts[5].x, pts[5].y);
        ctx.moveTo(pts[5].x, pts[5].y); ctx.lineTo(pts[6].x, pts[6].y);
        ctx.stroke();

        // Geometric grid overlay
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= w; i += 100) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }
      }

      // User Profile Photo Slot (Circular left aligned)
      ctx.save();
      ctx.beginPath();
      ctx.arc(350, 450, 210, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawUserPhoto(ctx, img, 140, 240, 420, 420, settings, 0.25);
      ctx.restore();

      if (settings.showBorders) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(350, 450, 210, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(350, 450, 214, 0, Math.PI * 2); ctx.stroke();
      }

      // Capsule badges (Ornaments)
      if (settings.showOrnaments) {
        drawCapsuleBadge(ctx, 660, 520, '✦ LEADERSHIP', '#1E293B', '#38BDF8');
        drawCapsuleBadge(ctx, 810, 520, '✦ PRODUCT STRATEGY', '#1E293B', '#38BDF8');
        drawCapsuleBadge(ctx, 1025, 520, '✦ SCALABLE ARCHITECTURES', '#1E293B', '#38BDF8');
      }

    } else {
      // LinkedIn Var B: Luxury Executive Gold
      if (settings.showOrnaments) {
        // Luxury rays
        const gradRay = ctx.createLinearGradient(0, 0, w, h);
        gradRay.addColorStop(0, 'rgba(212, 197, 179, 0.08)');
        gradRay.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradRay;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

        // Mesh gold lines
        ctx.strokeStyle = 'rgba(212, 197, 179, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w - 400, 0); ctx.lineTo(w, h - 300);
        ctx.moveTo(w - 200, 0); ctx.lineTo(w, h - 100);
        ctx.moveTo(0, h - 200); ctx.lineTo(400, h);
        ctx.stroke();

        ctx.fillStyle = '#D4C5B3';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.fillText('✦  E X E C U T I V E   P O R T F O L I O  ✦', 680, 250);
      }

      // Square photo slot with double gold border
      ctx.save();
      ctx.beginPath();
      ctx.rect(150, 175, 450, 450);
      ctx.closePath();
      ctx.clip();
      drawUserPhoto(ctx, img, 150, 175, 450, 450, settings, 0.28);
      ctx.restore();

      if (settings.showBorders) {
        ctx.strokeStyle = '#D4C5B3';
        ctx.lineWidth = 4;
        ctx.strokeRect(150, 175, 450, 450);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(144, 169, 462, 462);
      }

      if (settings.showOrnaments) {
        // Core Capabilities list
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText('SERVICES:  ADVISORY  ✦  BRAND CAPITAL  ✦  CORPORATE VENTURING', 680, 540);
      }
    }
  }

  // DRAW EDITABLE TEXTS OVER LAYERS
  const align = style === 'linkedin' ? 'left' : 'center';

  // Draw Name
  ctx.fillStyle = settings.nameElement.color;
  ctx.font = `bold ${settings.nameElement.size}px ${settings.nameElement.font}`;
  ctx.textAlign = align;
  ctx.fillText(settings.nameElement.text.toUpperCase(), settings.nameElement.x, settings.nameElement.y);

  // Draw Caption
  ctx.fillStyle = settings.captionElement.color;
  ctx.font = `${settings.captionElement.size}px ${settings.captionElement.font}`;
  ctx.textAlign = align;
  
  // Wrap text nicely for caption since it can be long
  const maxWidth = style === 'linkedin' ? 850 : 750;
  wrapText(ctx, settings.captionElement.text, settings.captionElement.x, settings.captionElement.y, maxWidth, settings.captionElement.size * 1.35);

  // Draw Watermark if enabled
  if (settings.showWatermark) {
    ctx.fillStyle = style === 'idcard' && isVarA ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('DEVELOPED WITH PIXCRAFT // EXPOSURE ENGINE A-1', w - 50, h - 45);
  }
}

// Wrap text helper
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

// User Photo Cropping, zooming and panning helper
function drawUserPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  settings: CanvasSettings,
  defaultVerticalOffset: number
) {
  const { photoX, photoY, photoZoom } = settings;
  const imgW = img.width;
  const imgH = img.height;

  const slotAspect = w / h;
  const imgAspect = imgW / imgH;

  let sWidth = imgW;
  let sHeight = imgH;

  if (imgAspect > slotAspect) {
    sWidth = imgH * slotAspect;
  } else {
    sHeight = imgW / slotAspect;
  }

  // Dynamic zoom scaling
  const zoomedSWidth = sWidth / photoZoom;
  const zoomedSHeight = sHeight / photoZoom;

  // Compute standard center and vertical offset
  let sx = (imgW - zoomedSWidth) / 2;
  let sy = (imgH - zoomedSHeight) * defaultVerticalOffset;

  // Apply visual panning offsets (scaled from viewport delta down to image resource crop coordinates)
  const sourcePanScale = sWidth / w;
  sx -= photoX * sourcePanScale;
  sy -= photoY * sourcePanScale;

  try {
    ctx.drawImage(img, sx, sy, zoomedSWidth, zoomedSHeight, x, y, w, h);
  } catch (err) {
    // Fallback if coordinates clamp or overshoot boundaries unexpectedly
    ctx.drawImage(img, 0, 0, imgW, imgH, x, y, w, h);
  }
}

// Geometric & ornamental helpers
function drawStar(ctx: CanvasRenderingContext2D, sx: number, sy: number, rOut: number, rIn: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const alpha = (Math.PI / 2) + (i * 2 * Math.PI / 5);
    ctx.lineTo(sx + Math.cos(alpha) * rOut, sy - Math.sin(alpha) * rOut);
    const beta = (Math.PI / 2) + (i * 2 * Math.PI / 5) + (Math.PI / 5);
    ctx.lineTo(sx + Math.cos(beta) * rIn, sy - Math.sin(beta) * rIn);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCornerDecors(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  // Top-left
  ctx.beginPath(); ctx.moveTo(50, 80); ctx.lineTo(50, 50); ctx.lineTo(80, 50); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(w - 50, 80); ctx.lineTo(w - 50, 50); ctx.lineTo(w - 80, 50); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(50, h - 80); ctx.lineTo(50, h - 50); ctx.lineTo(80, h - 50); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(w - 50, h - 80); ctx.lineTo(w - 50, h - 50); ctx.lineTo(w - 80, h - 50); ctx.stroke();
}

function drawLantern(ctx: CanvasRenderingContext2D, lx: number, ly: number, len: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + len); ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(lx - 12, ly + len, 24, 30);
  ctx.beginPath(); ctx.moveTo(lx, ly + len + 30); ctx.lineTo(lx, ly + len + 48); ctx.stroke();
}

function drawCyberCorners(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  // top-left
  ctx.beginPath(); ctx.moveTo(35, 60); ctx.lineTo(35, 35); ctx.lineTo(60, 35); ctx.stroke();
  // top-right
  ctx.beginPath(); ctx.moveTo(w - 35, 60); ctx.lineTo(w - 35, 35); ctx.lineTo(w - 60, 35); ctx.stroke();
}

function drawBuntingTriangles(ctx: CanvasRenderingContext2D, w: number, ...colors: string[]) {
  const steps = 8;
  const stepW = w / steps;
  for (let i = 0; i < steps; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(i * stepW, 0);
    ctx.lineTo((i + 1) * stepW, 0);
    ctx.lineTo((i + 0.5) * stepW, 35);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBalloon(ctx: CanvasRenderingContext2D, bx: number, by: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx - r/3, by - r/3, r/4, 0, Math.PI * 2); ctx.stroke();
  // balloon tail
  ctx.beginPath();
  ctx.moveTo(bx, by + r);
  ctx.quadraticCurveTo(bx + 15, by + r + 30, bx, by + r + 60);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawConfettiParticles(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const conf = [
    { x: 100, y: 150, r: 4, c: '#F472B6' },
    { x: 800, y: 120, r: 5, c: '#38BDF8' },
    { x: 200, y: 700, r: 6, c: '#FBBF24' },
    { x: 850, y: 650, r: 4, c: '#34D399' }
  ];
  conf.forEach(p => {
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });
}

function drawCapsuleBadge(ctx: CanvasRenderingContext2D, bx: number, by: number, txt: string, bg: string, stroke: string) {
  ctx.fillStyle = bg;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, ctx.measureText(txt).width + 24, 30, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.fillText(txt, bx + 12, by + 19);
}

// Returns the initial canvas settings matching standard layout
function getInitialSettings(style: TemplateStyle | 'custom', variantIdx: number, name: string, caption: string): CanvasSettings {
  const isVarA = variantIdx === 0;
  
  let nameX = 500;
  let nameY = 680;
  let nameSize = 44;
  let nameColor = '#FFFFFF';
  let nameFont = style === 'festival' ? '"Playfair Display", serif' : '"Inter", sans-serif';
  
  let captionX = 500;
  let captionY = 780;
  let captionSize = 28;
  let captionColor = '#FFE6AF';
  let captionFont = style === 'festival' ? '"Playfair Display", serif' : '"Inter", sans-serif';

  if (style === 'custom') {
    nameX = 500; nameY = 820; nameSize = 36; nameColor = '#FFFFFF'; nameFont = '"Inter", sans-serif';
    captionX = 500; captionY = 880; captionSize = 20; captionColor = '#FFE6AF'; captionFont = '"Inter", sans-serif';
  } else if (style === 'festival') {
    if (!isVarA) {
      nameX = 500; nameY = 680; nameSize = 46; nameColor = '#FFFFFF'; nameFont = '"Space Grotesk", sans-serif';
      captionX = 500; captionY = 757; captionSize = 22; captionColor = '#FFFFFF'; captionFont = '"Inter", sans-serif';
    } else {
      nameX = 500; nameY = 680; nameSize = 44; nameColor = '#FFFFFF'; nameFont = '"Playfair Display", serif';
      captionX = 500; captionY = 780; captionSize = 28; captionColor = '#FFE6AF'; captionFont = '"Playfair Display", serif';
    }
  } else if (style === 'idcard') {
    if (isVarA) {
      nameX = 500; nameY = 735; nameSize = 36; nameColor = '#0F172A'; nameFont = '"Inter", sans-serif';
      captionX = 500; captionY = 775; captionSize = 18; captionColor = '#64748B'; captionFont = '"Inter", sans-serif';
    } else {
      nameX = 500; nameY = 700; nameSize = 44; nameColor = '#10B981'; nameFont = '"JetBrains Mono", monospace';
      captionX = 500; captionY = 755; captionSize = 20; captionColor = '#A7F3D0'; captionFont = '"JetBrains Mono", monospace';
    }
  } else if (style === 'birthday') {
    if (isVarA) {
      nameX = 500; nameY = 675; nameSize = 36; nameColor = '#1E293B'; nameFont = '"Playfair Display", serif';
      captionX = 500; captionY = 785; captionSize = 24; captionColor = '#6D28D9'; captionFont = 'Georgia, serif';
    } else {
      nameX = 500; nameY = 630; nameSize = 56; nameColor = '#FBBF24'; nameFont = '"Space Grotesk", sans-serif';
      captionX = 500; captionY = 700; captionSize = 28; captionColor = '#E879F9'; captionFont = '"Inter", sans-serif';
    }
  } else if (style === 'linkedin') {
    if (isVarA) {
      nameX = 660; nameY = 360; nameSize = 72; nameColor = '#FFFFFF'; nameFont = '"Space Grotesk", sans-serif';
      captionX = 660; captionY = 435; captionSize = 36; captionColor = '#38BDF8'; captionFont = '"Inter", sans-serif';
    } else {
      nameX = 680; nameY = 375; nameSize = 80; nameColor = '#FFFFFF'; nameFont = '"Playfair Display", serif';
      captionX = 680; captionY = 455; captionSize = 34; captionColor = '#D4C5B3'; captionFont = 'Georgia, serif';
    }
  }

  return {
    photoX: 0,
    photoY: 0,
    photoZoom: 1.0,
    backgroundPresetIdx: 0,
    showBorders: true,
    showOrnaments: true,
    showConfetti: true,
    showWatermark: true,
    nameElement: {
      text: name || (style === 'festival' ? "HAPPY HOLIDAYS" : style === 'idcard' ? "IDENTIFICATION HOLDER" : style === 'birthday' ? "BIRTHDAY STAR" : style === 'custom' ? "CUSTOM CELEBRATION" : "PROFESSIONAL PORTFOLIO"),
      x: nameX,
      y: nameY,
      color: nameColor,
      size: nameSize,
      font: nameFont,
    },
    captionElement: {
      text: caption || (style === 'festival' ? "May peace, health, and prosperity light up your path." : style === 'idcard' ? "ACCESS PROFILE VERIFIED" : style === 'birthday' ? "Sending you smiles, sunshine, and warm celebration." : style === 'custom' ? "MANUALLY MAPPED EXPOSURE" : "CREATIVE ENTERPRISE SOLUTIONS"),
      x: captionX,
      y: captionY,
      color: captionColor,
      size: captionSize,
      font: captionFont,
    },
  };
}

// 4 Custom beautiful presets per style & variant combination
function getBackgroundPresets(style: TemplateStyle | 'custom', variantIdx: number) {
  const isVarA = variantIdx === 0;
  if (style === 'custom') {
    return [
      { gradient: 'linear-gradient(135deg, #1E1B4B 0%, #111827 100%)', label: 'Dark Indigo' },
      { gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', label: 'Slate Velvet' },
      { gradient: 'linear-gradient(135deg, #311042 0%, #0F0214 100%)', label: 'Cosmic Plum' },
      { gradient: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)', label: 'Clean Light' }
    ];
  }
  if (style === 'festival') {
    return isVarA
      ? [
          { gradient: 'linear-gradient(135deg, #581014 0%, #140103 100%)', label: 'Crimson Wine' },
          { gradient: 'linear-gradient(135deg, #0A3622 0%, #051B10 100%)', label: 'Emerald Forest' },
          { gradient: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)', label: 'Midnight Ocean' },
          { gradient: 'linear-gradient(135deg, #3B0A2B 0%, #170211 100%)', label: 'Velvet Plum' }
        ]
      : [
          { gradient: 'linear-gradient(135deg, #060613 0%, #120521 100%)', label: 'Cosmic Neon' },
          { gradient: 'linear-gradient(135deg, #04151F 0%, #0A3040 100%)', label: 'Cyber Tech' },
          { gradient: 'linear-gradient(135deg, #081C15 0%, #1B4332 100%)', label: 'Toxic Green' },
          { gradient: 'linear-gradient(135deg, #1A0B2E 0%, #3D0B3C 100%)', label: 'Synthwave Glow' }
        ];
  } else if (style === 'idcard') {
    return isVarA
      ? [
          { gradient: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)', label: 'Classic Corporate' },
          { gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', label: 'Secure Mint' },
          { gradient: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', label: 'Crimson Guard' },
          { gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', label: 'Dark Obsidian' }
        ]
      : [
          { gradient: '#09090D', label: 'Matrix Dark' },
          { gradient: '#120505', label: 'Volcanic Core' },
          { gradient: '#050D14', label: 'Electric Blue' },
          { gradient: '#0D0E05', label: 'Acid Yellow' }
        ];
  } else if (style === 'birthday') {
    return isVarA
      ? [
          { gradient: 'linear-gradient(135deg, #FFF5F5 0%, #FFEBEB 100%)', label: 'Pastel Blush' },
          { gradient: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', label: 'Sweet Lilac' },
          { gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', label: 'Lemon Sunshine' },
          { gradient: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)', label: 'Soft Sage' }
        ]
      : [
          { gradient: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 100%)', label: 'Cyber Purple' },
          { gradient: 'linear-gradient(135deg, #022C22 0%, #064E3B 100%)', label: 'Vapor Forest' },
          { gradient: 'linear-gradient(135deg, #7C2D12 0%, #9D174D 100%)', label: 'Arcade Sunset' },
          { gradient: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)', label: 'Stealth Retro' }
        ];
  } else {
    // linkedin
    return isVarA
      ? [
          { gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', label: 'Executive Slate' },
          { gradient: 'linear-gradient(135deg, #022C22 0%, #064E3B 100%)', label: 'Tech Emerald' },
          { gradient: 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)', label: 'Corporate Blue' },
          { gradient: 'linear-gradient(135deg, #18181B 0%, #27272A 100%)', label: 'Minimal Carbon' }
        ]
      : [
          { gradient: 'linear-gradient(135deg, #121211 0%, #222220 100%)', label: 'Luxury Onyx' },
          { gradient: 'linear-gradient(135deg, #1C110A 0%, #2E1E12 100%)', label: 'Royal Bronze' },
          { gradient: 'linear-gradient(135deg, #190406 0%, #2D0B0E 100%)', label: 'Deep Burgundy' },
          { gradient: 'linear-gradient(135deg, #051614 0%, #0B2B28 100%)', label: 'Peacock Emerald' }
        ];
  }
}
