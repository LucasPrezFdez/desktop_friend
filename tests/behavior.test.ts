import { describe, expect, it } from 'vitest';
import { pickActivity } from '../src/behavior';

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
