'use client';

export type ExtractedPalette = {
  dominant: string; // e.g. 'rgb(240, 245, 255)' or 'rgb(16, 185, 129)'
  dominantRgb: { r: number; g: number; b: number };
  accentGlow: string; // e.g. 'rgba(255, 255, 255, 0.45)'
  subtleTint: string; // e.g. 'rgba(255, 255, 255, 0.14)'
  borderTint: string; // e.g. 'rgba(255, 255, 255, 0.35)'
  secondaryGlow?: string;
  isBrightMonochrome?: boolean;
};

// Default is neutral luminous platinum/diamond light (never harsh purple)
export const DEFAULT_PALETTE: ExtractedPalette = {
  dominant: 'rgb(240, 244, 255)',
  dominantRgb: { r: 240, g: 244, b: 255 },
  accentGlow: 'rgba(255, 255, 255, 0.42)',
  subtleTint: 'rgba(255, 255, 255, 0.14)',
  borderTint: 'rgba(255, 255, 255, 0.32)',
  secondaryGlow: 'rgba(210, 230, 255, 0.25)',
  isBrightMonochrome: true,
};

export function extractPhotoPaletteFromCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): ExtractedPalette {
  try {
    const data = ctx.getImageData(0, 0, width, height).data;

    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    let maxSaturation = -1;
    let vibrantRgb = { r: 240, g: 244, b: 255 };

    // Samples pixels
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 100) continue; // Skip mostly transparent

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      totalR += r;
      totalG += g;
      totalB += b;
      count++;

      // Compute saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const sat = max === 0 ? 0 : delta / max;

      // Prioritize saturated, non-muddy colors
      if (sat > maxSaturation && max > 50) {
        maxSaturation = sat;
        vibrantRgb = { r, g, b };
      }
    }

    if (count === 0) return DEFAULT_PALETTE;

    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);

    // Check if the image is mostly white or bright monochrome (e.g., shopping bag / black & white icon)
    const isBrightMonochrome = maxSaturation < 0.18 && avgR > 180 && avgG > 180 && avgB > 180;
    const isDarkMonochrome = maxSaturation < 0.18 && avgR < 70 && avgG < 70 && avgB < 70;

    let targetR = avgR;
    let targetG = avgG;
    let targetB = avgB;

    if (maxSaturation >= 0.2) {
      // Use the vibrant colored tone
      targetR = vibrantRgb.r;
      targetG = vibrantRgb.g;
      targetB = vibrantRgb.b;
    } else if (isBrightMonochrome) {
      // Pure crystalline white / diamond glow
      targetR = 250;
      targetG = 252;
      targetB = 255;
    } else if (isDarkMonochrome) {
      // Sleek silver-metallic glow
      targetR = 175;
      targetG = 185;
      targetB = 205;
    } else {
      // Natural average
      targetR = Math.min(255, Math.max(50, avgR));
      targetG = Math.min(255, Math.max(50, avgG));
      targetB = Math.min(255, Math.max(50, avgB));
    }

    // Boost brightness slightly so dark photos still produce a luminous aura
    const lum = 0.299 * targetR + 0.587 * targetG + 0.114 * targetB;
    if (lum < 90 && !isDarkMonochrome) {
      const boost = 120 / Math.max(1, lum);
      targetR = Math.min(255, Math.round(targetR * boost));
      targetG = Math.min(255, Math.round(targetG * boost));
      targetB = Math.min(255, Math.round(targetB * boost));
    }

    const glowOpacity = isBrightMonochrome ? 0.55 : 0.45;
    const subtleOpacity = isBrightMonochrome ? 0.18 : 0.14;
    const borderOpacity = isBrightMonochrome ? 0.45 : 0.35;

    return {
      dominant: `rgb(${targetR}, ${targetG}, ${targetB})`,
      dominantRgb: { r: targetR, g: targetG, b: targetB },
      accentGlow: `rgba(${targetR}, ${targetG}, ${targetB}, ${glowOpacity})`,
      subtleTint: `rgba(${targetR}, ${targetG}, ${targetB}, ${subtleOpacity})`,
      borderTint: `rgba(${targetR}, ${targetG}, ${targetB}, ${borderOpacity})`,
      secondaryGlow: `rgba(${Math.min(255, targetR + 25)}, ${Math.min(255, targetG + 25)}, ${Math.min(255, targetB + 25)}, ${glowOpacity * 0.7})`,
      isBrightMonochrome,
    };
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function extractPhotoPalette(img: HTMLImageElement): ExtractedPalette {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return DEFAULT_PALETTE;

    ctx.drawImage(img, 0, 0, 32, 32);
    return extractPhotoPaletteFromCanvas(ctx, 32, 32);
  } catch {
    return DEFAULT_PALETTE;
  }
}

/**
 * Robust async loader that handles CORS and blobs to guarantee successful color extraction
 */
export async function extractPaletteFromUrl(imageUrl: string): Promise<ExtractedPalette> {
  if (!imageUrl) return DEFAULT_PALETTE;

  try {
    // If it's a data URL or blob, we can directly load it
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(extractPhotoPalette(img));
        img.onerror = () => resolve(DEFAULT_PALETTE);
        img.src = imageUrl;
      });
    }

    // Try fetching as blob to bypass cross-origin canvas tainting
    try {
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const palette = extractPhotoPalette(img);
            URL.revokeObjectURL(objectUrl);
            resolve(palette);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(DEFAULT_PALETTE);
          };
          img.src = objectUrl;
        });
      }
    } catch {
      // Fallback to standard Image loading
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(extractPhotoPalette(img));
      img.onerror = () => resolve(DEFAULT_PALETTE);
      img.src = imageUrl;
    });
  } catch {
    return DEFAULT_PALETTE;
  }
}

