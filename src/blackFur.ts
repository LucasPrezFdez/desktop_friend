import * as THREE from 'three';

// Colores en pantalla (sRGB). El pelaje es gris muy oscuro con un punto de azul: con negro puro
// las bandas del sombreado desaparecen y el perro se queda en una silueta plana.
export const PALETTE: Record<string, number> = {
  Fur: 0x1b1b21,
  // Flecos de las orejas, el pecho y las patas, y las zonas que en el Husky eran blancas.
  FurLight: 0x27272e,
  Nose: 0x111116,
  // Canas: el hocico casi blanco y una franja gris de transición, también alrededor de los ojos.
  Muzzle: 0xb9b6b1,
  FurGrey: 0x5c5b63,
  EyeIris: 0x2c1a0e,
  // Pupila velada, azul grisáceo.
  EyePupil: 0x7590b0,
  EyeShine: 0xffffff,
  Collar: 0xb58be8,
  Tag: 0xf4b830,
  Tongue: 0xf27d90,
};

const FUR = new Set(['Fur', 'FurLight', 'Nose', 'Muzzle', 'FurGrey']);

/** Rampa de tres tonos para el sombreado. El más oscuro no llega a cero: las sombras no se aplastan. */
function toonRamp(): THREE.DataTexture {
  const ramp = new THREE.DataTexture(new Uint8Array([140, 200, 255]), 3, 1, THREE.RedFormat);
  // Sin NearestFilter la rampa se interpolaría y el resultado ya no sería "toon".
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
}

/**
 * Borde de luz (fresnel) sumado a la emisión. No depende de las luces de la escena,
 * así que dibuja el contorno del perro negro también sobre fondos oscuros.
 */
function addRim(material: THREE.MeshToonMaterial, color: number, strength: number): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: new THREE.Color(color) };
    shader.uniforms.rimStrength = { value: strength };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimAmount = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.5);
        totalEmissiveRadiance += rimColor * rimAmount * rimStrength;`,
      );
  };
}

/** Un material por nombre de los que trae el GLB (ver tools/model/build_dog.py). */
export function createDogMaterials(): Map<string, THREE.MeshToonMaterial> {
  const ramp = toonRamp();
  const materials = new Map<string, THREE.MeshToonMaterial>();
  for (const [name, color] of Object.entries(PALETTE)) {
    const material = new THREE.MeshToonMaterial({ color, gradientMap: ramp });
    material.name = name;
    if (FUR.has(name)) addRim(material, 0xb8c4e6, 0.3);
    materials.set(name, material);
  }
  return materials;
}

/** Luces pensadas para un sujeto oscuro: relleno alto y una luz trasera fría que recorta la silueta. */
export function createLights(): THREE.Object3D {
  const group = new THREE.Group();
  group.add(new THREE.HemisphereLight(0xffffff, 0x8a8a94, 1.2));
  const key = new THREE.DirectionalLight(0xfff6ea, 1.9);
  key.position.set(2.5, 4, 5);
  group.add(key);
  const back = new THREE.DirectionalLight(0xc4d2f0, 1.6);
  back.position.set(-3, 3, -4);
  group.add(back);
  return group;
}
