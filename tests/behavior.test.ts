import { describe, expect, it } from 'vitest';
import { bedSpotX, landsInBed, pickActivity } from '../src/behavior';

describe('pickActivity', () => {
  it('con sueño siempre duerme', () => {
    for (const roll of [0, 0.3, 0.7, 0.999]) {
      expect(pickActivity('sleepy', roll)).toBe('sleep');
    }
  });

  it('con hambre o triste lo normal es estar alicaído, pero no siempre', () => {
    expect(pickActivity('hungry', 0.1)).toBe('sad');
    expect(pickActivity('sad', 0.5)).toBe('sad');
    expect(pickActivity('hungry', 0.6)).toBe('walk');
    expect(pickActivity('sad', 0.8)).toBe('sit');
    expect(pickActivity('hungry', 0.95)).toBe('lie');
  });

  it('contento reparte el tiempo entre estar de pie, pasear, sentarse y tumbarse', () => {
    expect(pickActivity('content', 0.1)).toBe('idle');
    expect(pickActivity('happy', 0.5)).toBe('walk');
    expect(pickActivity('content', 0.7)).toBe('sit');
    expect(pickActivity('happy', 0.9)).toBe('lie');
  });

  it('un perro contento nunca elige estar triste ni dormir', () => {
    for (let roll = 0; roll < 1; roll += 0.01) {
      expect(['idle', 'walk', 'sit', 'lie']).toContain(pickActivity('content', roll));
    }
  });
});

describe('bedSpotX (dónde sale la cama al coger al perro)', () => {
  // Un escritorio en el que la ventana del perro puede estar entre 0 y 2000.
  it('sale hacia el lado con más sitio', () => {
    expect(bedSpotX(1800, 0, 2000, 300)).toBe(1500);
    expect(bedSpotX(200, 0, 2000, 300)).toBe(500);
  });

  it('no se sale del escritorio', () => {
    expect(bedSpotX(100, 0, 150, 300)).toBe(0);
    expect(bedSpotX(40, 0, 150, 300)).toBe(150);
  });

  it('con sitio, nunca sale debajo del perro: soltarlo donde estaba no lo mete en la cama', () => {
    for (let x = 0; x <= 2000; x += 50) {
      expect(landsInBed(x, bedSpotX(x, 0, 2000, 300), 105)).toBe(false);
    }
  });
});

describe('landsInBed', () => {
  it('cae dentro si se le suelta sobre la cama, con algo de margen a los lados', () => {
    expect(landsInBed(1500, 1500, 105)).toBe(true);
    expect(landsInBed(1420, 1500, 105)).toBe(true);
    expect(landsInBed(1605, 1500, 105)).toBe(true);
  });

  it('cae al suelo si se le suelta más lejos', () => {
    expect(landsInBed(1380, 1500, 105)).toBe(false);
    expect(landsInBed(1620, 1500, 105)).toBe(false);
  });
});
