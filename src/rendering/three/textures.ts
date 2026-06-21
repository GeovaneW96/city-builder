import * as THREE from "three";

const textureCache = new Map<string, THREE.Texture>();

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
