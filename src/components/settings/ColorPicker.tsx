import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(50);
  const [lightness, setLightness] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Convert hex to HSL on mount
  useEffect(() => {
    if (value) {
      const hsl = hexToHsl(value);
      if (hsl) {
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
      }
    }
  }, []);

  const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const handleWheelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    
    const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    const newHue = angle < 0 ? angle + 360 : angle;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = rect.width / 2;
    const newSaturation = Math.min(100, (distance / maxDistance) * 100);
    
    setHue(Math.round(newHue));
    setSaturation(Math.round(newSaturation));
    
    const newColor = hslToHex(Math.round(newHue), Math.round(newSaturation), lightness);
    onChange(newColor);
  };

  const handleLightnessChange = (newLightness: number) => {
    setLightness(newLightness);
    const newColor = hslToHex(hue, saturation, newLightness);
    onChange(newColor);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex gap-2 cursor-pointer">
            <div
              className="w-12 h-10 rounded-xl border border-border shadow-sm"
              style={{ backgroundColor: value }}
            />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 rounded-xl"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4 rounded-xl" align="start">
          <div className="space-y-4">
            {/* Color Wheel */}
            <div
              ref={wheelRef}
              className="w-full aspect-square rounded-full cursor-crosshair relative"
              style={{
                background: `conic-gradient(
                  hsl(0, 100%, 50%),
                  hsl(60, 100%, 50%),
                  hsl(120, 100%, 50%),
                  hsl(180, 100%, 50%),
                  hsl(240, 100%, 50%),
                  hsl(300, 100%, 50%),
                  hsl(360, 100%, 50%)
                )`,
              }}
              onClick={handleWheelClick}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={(e) => isDragging && handleWheelClick(e)}
            >
              {/* White center gradient for saturation */}
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, white 0%, transparent 70%)',
                }}
              />
              {/* Current color indicator */}
              <div
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2"
                style={{
                  backgroundColor: hslToHex(hue, saturation, 50),
                  left: `${50 + (saturation / 100) * 40 * Math.sin((hue - 90) * Math.PI / 180)}%`,
                  top: `${50 - (saturation / 100) * 40 * Math.cos((hue - 90) * Math.PI / 180)}%`,
                }}
              />
            </div>

            {/* Lightness slider */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Lightness</Label>
              <input
                type="range"
                min="10"
                max="90"
                value={lightness}
                onChange={(e) => handleLightnessChange(parseInt(e.target.value))}
                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    ${hslToHex(hue, saturation, 10)}, 
                    ${hslToHex(hue, saturation, 50)}, 
                    ${hslToHex(hue, saturation, 90)}
                  )`,
                }}
              />
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl border border-border"
                style={{ backgroundColor: value }}
              />
              <span className="text-sm font-mono text-muted-foreground">{value.toUpperCase()}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
