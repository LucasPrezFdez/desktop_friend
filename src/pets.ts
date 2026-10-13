/** Una mascota que se puede elegir en el menú (ver src/petMenu.ts). */
export interface PetSpec {
  id: string;
  name: string;
}

/** Las mascotas que hay, en el orden en que salen en el menú. */
export const PETS: readonly PetSpec[] = [
  { id: 'dog', name: 'Blacky' },
  { id: 'wingman', name: 'Wingman' },
];

/** La mascota guardada. Si no hay ninguna, o la guardada ya no existe, la primera. */
export function resolvePet(saved: unknown, pets: readonly PetSpec[] = PETS): PetSpec {
  return pets.find((pet) => pet.id === saved) ?? pets[0];
}
