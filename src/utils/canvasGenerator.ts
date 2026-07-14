/**
 * Client-side HTML Canvas Template Generation Engine
 * Handles image rendering, scaling (cover-fit), filters, text drawing, and custom decorative overlays.
 * Completely local, zero external APIs, zero API keys.
 */

import { TemplateStyle } from '../types';

interface GenerationParams {
  imageSrc: string; // Base64 data URL
  templateStyle: TemplateStyle;
  name: string;
  caption: string;
  photoMode: 'face' | 'object';
}

/**
 * Loads a base64 image URL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image for canvas. ' + err));
    img.src = src;
  });
}

/**
 * Draws an image with "cover" fit inside a rectangular area on a canvas context.
 * Optional verticalOffset can adjust cropping (e.g., 0.3 to keep more top of image/hair).
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  verticalOffset = 0.3 // 0 is top, 0.5 is middle, 1 is bottom. 0.3 is excellent for portraits to prevent cutting heads
) {
  const imgW = img.width;
  const imgH = img.height;
  
  const slotAspect = w / h;
  const imgAspect = imgW / imgH;
  
  let sx = 0;
  let sy = 0;
  let sWidth = imgW;
  let sHeight = imgH;
  
  if (imgAspect > slotAspect) {
    // Image is wider than slot: crop sides
    sWidth = imgH * slotAspect;
    sx = (imgW - sWidth) / 2;
  } else {
    // Image is taller than slot: crop top/bottom
    sHeight = imgW / slotAspect;
    sy = (imgH - sHeight) * verticalOffset;
  }
  
  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

/**
 * Helper to draw a rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Helper to draw a pop-art star shape
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  rOut: number,
  rIn: number,
  color: string
) {
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
}

/**
 * Generates client-side template variations.
 * Returns a promise resolving to an array of 2 base64 PNG data URLs (Variation A and Variation B).
 */
export async function generateClientSideTemplate(params: GenerationParams): Promise<string[]> {
  const { imageSrc, templateStyle, name, caption, photoMode } = params;
  
  // 1. Load the pre-filtered user uploaded photo
  const userImg = await loadImage(imageSrc);
  
  // 2. We will generate 2 canvas designs (Variation A and Variation B)
  const varA = await renderVariationA(userImg, templateStyle, name, caption, photoMode);
  const varB = await renderVariationB(userImg, templateStyle, name, caption, photoMode);
  
  return [varA, varB];
}

// ==========================================
// RENDER VARIATION A: Elegant & Classic
// ==========================================
async function renderVariationA(
  userImg: HTMLImageElement,
  style: TemplateStyle,
  name: string,
  caption: string,
  photoMode: 'face' | 'object'
): Promise<string> {
  const canvas = document.createElement('canvas');
  const isLinkedin = style === 'linkedin';
  
  // Resolution: 1000x1000 for regular cards, 1600x900 for LinkedIn banners
  const width = isLinkedin ? 1600 : 1000;
  const height = isLinkedin ? 900 : 1000;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');
  
  // Setup nice base anti-aliasing text qualities
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  
  if (style === 'festival') {
    // ------------------------------------------
    // FESTIVAL GREETING (Variation A - Elegant Gold & Burgundy)
    // ------------------------------------------
    // Background Burgundy Gradient
    const bgGrad = ctx.createRadialGradient(500, 500, 100, 500, 500, 700);
    bgGrad.addColorStop(0, '#581014');
    bgGrad.addColorStop(0.5, '#2D0609');
    bgGrad.addColorStop(1, '#140103');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Draw Ornate Background Pattern (subtle gold grid/lines)
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 50; i < 1000; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 50);
      ctx.lineTo(i, 950);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(50, i);
      ctx.lineTo(950, i);
      ctx.stroke();
    }
    
    // Gold Thin Border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 920, 920);
    
    // Corner Golden Accents
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    const drawCornerOrnament = (cx: number, cy: number, rot: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(40, 0);
      ctx.quadraticCurveTo(20, 20, 0, 40);
      ctx.closePath();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(20, 20, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#D4AF37';
      ctx.fill();
      ctx.restore();
    };
    drawCornerOrnament(45, 45, 0);
    drawCornerOrnament(955, 45, Math.PI / 2);
    drawCornerOrnament(955, 955, Math.PI);
    drawCornerOrnament(45, 955, -Math.PI / 2);
    
    // Draw hanging festive lanterns
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2;
    // Left Lantern string
    ctx.beginPath(); ctx.moveTo(200, 40); ctx.lineTo(200, 140); ctx.stroke();
    // Left Lantern body
    ctx.fillStyle = '#C94046';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 175, 140, 50, 70, 10);
    ctx.fill(); ctx.stroke();
    // Lantern glow
    ctx.fillStyle = 'rgba(255, 223, 122, 0.3)';
    ctx.beginPath(); ctx.arc(200, 175, 40, 0, Math.PI * 2); ctx.fill();
    
    // Right Lantern string
    ctx.beginPath(); ctx.moveTo(800, 40); ctx.lineTo(800, 140); ctx.stroke();
    // Right Lantern body
    ctx.fillStyle = '#C94046';
    drawRoundedRect(ctx, 775, 140, 50, 70, 10);
    ctx.fill(); ctx.stroke();
    // Lantern glow
    ctx.beginPath(); ctx.arc(800, 175, 40, 0, Math.PI * 2); ctx.fill();
    
    // PHOTO SLOT: Centered circular window
    const cx = 500;
    const cy = 350;
    const radius = 175;
    
    ctx.save();
    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    
    // Draw user image centered in slot
    drawImageCover(ctx, userImg, cx - radius, cy - radius, radius * 2, radius * 2, photoMode === 'face' ? 0.25 : 0.4);
    ctx.restore();
    
    // Ornate Golden Metallic Circle Frame
    const goldGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    goldGrad.addColorStop(0, '#AA7C11');
    goldGrad.addColorStop(0.25, '#F1D886');
    goldGrad.addColorStop(0.5, '#A0700B');
    goldGrad.addColorStop(0.75, '#FDF2C2');
    goldGrad.addColorStop(1, '#9C6C0A');
    
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Extra fine gold circle inside
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Floating magic sparkles
    ctx.fillStyle = 'rgba(255, 230, 150, 0.5)';
    for (let i = 0; i < 15; i++) {
      const angle = (i * 137.5) * Math.PI / 180;
      const dist = radius + 30 + (i * 5) % 80;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const size = 3 + (i % 4);
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // SEASON'S GREETINGS Text
    ctx.fillStyle = goldGrad;
    ctx.font = 'bold 50px "Playfair Display", "Georgia", serif';
    ctx.fillText("Season's Greetings", cx, 600);
    
    // Name Rendering
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px "Playfair Display", "Georgia", "Times New Roman", serif';
    ctx.fillText(name ? name.toUpperCase() : 'WISHING YOU JOY', cx, 680);
    
    // Decorative golden separator line
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(350, 725);
    ctx.lineTo(470, 725);
    ctx.arc(500, 725, 6, 0, Math.PI*2);
    ctx.moveTo(530, 725);
    ctx.lineTo(650, 725);
    ctx.stroke();
    
    // Caption/Greeting Text
    ctx.fillStyle = '#FFE6AF';
    ctx.font = 'italic 28px "Playfair Display", "Georgia", serif';
    const finalCaption = caption || "May peace, health, and prosperity light up your path.";
    ctx.fillText(finalCaption, cx, 780);
    
    // Extra celebration line at the bottom
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText('PIXCRAFT HOLIDAY EXCLUSIVES • LIMITED EDITION', cx, 840);
    
    // Subtle Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft', 930, 935);
    
  } else if (style === 'idcard') {
    // ------------------------------------------
    // PROFESSIONAL ID CARD (Variation A - Crisp Navy & White Executive)
    // ------------------------------------------
    // Full card background
    ctx.fillStyle = '#F1F5F9'; // Light silver gray
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Let's draw a professional crisp layout
    // Main card white background container with rounded border
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    drawRoundedRect(ctx, 80, 50, 840, 900, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Reset shadow
    
    // Navy top header banner
    ctx.fillStyle = '#1E293B'; // Executive slate-navy
    ctx.beginPath();
    ctx.roundRect(80, 50, 840, 180, [24, 24, 0, 0]);
    ctx.fill();
    
    // Professional mesh pattern in header
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 840; i += 30) {
      ctx.beginPath();
      ctx.moveTo(80 + i, 50);
      ctx.lineTo(80 + i, 230);
      ctx.stroke();
    }
    
    // Header texts
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 36px "Inter", "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('GLOBAL SECURITY SYSTEMS', 130, 115);
    
    ctx.fillStyle = '#38BDF8'; // Soft blue
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText('AUTHORIZED PERSONNEL ACCESS PASS', 130, 165);
    
    // Right side top emblem
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(820, 130, 25, 0, Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GS', 820, 135);
    
    // PHOTO SLOT: Crisp ID Portrait frame
    const pX = 350;
    const pY = 280;
    const pW = 300;
    const pH = 380;
    
    // User Photo cover fit
    ctx.save();
    drawRoundedRect(ctx, pX, pY, pW, pH, 12);
    ctx.clip();
    drawImageCover(ctx, userImg, pX, pY, pW, pH, photoMode === 'face' ? 0.15 : 0.4);
    ctx.restore();
    
    // Dark border around photo
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, pX, pY, pW, pH, 12);
    ctx.stroke();
    
    // Fine blue line around border
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, pX - 4, pY - 4, pW + 8, pH + 8, 15);
    ctx.stroke();
    
    // Barcode rendering (highly realistic)
    const bX = 350;
    const bY = 690;
    const bW = 300;
    const bH = 45;
    ctx.fillStyle = '#1E293B';
    // Generate randomized but structured barcode widths
    let currX = bX;
    const barcodePattern = [2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 1, 4, 3, 2, 1, 1, 3, 2, 2, 4, 1, 2, 1, 2, 3, 1, 4];
    while (currX < bX + bW) {
      for (const barW of barcodePattern) {
        if (currX + barW > bX + bW) break;
        ctx.fillRect(currX, bY, barW, bH);
        currX += barW + 2 + Math.floor(Math.random() * 3); // some spacing
      }
    }
    
    // Member Name
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px "Inter", "Helvetica", Arial, sans-serif';
    ctx.fillText(name ? name.toUpperCase() : 'IDENTIFICATION HOLDER', 500, 785);
    
    // Role/Caption
    ctx.fillStyle = '#64748B';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText(caption ? caption : 'ACCESS PROFILE VERIFIED', 500, 835);
    
    // Bottom level / division pill badge
    ctx.fillStyle = '#10B981'; // Green accent
    drawRoundedRect(ctx, 380, 875, 240, 44, 12);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText('CLEARANCE LEVEL 3', 500, 897);
    
    // Security Seal stamp in background
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(810, 780, 60, 0, Math.PI*2);
    ctx.stroke();
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.fillText('• VERIFIED • APPROVED • SECURE', 810, 780);
    
    // Watermark inside footer
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft ID System', 880, 925);
    
  } else if (style === 'birthday') {
    // ------------------------------------------
    // BIRTHDAY POSTER (Variation A - Sweet Pastel Polaroid Celebration)
    // ------------------------------------------
    // Pastel cream background
    const bgGrad = ctx.createLinearGradient(0, 0, 1000, 1000);
    bgGrad.addColorStop(0, '#FFF5F5'); // Blush pink
    bgGrad.addColorStop(0.5, '#FFFBF0'); // Soft yellow
    bgGrad.addColorStop(1, '#F0FDFA'); // Light mint
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Party bunting at the top
    const drawBunting = () => {
      const colors = ['#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#FF8AAE'];
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#94A3B8';
      ctx.beginPath();
      ctx.quadraticCurveTo(200, 80, 500, 50);
      ctx.quadraticCurveTo(800, 80, 1000, 40);
      ctx.stroke();
      
      // Draw hanging triangles
      for (let i = 0; i < 12; i++) {
        const tx = 40 + i * 85;
        const ty = 40 + Math.sin(i * 0.7) * 12;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(tx - 25, ty);
        ctx.lineTo(tx + 25, ty);
        ctx.lineTo(tx, ty + 45);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };
    drawBunting();
    
    // Drawing balloons floating from bottom corners
    const drawBalloon = (bx: number, by: number, r: number, color: string) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      
      // Balloon body
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Highlight glow
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(bx - r/3, by - r/3, r/4, 0, Math.PI*2);
      ctx.fill();
      
      // Tie knot at bottom
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(bx, by + r);
      ctx.lineTo(bx - 8, by + r + 10);
      ctx.lineTo(bx + 8, by + r + 10);
      ctx.closePath();
      ctx.fill();
      
      // Curvy string
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by + r + 10);
      ctx.quadraticCurveTo(bx + 20, by + r + 60, bx - 10, by + r + 120);
      ctx.stroke();
      
      ctx.restore();
    };
    
    drawBalloon(120, 800, 55, '#FF8AAE');
    drawBalloon(180, 750, 45, '#4D96FF');
    drawBalloon(880, 800, 60, '#FFD93D');
    drawBalloon(820, 730, 48, '#6BCB77');
    
    // POLAROID CONTAINER
    const polX = 260;
    const polY = 180;
    const polW = 480;
    const polH = 560;
    
    // Shadow under Polaroid
    ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
    drawRoundedRect(ctx, polX + 4, polY + 8, polW, polH, 16);
    ctx.fill();
    
    // White Polaroid frame
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, polX, polY, polW, polH, 16);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, polX, polY, polW, polH, 16);
    ctx.stroke();
    
    // Photo inside polaroid (Square aspect ratio slot)
    const slotX = polX + 25;
    const slotY = polY + 25;
    const slotW = polW - 50;
    const slotH = polH - 140; // 430x420 approx
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(slotX, slotY, slotW, slotH);
    ctx.clip();
    drawImageCover(ctx, userImg, slotX, slotY, slotW, slotH, photoMode === 'face' ? 0.2 : 0.4);
    ctx.restore();
    
    // Polaroid subtle inner shadow border
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 3;
    ctx.strokeRect(slotX, slotY, slotW, slotH);
    
    // Name written inside polaroid base (handwritten look)
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 36px "Courier New", "Georgia", serif';
    ctx.fillText(name ? `★ ${name.toUpperCase()} ★` : '★ BIRTHDAY STAR ★', 500, polY + polH - 60);
    
    // Confetti particles
    const confColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8AAE'];
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = confColors[i % confColors.length];
      const cx = 50 + Math.random() * 900;
      const cy = 100 + Math.random() * 800;
      // Skip polaroid area
      if (cx > polX - 20 && cx < polX + polW + 20 && cy > polY - 20 && cy < polY + polH + 20) continue;
      
      ctx.beginPath();
      if (i % 3 === 0) {
        // Draw star
        ctx.arc(cx, cy, 4 + (i%3), 0, Math.PI*2);
      } else {
        // Draw circle confetti
        ctx.arc(cx, cy, 3 + (i%4), 0, Math.PI*2);
      }
      ctx.fill();
    }
    
    // HAPPY BIRTHDAY Banner text
    ctx.fillStyle = '#FF6B6B';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.15)';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 64px "Playfair Display", "Georgia", serif';
    ctx.fillText("Happy Birthday!", 500, 130);
    ctx.shadowBlur = 0; // Reset
    
    // Warm birthday greeting text below polaroid
    ctx.fillStyle = '#6D28D9';
    ctx.font = 'italic 28px "Georgia", "Times New Roman", serif';
    const bdayCaption = caption || "Sending you smiles, sunshine, and warm celebration.";
    ctx.fillText(bdayCaption, 500, 810);
    
    ctx.fillStyle = '#BE185D';
    ctx.font = '600 20px "Inter", sans-serif';
    ctx.fillText("WISHING YOU A FABULOUS YEAR AHEAD!", 500, 865);
    
    // Subtle Watermark
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft Studio', 920, 950);
    
  } else if (style === 'linkedin') {
    // ------------------------------------------
    // LINKEDIN BANNER STYLE (Variation A - Deep Ocean Professional Tech Grid)
    // ------------------------------------------
    // Background deep tech blue
    const bgGrad = ctx.createLinearGradient(0, 0, 1600, 900);
    bgGrad.addColorStop(0, '#0F172A'); // Deep slate
    bgGrad.addColorStop(0.5, '#1E293B'); // Medium slate
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1600, 900);
    
    // Draw modern geometric grid overlay
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 1600; i += 60) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 900); ctx.stroke();
    }
    for (let i = 0; i < 900; i += 60) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1600, i); ctx.stroke();
    }
    
    // Abstract technology dots and constellation connections
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(850, 200); ctx.lineTo(1100, 350);
    ctx.lineTo(1300, 150); ctx.lineTo(1450, 450);
    ctx.lineTo(1250, 750); ctx.lineTo(1050, 600);
    ctx.stroke();
    
    // Connective circles
    const drawConstellationNode = (nx: number, ny: number) => {
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath(); ctx.arc(nx, ny, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath(); ctx.arc(nx, ny, 15, 0, Math.PI*2); ctx.fill();
    };
    drawConstellationNode(850, 200);
    drawConstellationNode(1100, 350);
    drawConstellationNode(1300, 150);
    drawConstellationNode(1450, 450);
    drawConstellationNode(1250, 750);
    drawConstellationNode(1050, 600);
    
    // Left circular photo frame
    const pX = 350;
    const pY = 450;
    const pR = 210;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(pX, pY, pR, 0, Math.PI*2);
    ctx.clip();
    
    // Cover user image inside circle
    drawImageCover(ctx, userImg, pX - pR, pY - pR, pR * 2, pR * 2, photoMode === 'face' ? 0.22 : 0.4);
    ctx.restore();
    
    // Circle Metallic Border Gradient
    const ringGrad = ctx.createLinearGradient(pX - pR, pY - pR, pX + pR, pY + pR);
    ringGrad.addColorStop(0, '#38BDF8'); // Cyan
    ringGrad.addColorStop(0.5, '#0EA5E9'); // Sky blue
    ringGrad.addColorStop(1, '#4F46E5'); // Indigo
    
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(pX, pY, pR + 7, 0, Math.PI*2);
    ctx.stroke();
    
    // Thin inner glass ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pX, pY, pR - 2, 0, Math.PI*2);
    ctx.stroke();
    
    // TEXT ALIGNMENT LEFT on the right side of the banner (X starts at 660)
    ctx.textAlign = 'left';
    
    // User Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px "Inter", "Helvetica", Arial, sans-serif';
    ctx.fillText(name ? name.toUpperCase() : 'PROFESSIONAL PORTFOLIO', 660, 360);
    
    // Headline/Caption
    ctx.fillStyle = '#38BDF8';
    ctx.font = '600 36px "Inter", sans-serif';
    ctx.fillText(caption ? caption : 'CREATIVE ENTERPRISE SOLUTIONS', 660, 435);
    
    // Subtle separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(660, 490);
    ctx.lineTo(1350, 490);
    ctx.stroke();
    
    // Skills capsule badges
    const skills = ['INNOVATION', 'STRATEGY', 'LEADERSHIP'];
    let badgeX = 660;
    ctx.font = 'bold 16px "Inter", monospace';
    for (const skill of skills) {
      // Draw badge container
      ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, badgeX, 520, 160, 42, 8);
      ctx.fill(); ctx.stroke();
      
      // Draw badge text
      ctx.fillStyle = '#E0F2FE';
      ctx.textAlign = 'center';
      ctx.fillText(skill, badgeX + 80, 541);
      badgeX += 190;
    }
    
    // Quote or Call To Action in lower right
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 24px "Inter", sans-serif';
    ctx.fillText('“Building digital frameworks with precision, purpose, and visual art.”', 660, 640);
    
    // Watermark at the bottom-right of the banner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft Banner Engine', 1520, 830);
  }
  
  return canvas.toDataURL('image/png');
}

// ==========================================
// RENDER VARIATION B: Creative & Modern (Neon / Cyberpunk / Pop Art vibes)
// ==========================================
async function renderVariationB(
  userImg: HTMLImageElement,
  style: TemplateStyle,
  name: string,
  caption: string,
  photoMode: 'face' | 'object'
): Promise<string> {
  const canvas = document.createElement('canvas');
  const isLinkedin = style === 'linkedin';
  
  const width = isLinkedin ? 1600 : 1000;
  const height = isLinkedin ? 900 : 1000;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');
  
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  
  if (style === 'festival') {
    // ------------------------------------------
    // FESTIVAL GREETING (Variation B - Cosmic Modern Cyber Festival)
    // ------------------------------------------
    // Dark Space Gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1000);
    bgGrad.addColorStop(0, '#060613'); // Black space
    bgGrad.addColorStop(0.5, '#120521'); // Deep purple space
    bgGrad.addColorStop(1, '#020205');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Draw modern diagonal neon laser lines
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.12)';
    ctx.lineWidth = 1;
    for (let i = -500; i < 1500; i += 120) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 500, 1000);
      ctx.stroke();
    }
    
    // Neon Teal Corner glow borders
    ctx.strokeStyle = '#00F2FE';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#00F2FE';
    ctx.shadowBlur = 15;
    ctx.strokeRect(30, 30, 940, 940);
    ctx.shadowBlur = 0; // Reset shadow
    
    // Fine purple inner border
    ctx.strokeStyle = '#FE019A';
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, 916, 916);
    
    // Photo slot: Rounded modern square with a rotated holographic frame
    const cx = 500;
    const cy = 350;
    const side = 330;
    const rx = 35; // corner radius
    
    ctx.save();
    // Rotate canvas slightly to make variation B dynamic
    ctx.translate(cx, cy);
    ctx.rotate(-4 * Math.PI / 180); // 4 degree rot
    ctx.translate(-cx, -cy);
    
    // Clip path for rounded square
    drawRoundedRect(ctx, cx - side/2, cy - side/2, side, side, rx);
    ctx.clip();
    
    // Draw user photo
    drawImageCover(ctx, userImg, cx - side/2, cy - side/2, side, side, photoMode === 'face' ? 0.2 : 0.4);
    ctx.restore();
    
    // Draw Neon Frame with Rotation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.translate(-cx, -cy);
    
    const holoGrad = ctx.createLinearGradient(cx - side/2, cy - side/2, cx + side/2, cy + side/2);
    holoGrad.addColorStop(0, '#FE019A'); // Pink neon
    holoGrad.addColorStop(0.5, '#9B51E0'); // Violet
    holoGrad.addColorStop(1, '#00F2FE'); // Teal neon
    
    ctx.strokeStyle = holoGrad;
    ctx.lineWidth = 10;
    ctx.shadowColor = '#FE019A';
    ctx.shadowBlur = 20;
    drawRoundedRect(ctx, cx - side/2 - 2, cy - side/2 - 2, side + 4, side + 4, rx + 2);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0; // Reset
    
    // Fun vibrant pop-art sparkles (drawn as stars)
    drawStar(ctx, 200, 250, 25, 10, '#00F2FE');
    drawStar(ctx, 820, 280, 22, 8, '#FE019A');
    drawStar(ctx, 150, 480, 18, 7, '#FFD700');
    drawStar(ctx, 850, 520, 24, 9, '#00FF66');
    
    // HEADER TEXT: FESTIVAL MODE
    ctx.fillStyle = '#00F2FE';
    ctx.font = '900 64px "Inter", "Arial Black", sans-serif';
    ctx.fillText("FESTIVAL CELEBRATION", cx, 600);
    
    // User Name in gorgeous modern pink neon
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 46px "Inter", "Helvetica", sans-serif';
    ctx.fillText(name ? name.toUpperCase() : 'CREATIVE CREATOR', cx, 680);
    
    // Capsule style caption bar
    ctx.fillStyle = 'rgba(254, 1, 154, 0.15)';
    ctx.strokeStyle = '#FE019A';
    ctx.lineWidth = 1.5;
    const capWidth = 600;
    drawRoundedRect(ctx, cx - capWidth/2, 730, capWidth, 54, 12);
    ctx.fill(); ctx.stroke();
    
    // Caption text inside capsule
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Inter", sans-serif';
    ctx.fillText(caption || "Sparking positive energetic vibes today and always.", cx, 757);
    
    // Dynamic countdown/motto
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SYS_LOG // FESTIVE_EXP_02B // CLS_GEN_SUCCESS', cx, 830);
    
    // Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft v3.1', 930, 935);
    
  } else if (style === 'idcard') {
    // ------------------------------------------
    // PROFESSIONAL ID CARD (Variation B - Cyberpunk / Neon Tech Access Pass)
    // ------------------------------------------
    // Background: Cyberpunk Dark Matrix
    ctx.fillStyle = '#09090D';
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Card border box
    ctx.strokeStyle = '#10B981'; // Cyber green
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 60, 880, 880);
    
    // Neon corners
    ctx.fillStyle = '#10B981';
    const offset = 60;
    ctx.fillRect(offset, offset, 40, 6);
    ctx.fillRect(offset, offset, 6, 40);
    ctx.fillRect(1000 - offset - 40, offset, 40, 6);
    ctx.fillRect(1000 - offset - 6, offset, 6, 40);
    ctx.fillRect(offset, 1000 - offset - 6, 40, 6);
    ctx.fillRect(offset, 1000 - offset - 40, 6, 40);
    ctx.fillRect(1000 - offset - 40, 1000 - offset - 6, 40, 6);
    ctx.fillRect(1000 - offset - 6, 1000 - offset - 40, 6, 40);
    
    // Futuristic grid scan lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.03)';
    ctx.lineWidth = 2;
    for (let y = 100; y < 900; y += 15) {
      ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(920, y); ctx.stroke();
    }
    
    // Cyber header banner
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(80, 80, 840, 120);
    
    ctx.fillStyle = '#10B981';
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText('SYSTEM ACCESS ID: //CORE_VERIFY', 120, 125);
    
    ctx.fillStyle = '#34D399';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('HOLO-SYS INT ACCESS PASS v9.2', 120, 165);
    
    // Tech system load text (fake logs in corner)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillText('SYS_ONLINE: 99.8%', 870, 115);
    ctx.fillText('NODE_VER: #8712-C', 870, 140);
    ctx.fillText('AUTH: GRANTED', 870, 165);
    
    // PHOTO SLOT: Squared Portrait Frame with Tech Brackets
    const pX = 350;
    const pY = 250;
    const pW = 300;
    const pH = 360;
    
    ctx.save();
    drawRoundedRect(ctx, pX, pY, pW, pH, 4);
    ctx.clip();
    drawImageCover(ctx, userImg, pX, pY, pW, pH, photoMode === 'face' ? 0.2 : 0.4);
    ctx.restore();
    
    // Neon yellow box borders and brackets
    ctx.strokeStyle = '#FBBF24'; // Yellow
    ctx.lineWidth = 3;
    ctx.strokeRect(pX - 4, pY - 4, pW + 8, pH + 8);
    
    // Brackets in neon green
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    const drawBrackets = (bx: number, by: number, bw: number, bh: number) => {
      ctx.beginPath();
      // TL
      ctx.moveTo(bx + 20, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 20);
      // TR
      ctx.moveTo(bx + bw - 20, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + 20);
      // BL
      ctx.moveTo(bx + 20, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - 20);
      // BR
      ctx.moveTo(bx + bw - 20, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - 20);
      ctx.stroke();
    };
    drawBrackets(pX - 10, pY - 10, pW + 20, pH + 20);
    
    // Cyber circle pulse target overlay
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(500, 430, 100, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(500, 430, 10, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.fill();
    
    // Barcode rendering on left side
    ctx.fillStyle = '#10B981';
    ctx.textAlign = 'center';
    
    // Member Name in bright green monospace
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 44px "Courier New", monospace';
    ctx.fillText(name ? name.toUpperCase() : 'USER_X_AUTHENTICATED', 500, 700);
    
    // Role/Caption
    ctx.fillStyle = '#A7F3D0';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(caption ? `>> ${caption.toUpperCase()}` : '>> NEURAL NETWORK CORE', 500, 755);
    
    // Fake server parameters on side
    ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.font = '14px monospace';
    ctx.fillText('IP_RESOLVE: [172.16.254.1]', 500, 810);
    ctx.fillText('MEM_HASH: 0x98FFDA1209BC', 500, 840);
    
    // Bottom pill
    ctx.fillStyle = '#EF4444'; // Cyberpunk red alert
    drawRoundedRect(ctx, 350, 875, 300, 44, 4);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HOLO ACCESS LEVEL // ADMIN', 500, 897);
    
    // Watermark
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft Tech v3.2', 910, 950);
    
  } else if (style === 'birthday') {
    // ------------------------------------------
    // BIRTHDAY POSTER (Variation B - Retro Wave Geometric Disco Pop)
    // ------------------------------------------
    // Vibrant neon purple/magenta retro background
    const bgGrad = ctx.createLinearGradient(0, 0, 1000, 1000);
    bgGrad.addColorStop(0, '#701A75'); // Magenta
    bgGrad.addColorStop(0.5, '#4C1D95'); // Deep purple
    bgGrad.addColorStop(1, '#1E1B4B'); // Dark blue
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Memphis styles, checkerboards, grids
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.15)';
    ctx.lineWidth = 1.5;
    // draw grid at bottom
    for (let x = 100; x < 900; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 600);
      ctx.lineTo((x - 500) * 2.5 + 500, 1000);
      ctx.stroke();
    }
    // horizontal grid lines (perspective look)
    for (let y = 600; y < 1000; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
    
    // Big glowing golden retrowave sun in background
    const sunGrad = ctx.createLinearGradient(500, 150, 500, 450);
    sunGrad.addColorStop(0, '#FBBF24');
    sunGrad.addColorStop(1, '#EC4899');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(500, 380, 200, 0, Math.PI, true);
    ctx.fill();
    
    // Draw retrowave sun cuts/lines
    ctx.fillStyle = '#4C1D95';
    for (let sy = 300; sy < 380; sy += 15) {
      ctx.fillRect(280, sy, 440, 4);
    }
    
    // Photo slot: Fun neon-triangle framed picture rotated dynamic style
    const cx = 500;
    const cy = 410;
    const side = 320;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(5 * Math.PI / 180); // Rotate 5 degrees right
    ctx.translate(-cx, -cy);
    
    // Clip rounded square photo
    drawRoundedRect(ctx, cx - side/2, cy - side/2, side, side, 12);
    ctx.clip();
    
    // Draw user photo
    drawImageCover(ctx, userImg, cx - side/2, cy - side/2, side, side, photoMode === 'face' ? 0.2 : 0.4);
    ctx.restore();
    
    // Retro Double neon border
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(5 * Math.PI / 180);
    ctx.translate(-cx, -cy);
    
    ctx.strokeStyle = '#00F2FE'; // Teal
    ctx.lineWidth = 8;
    ctx.shadowColor = '#00F2FE';
    ctx.shadowBlur = 15;
    drawRoundedRect(ctx, cx - side/2 - 2, cy - side/2 - 2, side + 4, side + 4, 12);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0; // Reset
    
    // Sparkles and geometric neon shapes around
    drawStar(ctx, 150, 300, 30, 12, '#EC4899');
    drawStar(ctx, 850, 350, 25, 10, '#38BDF8');
    drawStar(ctx, 300, 720, 18, 7, '#FBBF24');
    
    // HEADER: RETRO BOLD BLOCK FONT STYLE
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#EC4899';
    ctx.shadowBlur = 20;
    ctx.font = '900 70px "Inter", "Arial Black", sans-serif';
    ctx.fillText("PARTY STAR!", cx, 140);
    ctx.shadowBlur = 0;
    
    // User Name: Retro-styled font
    ctx.fillStyle = '#FBBF24'; // Yellow
    ctx.font = '900 56px "Inter", "Helvetica", Arial, sans-serif';
    ctx.fillText(name ? name.toUpperCase() : 'BIRTHDAY LEGEND', cx, 630);
    
    // Custom caption
    ctx.fillStyle = '#E879F9'; // Violet
    ctx.font = 'bold 28px "Inter", sans-serif';
    const finalCap = caption || "May your year be an absolute classic retro masterpiece.";
    ctx.fillText(finalCap, cx, 700);
    
    // Bottom slogans
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px "Courier New", monospace';
    ctx.fillText('★ RETRO POP PARTY LEVEL: UNLOCKED ★', cx, 770);
    
    // Retro checkerboard banner stripe at the bottom
    ctx.fillStyle = '#00F2FE';
    ctx.fillRect(50, 830, 900, 40);
    ctx.fillStyle = '#09090D';
    for (let bx = 50; bx < 950; bx += 80) {
      ctx.fillRect(bx, 830, 40, 40);
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('WILD CELEBRATIONS 24/7 // EXCLUSIVE PRINTS', cx, 850);
    
    // Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft Retro v3.2', 910, 930);
    
  } else if (style === 'linkedin') {
    // ------------------------------------------
    // LINKEDIN BANNER STYLE (Variation B - Gold Luxury Creative Executive)
    // ------------------------------------------
    // Background rich charcoal olive black
    const bgGrad = ctx.createRadialGradient(800, 450, 100, 800, 450, 1000);
    bgGrad.addColorStop(0, '#222220'); // Light charcoal
    bgGrad.addColorStop(0.5, '#121211'); // Dark obsidian
    bgGrad.addColorStop(1, '#080808');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1600, 900);
    
    // Elegant luxury metallic background rays
    ctx.strokeStyle = 'rgba(197, 168, 128, 0.05)';
    ctx.lineWidth = 1;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      ctx.beginPath();
      ctx.moveTo(800, 450);
      ctx.lineTo(800 + Math.cos(angle) * 1600, 450 + Math.sin(angle) * 900);
      ctx.stroke();
    }
    
    // Beautiful abstract gold mesh geometry on the right
    ctx.strokeStyle = 'rgba(197, 168, 128, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Elegant diamond lines
    ctx.moveTo(1100, 100); ctx.lineTo(1350, 450); ctx.lineTo(1100, 800);
    ctx.lineTo(850, 450); ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1200, 200); ctx.lineTo(1400, 450); ctx.lineTo(1200, 700);
    ctx.lineTo(1000, 450); ctx.closePath();
    ctx.stroke();
    
    // Luxury gold gradient
    const goldGrad = ctx.createLinearGradient(0, 200, 1600, 700);
    goldGrad.addColorStop(0, '#AA7C11');
    goldGrad.addColorStop(0.3, '#E5C158');
    goldGrad.addColorStop(0.5, '#F9E397');
    goldGrad.addColorStop(0.7, '#E5C158');
    goldGrad.addColorStop(1, '#AA7C11');
    
    // Photo slot: Left-aligned SQUARE with double-beveled gold trim
    const pX = 150;
    const pY = 175;
    const pSize = 450;
    
    ctx.save();
    drawRoundedRect(ctx, pX, pY, pSize, pSize, 8);
    ctx.clip();
    
    // Draw user photo
    drawImageCover(ctx, userImg, pX, pY, pSize, pSize, photoMode === 'face' ? 0.2 : 0.4);
    ctx.restore();
    
    // Beveled frame
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 6;
    drawRoundedRect(ctx, pX - 4, pY - 4, pSize + 8, pSize + 8, 12);
    ctx.stroke();
    
    // Extra fine border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, pX - 12, pY - 12, pSize + 24, pSize + 24, 16);
    ctx.stroke();
    
    // ALIGNED TO THE RIGHT starting from X=680
    ctx.textAlign = 'left';
    
    // Subtitle pre-header
    ctx.fillStyle = goldGrad;
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText('CREATIVE DIRECTOR & STRATEGIST', 680, 290);
    
    // User Name: Golden classic elegant Serif
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px "Playfair Display", "Georgia", "Times New Roman", serif';
    ctx.fillText(name ? name.toUpperCase() : 'LEADERSHIP PORTFOLIO', 680, 375);
    
    // Headline/Caption
    ctx.fillStyle = '#D4C5B3'; // Light warm gray
    ctx.font = 'italic 34px "Georgia", serif';
    ctx.fillText(caption ? caption : 'Synergizing creative visual direction with core development architecture.', 680, 455);
    
    // Fine divider line
    ctx.strokeStyle = 'rgba(197, 168, 128, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(680, 515);
    ctx.lineTo(1450, 515);
    ctx.stroke();
    
    // Sub-services list with gold icons
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText('✦ INNOVATION   ✦ BRANDING   ✦ FULL-STACK CRAFT', 680, 565);
    
    // Vision Statement
    ctx.fillStyle = '#8C8C86';
    ctx.font = '18px "Inter", sans-serif';
    ctx.fillText('Exclusive professional assets designed client-side. Built with uncompromising pixel precision.', 680, 620);
    
    // Watermark
    ctx.fillStyle = 'rgba(197, 168, 128, 0.25)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Made with PixCraft Luxury Engine', 1480, 830);
  }
  
  return canvas.toDataURL('image/png');
}

/**
 * Generates client-side custom uploaded template variations.
 * Returns a promise resolving to an array of 2 base64 PNG data URLs.
 */
export async function generateCustomClientSideTemplate(params: {
  portraitSrc: string;
  templateSrc: string;
  slot: { x: number; y: number; w: number; h: number };
  name: string;
  caption: string;
  photoMode: 'face' | 'object';
}): Promise<string[]> {
  const { portraitSrc, templateSrc, slot, name, caption, photoMode } = params;
  
  const portraitImg = await loadImage(portraitSrc);
  const templateImg = await loadImage(templateSrc);
  
  // Var A: Original custom template with full color portrait inside slot
  const varA = await renderCustomVariation(portraitImg, templateImg, slot, name, caption, photoMode, false);
  // Var B: Original custom template with monochrome contrast portrait inside slot
  const varB = await renderCustomVariation(portraitImg, templateImg, slot, name, caption, photoMode, true);
  
  return [varA, varB];
}

async function renderCustomVariation(
  portraitImg: HTMLImageElement,
  templateImg: HTMLImageElement,
  slot: { x: number; y: number; w: number; h: number },
  name: string,
  caption: string,
  photoMode: 'face' | 'object',
  isMonochrome: boolean
): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = templateImg.width || 1000;
  const height = templateImg.height || 1000;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');
  
  // 1. Draw Custom Template Background
  ctx.drawImage(templateImg, 0, 0, width, height);
  
  // 2. Map slot coordinates (percentages) to pixels
  const slotX = (slot.x / 100) * width;
  const slotY = (slot.y / 100) * height;
  const slotW = (slot.w / 100) * width;
  const slotH = (slot.h / 100) * height;
  
  // 3. Clip and Draw user portrait image
  ctx.save();
  ctx.beginPath();
  ctx.rect(slotX, slotY, slotW, slotH);
  ctx.closePath();
  ctx.clip();
  
  if (isMonochrome) {
    ctx.filter = 'grayscale(100%) contrast(125%)';
  }
  
  drawImageCover(ctx, portraitImg, slotX, slotY, slotW, slotH, photoMode === 'face' ? 0.25 : 0.4);
  ctx.restore();
  
  // 4. Overlay Name and Caption on bottom pill banner if provided
  if (name.trim() || caption.trim()) {
    ctx.save();
    const bannerH = Math.round(height * 0.1);
    const bannerY = height - bannerH;
    const textY = bannerY + bannerH / 2;
    
    // Draw semi-translucent elegant background banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(0, bannerY, width, bannerH);
    
    // Draw top line highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, bannerY);
    ctx.lineTo(width, bannerY);
    ctx.stroke();
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (name.trim() && caption.trim()) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(height * 0.024)}px "Inter", sans-serif`;
      ctx.fillText(name.toUpperCase(), width / 2, textY - 14);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${Math.round(height * 0.015)}px "JetBrains Mono", monospace`;
      ctx.fillText(caption.toUpperCase(), width / 2, textY + 14);
    } else if (name.trim()) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(height * 0.026)}px "Inter", sans-serif`;
      ctx.fillText(name.toUpperCase(), width / 2, textY);
    } else if (caption.trim()) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = `${Math.round(height * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillText(caption.toUpperCase(), width / 2, textY);
    }
    
    ctx.restore();
  }
  
  return canvas.toDataURL('image/png');
}

