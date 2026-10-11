// Modelo de necesidades de la mascota. Funciones puras: no dependen del reloj, del DOM ni de Tauri.
// Todo se calcula a partir de marcas de tiempo, nunca contando frames, porque el navegador
// ralentiza los temporizadores de las ventanas tapadas y la app puede pasar horas cerrada.

export interface Needs {
  /** Saciedad: 100 es recién comido, 0 es hambriento. */
  fullness: number;
  happiness: number;
  energy: number;
}

export interface PetState {
  version: 1;
  needs: Needs;
  /** Última vez que la app estuvo viva, en milisegundos desde la época Unix. */
  lastSeen: number;
}

export type Mood = 'sleepy' | 'hungry' | 'sad' | 'content' | 'happy';

const HOUR = 3_600_000;

/** Puntos por hora. Despierto tarda unas 8 horas en pasar de lleno a hambriento. */
export const RATES = {
  awake: { fullness: -12, happiness: -8, energy: -6 },
  asleep: { fullness: -6, happiness: -2, energy: 30 },
} as const;

/** Con la app cerrada se supone que el perro ha estado tranquilo, descansando a ratos. */
const OFFLINE = { fullness: -8, happiness: -5, energy: 10 };
/** Más allá de este tiempo cerrado ya no empeora: nadie quiere volver y encontrarse un drama. */
export const OFFLINE_CAP = 12 * HOUR;
/** Suelo de las necesidades tras una ausencia. */
export const OFFLINE_FLOOR = 10;
/** Un salto del reloj mayor que este entre dos pasos significa que el equipo estuvo suspendido. */
export const SUSPEND_GAP = 60_000;

export const FEED_AMOUNT = 35;
/** Por encima de esta saciedad el perro no quiere comer más. */
export const FULL_THRESHOLD = 92;
/** Píxeles de caricia que suben un punto de felicidad. */
export const PIXELS_PER_HAPPINESS = 120;

export const LOW = 25;
export const SLEEPY = 20;
export const RESTED = 85;

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));

export function initialState(now: number): PetState {
  return { version: 1, needs: { fullness: 70, happiness: 70, energy: 80 }, lastSeen: now };
}

/** Evolución de las necesidades con la app abierta. */
export function decay(needs: Needs, elapsedMs: number, asleep: boolean): Needs {
  const hours = Math.max(0, elapsedMs) / HOUR;
  const rate = asleep ? RATES.asleep : RATES.awake;
  return {
    fullness: clamp(needs.fullness + rate.fullness * hours),
    happiness: clamp(needs.happiness + rate.happiness * hours),
    energy: clamp(needs.energy + rate.energy * hours),
  };
}

/**
 * Avanza las necesidades con la app abierta. Si entre un paso y el siguiente ha pasado mucho
 * tiempo, el equipo estuvo suspendido: ese rato cuenta como app cerrada, no como horas despierto.
 */
export function advance(needs: Needs, lastTick: number, now: number, asleep: boolean): Needs {
  if (now - lastTick > SUSPEND_GAP) {
    return catchUp({ version: 1, needs, lastSeen: lastTick }, now).needs;
  }
  return decay(needs, now - lastTick, asleep);
}

/** Aplica el tiempo que la app ha estado cerrada. Un reloj atrasado (tiempo negativo) no cambia nada. */
export function catchUp(state: PetState, now: number): PetState {
  const elapsed = Math.min(Math.max(0, now - state.lastSeen), OFFLINE_CAP);
  const hours = elapsed / HOUR;
  const after = (value: number, rate: number): number => {
    const next = value + rate * hours;
    // El suelo solo frena la caída: no sube a un perro que ya estaba por debajo.
    return clamp(rate < 0 ? Math.max(next, Math.min(value, OFFLINE_FLOOR)) : next);
  };
  return {
    version: 1,
    needs: {
      fullness: after(state.needs.fullness, OFFLINE.fullness),
      happiness: after(state.needs.happiness, OFFLINE.happiness),
      energy: after(state.needs.energy, OFFLINE.energy),
    },
    lastSeen: now,
  };
}

export function canEat(needs: Needs): boolean {
  return needs.fullness < FULL_THRESHOLD;
}

/** Una ración. Comer también alegra un poco. */
export function feed(needs: Needs): Needs {
  return {
    ...needs,
    fullness: clamp(needs.fullness + FEED_AMOUNT),
    happiness: clamp(needs.happiness + 5),
  };
}

/** Caricias: la felicidad sube según cuánto se ha frotado. */
export function pet(needs: Needs, strokePixels: number): Needs {
  return { ...needs, happiness: clamp(needs.happiness + Math.max(0, strokePixels) / PIXELS_PER_HAPPINESS) };
}

/** Estado de ánimo dominante. El sueño manda sobre el hambre y el hambre sobre la tristeza. */
export function mood(needs: Needs): Mood {
  if (needs.energy < SLEEPY) return 'sleepy';
  if (needs.fullness < LOW) return 'hungry';
  if (needs.happiness < LOW) return 'sad';
  if (needs.happiness > 75 && needs.fullness > 50) return 'happy';
  return 'content';
}

/** Valida lo leído del disco: un fichero corrupto o antiguo no debe romper la app. */
export function parseState(raw: unknown): PetState | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const candidate = raw as Partial<PetState>;
  const needs = candidate.needs;
  if (candidate.version !== 1 || typeof candidate.lastSeen !== 'number' || !needs) return undefined;
  const values = [needs.fullness, needs.happiness, needs.energy];
  if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) return undefined;
  return {
    version: 1,
    needs: { fullness: clamp(needs.fullness), happiness: clamp(needs.happiness), energy: clamp(needs.energy) },
    lastSeen: candidate.lastSeen,
  };
}
