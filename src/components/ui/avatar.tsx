"use client";

import React, { useEffect, useRef } from 'react';

interface AvatarProps {
  address: string;
  name?: string;
  size?: number;
  className?: string;
}

// Blockies-style avatar implementation (like Eternl/Cardano wallets)
function createBlockies(diameter: number, seed: number) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', diameter.toString());
  svg.setAttribute('height', diameter.toString());
  svg.setAttribute('viewBox', `0 0 ${diameter} ${diameter}`);
  
  // Tạo màu từ seed (Cardano style)
  const hue = seed % 360;
  const saturation = 70 + (seed % 20); // 70-90%
  const lightness = 40 + (seed % 30);  // 40-70%
  const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // Background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', diameter.toString());
  bg.setAttribute('height', diameter.toString());
  bg.setAttribute('fill', backgroundColor);
  svg.appendChild(bg);
  
  // Tạo pattern 8x8 grid (blockies style)
  const gridSize = 8;
  const cellSize = diameter / gridSize;
  
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      // Tạo hash cho mỗi cell
      const cellSeed = (seed + x * 13 + y * 17) % 256;
      
      // Chỉ vẽ cell nếu seed > 140 (45% chance)
      if (cellSeed > 140) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', (x * cellSize).toString());
        rect.setAttribute('y', (y * cellSize).toString());
        rect.setAttribute('width', cellSize.toString());
        rect.setAttribute('height', cellSize.toString());
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('opacity', '0.4');
        svg.appendChild(rect);
        
        // Mirror cho symmetry (blockies style)
        if (x < 4) {
          const mirrorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          mirrorRect.setAttribute('x', ((gridSize - 1 - x) * cellSize).toString());
          mirrorRect.setAttribute('y', (y * cellSize).toString());
          mirrorRect.setAttribute('width', cellSize.toString());
          mirrorRect.setAttribute('height', cellSize.toString());
          mirrorRect.setAttribute('fill', '#ffffff');
          mirrorRect.setAttribute('opacity', '0.4');
          svg.appendChild(mirrorRect);
        }
      }
    }
  }
  
  return svg;
}

export function Avatar({ address, name, size = 40, className = '' }: AvatarProps) {
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (address && avatarRef.current) {
      // Tạo seed từ địa chỉ (Cardano/Eternl style)
      const seed = parseInt(address.slice(2, 10), 16) || 0;
      const icon = createBlockies(size, seed);
      
      // Clear previous content
      avatarRef.current.innerHTML = '';
      avatarRef.current.appendChild(icon);
    }
  }, [address, size]);

  return (
    <div 
      ref={avatarRef}
      className={`rounded-full border border-gray-300 overflow-hidden ${className}`}
      style={{ 
        width: size, 
        height: size
      }}
    />
  );
}

// Fallback avatar với text
export function AvatarText({ address, name, size = 40, className = '' }: AvatarProps) {
  const hash = address.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 30); 
  const lightness = 45 + (Math.abs(hash) % 20); 

  const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const textColor = lightness > 55 ? '#000000' : '#ffffff';
  const initial = name ? name.charAt(0).toUpperCase() : address.charAt(0).toUpperCase();

  return (
    <div 
      className={`flex items-center justify-center font-bold rounded-full border border-gray-300 ${className}`}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor,
        color: textColor,
        fontSize: size * 0.4
      }}
    >
      {initial}
    </div>
  );
}

// Export Avatar as default (Blockies-style like Eternl/Cardano)
export { Avatar as AvatarSVG };