interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  // Convert hex to HSL
  const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      
      if (max === r) {
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / delta + 2) / 6;
      } else {
        h = ((r - g) / delta + 4) / 6;
      }
    }

    return { h: Math.round(h * 360), s, l };
  };

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    const hNorm = h / 360;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, hNorm) * 255);
    const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const currentHSL = hexToHSL(color);

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hue = parseInt(e.target.value);
    const newColor = hslToHex(hue, currentHSL.s, currentHSL.l);
    onChange(newColor);
  };

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lightness = parseInt(e.target.value) / 100;
    const newColor = hslToHex(currentHSL.h, currentHSL.s, lightness);
    onChange(newColor);
  };

  return (
    <div className="space-y-4">
      {/* Color Preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-200 shadow-sm"
          style={{ backgroundColor: color }}
        />
        <div>
          <p className="text-sm text-gray-700">Selected Color</p>
          <p className="text-xs text-gray-500">{color}</p>
        </div>
      </div>

      {/* Hue Slider */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Color</label>
        <input
          type="range"
          min="0"
          max="360"
          value={currentHSL.h}
          onChange={handleHueChange}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
        />
      </div>

      {/* Lightness Slider */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Brightness</label>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(currentHSL.l * 100)}
          onChange={handleLightnessChange}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #000000 0%, ${hslToHex(currentHSL.h, currentHSL.s, 0.5)} 50%, #ffffff 100%)`,
          }}
        />
      </div>
    </div>
  );
}