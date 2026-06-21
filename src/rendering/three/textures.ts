import * as THREE from "three";

const textureCache = new Map<string, THREE.Texture>();
const proceduralCache = new Map<string, THREE.CanvasTexture>();

export function getTiledTexture(
  path: string,
  repeatX: number,
  repeatY: number,
): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const texture = textureCache.get(path) ?? createTexture(path);
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function createTexture(path: string): THREE.Texture {
  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  textureCache.set(path, texture);
  return texture;
}

export function getProceduralTexture(
  key: string,
  width: number,
  height: number,
  fill: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const cached = proceduralCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  fill(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  proceduralCache.set(key, texture);
  return texture;
}

export function getConcreteTexture(repeatX = 1, repeatY = 1): THREE.CanvasTexture | null {
  return getProceduralTexture(`concrete_${repeatX}_${repeatY}`, 128, 128, (ctx, w, h) => {
    const base = 130 + Math.random() * 20;
    ctx.fillStyle = `rgb(${base}, ${base + 5}, ${base + 10})`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 1 + Math.random() * 3;
      const brightness = 110 + Math.random() * 50;
      ctx.fillStyle = `rgba(${brightness}, ${brightness + 3}, ${brightness + 5}, ${0.1 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.strokeStyle = `rgba(80, 80, 85, ${0.05 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }
  });
}

export function getBrickTexture(repeatX = 1, repeatY = 1): THREE.CanvasTexture | null {
  return getProceduralTexture(`brick_${repeatX}_${repeatY}`, 128, 128, (ctx, w, h) => {
    const brickH = 8;
    const brickW = 16;
    for (let row = 0; row < Math.ceil(h / brickH); row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col < Math.ceil(w / brickW) + 1; col++) {
        const x = col * brickW + offset;
        const y = row * brickH;
        const r = 120 + Math.random() * 40;
        const g = 40 + Math.random() * 30;
        const b = 30 + Math.random() * 20;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, brickW - 1, brickH - 1);
        ctx.strokeStyle = `rgba(60, 30, 20, 0.4)`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, brickW - 1, brickH - 1);
      }
    }
  });
}

export function getAsphaltTexture(repeatX = 1, repeatY = 1): THREE.CanvasTexture | null {
  return getProceduralTexture(`asphalt_${repeatX}_${repeatY}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#2a2e30";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 0.5 + Math.random() * 2;
      const brightness = 35 + Math.random() * 30;
      ctx.fillStyle = `rgba(${brightness}, ${brightness + 1}, ${brightness + 2}, ${0.15 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const y = Math.random() * h;
      ctx.strokeStyle = `rgba(50, 55, 58, ${0.08 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }
  });
}

export function getFacadePanelTexture(
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture | null {
  return getProceduralTexture(
    `facade_panel_${repeatX}_${repeatY}`,
    128,
    128,
    (ctx, w, h) => {
      const panelH = 16;
      const panelW = 32;
      for (let row = 0; row < Math.ceil(h / panelH); row++) {
        for (let col = 0; col < Math.ceil(w / panelW); col++) {
          const x = col * panelW;
          const y = row * panelH;
          const brightness = 100 + Math.random() * 40;
          ctx.fillStyle = `rgb(${brightness}, ${brightness + 2}, ${brightness + 6})`;
          ctx.fillRect(x + 1, y + 1, panelW - 2, panelH - 2);
          ctx.strokeStyle = `rgba(60, 65, 70, 0.3)`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 1, y + 1, panelW - 2, panelH - 2);
        }
      }
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = `rgba(80, 85, 90, ${0.04 + Math.random() * 0.08})`;
        ctx.fillRect(x, y, 2 + Math.random() * 4, 1 + Math.random() * 2);
      }
    },
  );
}

export function getMetalTexture(repeatX = 1, repeatY = 1): THREE.CanvasTexture | null {
  return getProceduralTexture(`metal_${repeatX}_${repeatY}`, 128, 128, (ctx, w, h) => {
    const base = 100 + Math.random() * 30;
    ctx.fillStyle = `rgb(${base}, ${base + 5}, ${base + 10})`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 10 + Math.random() * 40;
      ctx.strokeStyle = `rgba(130, 135, 140, ${0.05 + Math.random() * 0.08})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * (Math.random() > 0.5 ? 1 : -1), y);
      ctx.stroke();
    }
  });
}

export function getRoofTexture(repeatX = 1, repeatY = 1): THREE.CanvasTexture | null {
  return getProceduralTexture(`roof_${repeatX}_${repeatY}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#1a1c1e";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(30, 32, 35, ${0.1 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
