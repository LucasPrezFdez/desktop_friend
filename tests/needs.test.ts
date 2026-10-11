import { describe, expect, it } from 'vitest';
import {
  advance,
  canEat,
  catchUp,
  decay,
  feed,
  FEED_AMOUNT,
  initialState,
  mood,
  OFFLINE_CAP,
  OFFLINE_FLOOR,
  parseState,
  pet,
  PIXELS_PER_HAPPINESS,
  type Needs,
  type PetState,
} from '../src/needs';

const HOUR = 3_600_000;
const needs = (fullness: number, happiness: number, energy: number): Needs => ({ fullness, happiness, energy });
const state = (n: Needs, lastSeen: number): PetState => ({ version: 1, needs: n, lastSeen });

describe('decay', () => {
  it('despierto baja saciedad, felicidad y energía', () => {
    expect(decay(needs(80, 80, 80), HOUR, false)).toEqual(needs(68, 72, 74));
  });

  it('dormido recupera energía y gasta menos', () => {
    expect(decay(needs(80, 80, 40), HOUR, true)).toEqual(needs(74, 78, 70));
  });

  it('no sale del rango 0-100', () => {
    expect(decay(needs(1, 1, 1), 100 * HOUR, false)).toEqual(needs(0, 0, 0));
    expect(decay(needs(50, 50, 99), 100 * HOUR, true).energy).toBe(100);
  });

  it('ignora un tiempo negativo', () => {
    expect(decay(needs(50, 50, 50), -HOUR, false)).toEqual(needs(50, 50, 50));
  });

  it('es proporcional al tiempo: dos medias horas equivalen a una hora', () => {
    const once = decay(needs(80, 80, 80), HOUR, false);
    const twice = decay(decay(needs(80, 80, 80), HOUR / 2, false), HOUR / 2, false);
    expect(twice.fullness).toBeCloseTo(once.fullness);
    expect(twice.happiness).toBeCloseTo(once.happiness);
    expect(twice.energy).toBeCloseTo(once.energy);
  });
});

describe('catchUp (tiempo con la app cerrada)', () => {
  it('aplica el tiempo transcurrido y actualiza la marca', () => {
    const after = catchUp(state(needs(80, 80, 50), 0), 2 * HOUR);
    expect(after.needs).toEqual(needs(64, 70, 70));
    expect(after.lastSeen).toBe(2 * HOUR);
  });

  it('una ausencia larga cuenta como el máximo', () => {
    const capped = catchUp(state(needs(100, 100, 50), 0), OFFLINE_CAP);
    const month = catchUp(state(needs(100, 100, 50), 0), 30 * 24 * HOUR);
    expect(month.needs).toEqual(capped.needs);
  });

  it('nunca deja las necesidades por debajo del suelo', () => {
    const after = catchUp(state(needs(30, 30, 50), 0), 30 * 24 * HOUR);
    expect(after.needs.fullness).toBe(OFFLINE_FLOOR);
    expect(after.needs.happiness).toBe(OFFLINE_FLOOR);
  });

  it('el suelo no sube a un perro que ya estaba por debajo', () => {
    const after = catchUp(state(needs(4, 6, 50), 0), 5 * HOUR);
    expect(after.needs.fullness).toBe(4);
    expect(after.needs.happiness).toBe(6);
  });

  it('un reloj atrasado no cambia las necesidades', () => {
    const after = catchUp(state(needs(60, 60, 60), 10 * HOUR), 5 * HOUR);
    expect(after.needs).toEqual(needs(60, 60, 60));
    expect(after.lastSeen).toBe(5 * HOUR);
  });
});

describe('advance (app abierta)', () => {
  it('un paso normal aplica el desgaste de estar despierto o dormido', () => {
    expect(advance(needs(80, 80, 80), 0, 1000, false)).toEqual(decay(needs(80, 80, 80), 1000, false));
    expect(advance(needs(80, 80, 40), 0, 1000, true)).toEqual(decay(needs(80, 80, 40), 1000, true));
  });

  it('tras una suspensión del equipo cuenta como app cerrada, no como horas despierto', () => {
    const after = advance(needs(80, 80, 50), 0, 8 * HOUR, false);
    expect(after).toEqual(catchUp(state(needs(80, 80, 50), 0), 8 * HOUR).needs);
    // Despierto ocho horas habría quedado sin comida: 80 - 12 * 8 < 0.
    expect(after.fullness).toBeGreaterThan(0);
  });
});

describe('feed', () => {
  it('sube la saciedad una ración y alegra un poco', () => {
    expect(feed(needs(20, 50, 50))).toEqual(needs(20 + FEED_AMOUNT, 55, 50));
  });

  it('no pasa de 100', () => {
    expect(feed(needs(90, 99, 50))).toEqual(needs(100, 100, 50));
  });

  it('un perro lleno no quiere comer', () => {
    expect(canEat(needs(95, 50, 50))).toBe(false);
    expect(canEat(needs(60, 50, 50))).toBe(true);
  });
});

describe('pet', () => {
  it('sube la felicidad según lo frotado', () => {
    expect(pet(needs(50, 50, 50), PIXELS_PER_HAPPINESS * 4).happiness).toBe(54);
  });

  it('no baja con valores negativos ni pasa de 100', () => {
    expect(pet(needs(50, 50, 50), -500).happiness).toBe(50);
    expect(pet(needs(50, 99, 50), 100_000).happiness).toBe(100);
  });
});

describe('mood', () => {
  it('el sueño manda sobre el hambre y el hambre sobre la tristeza', () => {
    expect(mood(needs(10, 10, 10))).toBe('sleepy');
    expect(mood(needs(10, 10, 50))).toBe('hungry');
    expect(mood(needs(60, 10, 50))).toBe('sad');
  });

  it('distingue contento de feliz', () => {
    expect(mood(needs(60, 60, 50))).toBe('content');
    expect(mood(needs(60, 90, 50))).toBe('happy');
  });
});

describe('parseState', () => {
  it('acepta un estado válido', () => {
    const saved = initialState(1234);
    expect(parseState(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it('rechaza datos corruptos o de otra versión', () => {
    expect(parseState(undefined)).toBeUndefined();
    expect(parseState('hola')).toBeUndefined();
    expect(parseState({ version: 2, needs: needs(1, 1, 1), lastSeen: 0 })).toBeUndefined();
    expect(parseState({ version: 1, needs: { fullness: 'mucho', happiness: 1, energy: 1 }, lastSeen: 0 })).toBeUndefined();
    expect(parseState({ version: 1, needs: needs(Number.NaN, 1, 1), lastSeen: 0 })).toBeUndefined();
  });

  it('recorta valores fuera de rango', () => {
    expect(parseState({ version: 1, needs: needs(500, -3, 50), lastSeen: 0 })?.needs).toEqual(needs(100, 0, 50));
  });
});
