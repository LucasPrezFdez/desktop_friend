import { Dog } from './dog';
import type { Pet } from './pet';
import { Wingman } from './wingman';

/** Cómo se carga el modelo de cada mascota de src/pets.ts, por su identificador. */
const LOADERS: Record<string, () => Promise<Pet>> = {
  dog: () => Dog.load(),
  wingman: () => Wingman.load(),
};

export function hasModel(id: string): boolean {
  return id in LOADERS;
}

export function loadPet(id: string): Promise<Pet> {
  const load = LOADERS[id];
  if (!load) return Promise.reject(new Error(`No hay modelo para la mascota ${id}`));
  return load();
}
