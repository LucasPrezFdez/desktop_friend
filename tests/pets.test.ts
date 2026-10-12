import { describe, expect, it } from 'vitest';
import { fanOffsets } from '../src/petMenu';
import { PETS, resolvePet } from '../src/pets';

describe('resolvePet (qué mascota sale al arrancar)', () => {
  const pets = [
    { id: 'dog', name: 'Perro' },
    { id: 'cat', name: 'Gato' },
  ];

  it('la guardada, si existe', () => {
    expect(resolvePet('cat', pets).id).toBe('cat');
  });

  it('la primera si no hay ninguna guardada', () => {
    expect(resolvePet(undefined, pets).id).toBe('dog');
  });

  it('la primera si la guardada ya no existe o no es un identificador', () => {
    expect(resolvePet('dragon', pets).id).toBe('dog');
    expect(resolvePet(7, pets).id).toBe('dog');
    expect(resolvePet(null, pets).id).toBe('dog');
  });

  it('con la lista real, el perro', () => {
    expect(resolvePet(undefined).id).toBe('dog');
    expect(PETS.map((pet) => pet.id)).toContain('dog');
  });
});

describe('fanOffsets (dónde sale cada círculo del menú)', () => {
  it('uno solo sale justo encima de la mascota', () => {
    expect(fanOffsets(1)).toEqual([{ x: 0, y: -150 }]);
  });

  it('se reparten de izquierda a derecha, simétricos y por encima de la mascota', () => {
    for (let count = 1; count <= 5; count++) {
      const offsets = fanOffsets(count);
      expect(offsets).toHaveLength(count);
      offsets.forEach((offset, index) => {
        const mirror = offsets[count - 1 - index];
        expect(offset.x + mirror.x).toBe(0);
        expect(offset.y).toBe(mirror.y);
        expect(offset.y).toBeLessThan(0);
        if (index > 0) expect(offset.x).toBeGreaterThan(offsets[index - 1].x);
      });
    }
  });

  it('hasta cinco círculos de 72 px caben en la ventana de 420 sin pisarse', () => {
    const offsets = fanOffsets(5);
    for (const offset of offsets) expect(Math.abs(offset.x) + 36).toBeLessThanOrEqual(210);
    for (let index = 1; index < offsets.length; index++) {
      const gap = Math.hypot(offsets[index].x - offsets[index - 1].x, offsets[index].y - offsets[index - 1].y);
      expect(gap).toBeGreaterThan(72);
    }
  });
});
