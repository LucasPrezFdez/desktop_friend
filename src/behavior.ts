import * as THREE from 'three';
import type { Desktop, Point, Rect } from './desktop';
import type { ClipName, Dog } from './dog';
import { canEat, feed, mood, pet, RESTED, type Mood, type Needs } from './needs';
import type { Bowl, Hand } from './props';
import type { Stage } from './scene';
import type { Hud } from './ui';

/** Lo que el perro puede decidir hacer por su cuenta. */
export type Choice = 'idle' | 'walk' | 'sit' | 'lie' | 'sad' | 'sleep';
type Activity = Choice | 'eat' | 'happy' | 'held' | 'fall' | 'rise';
type Posture = 'stand' | 'sit' | 'lie';

/** Elige la siguiente actividad según el ánimo. `roll` es un número al azar entre 0 y 1. */
export function pickActivity(current: Mood, roll: number): Choice {
  if (current === 'sleepy') return 'sleep';
  if (current === 'hungry' || current === 'sad') {
    if (roll < 0.55) return 'sad';
    if (roll < 0.75) return 'walk';
    if (roll < 0.9) return 'sit';
    return 'lie';
  }
  if (roll < 0.35) return 'idle';
  if (roll < 0.62) return 'walk';
  if (roll < 0.84) return 'sit';
  return 'lie';
}

const SIDE = Math.PI / 2;
/** Tumbado se le ve más de perfil: de frente, las patas estiradas se salían por debajo de la ventana. */
const LYING_FACING = 1.0;
const BOWL_X = 0.98;
const EAT_SECONDS = 5.3;
const HAPPY_SECONDS = 1.6;
/** Píxeles lógicos por segundo al caminar. */
const WALK_SPEED = 95;
/** Píxeles lógicos por segundo al cuadrado al soltarlo en el aire. */
const GRAVITY = 2600;
/** Cuánto sube el perro cuando la mano lo levanta, en unidades de la escena. */
const CARRY_LIFT = 0.7;
// La mano entra en diagonal desde un lado y agarra el collar por detrás del cuello. Encima de la
// cabeza parecía un gorro; así se ve la palma junto al cuello, a la altura del collar.
/** Dónde quedan las puntas de los dedos respecto a la nuca, vistas desde la cámara. */
const HAND_GRIP = new THREE.Vector3(0.2, 0.03, -0.05);
/** Inclinación de la mano, en radianes: los dedos apuntan hacia el cuello. */
const HAND_TILT = -0.8;
// Balanceo al llevarlo: un péndulo amortiguado que cuelga de la nuca. Tiene que ser leve.
const SWAY_STIFFNESS = 38;
const SWAY_DAMPING = 5;
/** Ángulo máximo que le da el movimiento del ratón, en radianes (unos 11 grados). */
const SWAY_MAX = 0.2;
/** Radianes de inclinación por cada píxel por segundo de velocidad al arrastrar. */
const SWAY_PER_SPEED = 0.00035;
/** Vaivén suave cuando se le sostiene quieto, en radianes (unos 2 grados). */
const SWAY_IDLE = 0.035;
const UP = new THREE.Vector3(0, 1, 0);
const TOWARD_CAMERA = new THREE.Vector3(0, 0, 1);
/** Fotogramas por segundo: los justos para cada actividad, porque la app está abierta todo el día. */
const FPS_ACTIVE = 30;
const FPS_CALM = 20;
const FPS_ASLEEP = 10;
const CALM: ReadonlySet<string> = new Set(['idle', 'sit', 'lie', 'sad']);
/** Píxeles frotados por cada corazón. */
const PIXELS_PER_HEART = 90;
/** Radio en píxeles alrededor de la cabeza dentro del cual la caricia es "en la cabeza". */
const HEAD_RADIUS = 58;
const IDLE_CLIPS: ClipName[] = ['Idle', 'Idle', 'Idle', 'IdleLook', 'IdleLook', 'Sniff'];

const random = (min: number, max: number): number => min + Math.random() * (max - min);
const headWorld = new THREE.Vector3();
const nape = new THREE.Vector3();
const base = new THREE.Vector3();
const pivot = new THREE.Vector3();
const fingertips = new THREE.Vector3();
const yawTurn = new THREE.Quaternion();
const swayTurn = new THREE.Quaternion();

/** Decide qué hace el perro en cada momento y mueve la ventana por el escritorio. */
export class Behavior {
  needs: Needs;

  private activity: Activity = 'idle';
  private posture: Posture = 'stand';
  private pending: Activity | null = null;
  private clock = 0;
  private phase = 0;
  private duration = 0;
  /** Lado hacia el que mira: 1 es a la derecha de la pantalla. */
  private side = -1;
  private facing = -0.65;
  /** Giro actual hacia `facing`. */
  private yaw = -0.65;
  /** 0 en el suelo, 1 levantado por la mano. */
  private carry = 0;
  /** 0 a 1: cuánto se ve la mano. */
  private grip = 0;
  private sway = 0;
  private swaySpeed = 0;
  /** Velocidad horizontal del arrastre, en píxeles lógicos por segundo. */
  private dragSpeed = 0;
  private lastDrag: { x: number; time: number } | null = null;
  private time = 0;
  private petLevel = 0;
  private heartMeter = 0;
  private emoteClock = 0;

  private windowPosition: Point = { x: 0, y: 0 };
  private windowSize: Point = { x: 0, y: 0 };
  private work: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private targetX = 0;
  private ready = false;
  private fallSpeed = 0;

  constructor(
    private readonly dog: Dog,
    private readonly desktop: Desktop,
    private readonly stage: Stage,
    private readonly bowl: Bowl,
    private readonly hand: Hand,
    private readonly hud: Hud,
    needs: Needs,
  ) {
    this.needs = needs;
  }

  /** Coloca la ventana en el suelo del escritorio, en la posición guardada o junto a la bandeja. */
  async init(savedX: number | undefined): Promise<void> {
    await this.measureDesktop();
    this.windowPosition = { x: this.clampX(savedX ?? this.homeX), y: this.floorY };
    await this.desktop.moveWindow(this.windowPosition);
    this.ready = true;
    this.begin('idle');
  }

  /**
   * Vuelve a apoyar la ventana en el suelo cuando cambia su tamaño. Hace falta porque al arrancar
   * la ventana se mide antes de que Windows le quite la barra de título, y saldría demasiado baja.
   */
  async relayout(): Promise<void> {
    if (!this.ready) return;
    await this.measureDesktop();
    if (this.activity === 'held' || this.activity === 'fall') return;
    this.windowPosition = { x: this.clampX(this.windowPosition.x), y: this.floorY };
    await this.desktop.moveWindow(this.windowPosition);
  }

  get asleep(): boolean {
    return this.activity === 'sleep' && this.phase === 1;
  }

  get windowX(): number {
    return this.windowPosition.x;
  }

  private get floorY(): number {
    return this.work.y + this.work.height - this.windowSize.y;
  }

  private get homeX(): number {
    return this.work.x + this.work.width - this.windowSize.x - 80 * window.devicePixelRatio;
  }

  private clampX(x: number): number {
    return Math.min(Math.max(x, this.work.x), this.work.x + this.work.width - this.windowSize.x);
  }

  private async measureDesktop(): Promise<void> {
    this.work = await this.desktop.workArea();
    this.windowSize = this.desktop.windowSize();
  }

  // ------------------------------------------------------------------ órdenes del usuario

  /**
   * El usuario frota al perro. En la cabeza la disfruta más: la levanta y cierra los ojos;
   * en el lomo solo mueve la cola. Sin punto se considera en la cabeza.
   */
  stroke(pixels: number, point?: Point): void {
    if (this.activity === 'held' || this.activity === 'fall') return;
    this.needs = pet(this.needs, pixels);
    const head = this.headOnScreen();
    const onHead = !point || Math.hypot(point.x - head.x, point.y - head.y) < HEAD_RADIUS;
    this.petLevel = Math.max(this.petLevel, onHead ? 1 : 0.45);
    this.stage.setFps(FPS_ACTIVE);
    this.heartMeter += pixels;
    if (this.heartMeter >= PIXELS_PER_HEART) {
      this.heartMeter = 0;
      this.hud.emote('❤️', head);
    }
    if (this.asleep) this.begin('lie');
    else if (this.activity === 'walk') this.begin('idle');
    else if (this.activity === 'sad' && !this.lowSpirits) this.begin('happy');
  }

  /** Devuelve false si no ha comido (está lleno u ocupado). */
  feed(): boolean {
    if (this.activity === 'eat' || this.activity === 'held' || this.activity === 'fall') return false;
    if (this.pending === 'eat') return false;
    if (!canEat(this.needs)) {
      this.hud.say('Está lleno');
      return false;
    }
    this.needs = feed(this.needs);
    this.start('eat');
    return true;
  }

  /** Trae al perro junto a la bandeja del sistema. */
  async come(): Promise<void> {
    await this.measureDesktop();
    this.windowPosition = { x: this.homeX, y: this.floorY };
    void this.desktop.moveWindow(this.windowPosition);
    if (this.activity !== 'eat') this.start('happy');
  }

  grab(): void {
    this.bowl.hide();
    this.hud.closePanel();
    this.posture = 'stand';
    this.pending = null;
    this.lastDrag = null;
    this.dragSpeed = 0;
    this.begin('held');
  }

  drag(position: Point): void {
    if (this.activity !== 'held') return;
    // La velocidad del arrastre es lo que hace que se balancee.
    const now = performance.now();
    if (this.lastDrag && now > this.lastDrag.time) {
      const speed = (((position.x - this.lastDrag.x) / (now - this.lastDrag.time)) * 1000) / window.devicePixelRatio;
      this.dragSpeed += (speed - this.dragSpeed) * 0.5;
    }
    this.lastDrag = { x: position.x, time: now };
    this.windowPosition = position;
    void this.desktop.moveWindow(position);
  }

  /** Al soltarlo cae hasta el suelo del monitor en el que esté. */
  async drop(): Promise<void> {
    await this.measureDesktop();
    this.windowPosition.x = this.clampX(this.windowPosition.x);
    this.begin('fall');
  }

  /** Fuerza una actividad. Solo para pruebas y depuración. */
  force(activity: Choice | 'happy'): void {
    this.start(activity);
  }

  // ------------------------------------------------------------------ máquina de estados

  /** Cambia de actividad, levantándose antes si la nueva no encaja con la postura actual. */
  private start(activity: Activity): void {
    const fitsPosture =
      this.posture === 'stand' ||
      (this.posture === 'sit' && activity === 'sit') ||
      (this.posture === 'lie' && (activity === 'lie' || activity === 'sleep'));
    if (fitsPosture) {
      this.begin(activity);
    } else if (this.activity === 'rise') {
      // Ya se está levantando: solo cambia lo que hará después.
      this.pending = activity;
    } else {
      this.pending = activity;
      this.begin('rise');
    }
  }

  private begin(activity: Activity): void {
    this.activity = activity;
    this.clock = 0;
    this.phase = 0;
    this.dog.tongueOut = activity === 'happy' || activity === 'held';
    this.stage.setFps(CALM.has(activity) ? FPS_CALM : FPS_ACTIVE);

    switch (activity) {
      case 'idle':
        this.duration = random(5, 11);
        this.facing = this.side * 0.65;
        this.dog.play(IDLE_CLIPS[Math.floor(Math.random() * IDLE_CLIPS.length)]);
        break;
      case 'walk': {
        const min = this.work.x;
        const max = this.work.x + this.work.width - this.windowSize.x;
        const reach = 200 * window.devicePixelRatio;
        // Si no hay sitio a un lado, va hacia el otro.
        const goRight = this.windowPosition.x - min < reach || (max - this.windowPosition.x >= reach && Math.random() < 0.5);
        this.targetX = goRight ? random(Math.min(this.windowPosition.x + reach, max), max) : random(min, Math.max(this.windowPosition.x - reach, min));
        this.side = this.targetX >= this.windowPosition.x ? 1 : -1;
        this.facing = this.side * SIDE;
        this.dog.play('Walk', { speed: this.lowSpirits ? 0.7 : 1 });
        break;
      }
      case 'sit':
        this.duration = random(10, 24);
        this.facing = this.side * 0.5;
        if (this.posture === 'sit') {
          this.dog.play('Sit');
          this.phase = 1;
        } else {
          this.dog.play('SitDown', { once: true });
        }
        break;
      case 'lie':
        this.duration = random(14, 34);
        this.facing = this.side * LYING_FACING;
        if (this.posture === 'lie') {
          this.dog.play('Lie', { fade: 0.6 });
          this.phase = 1;
        } else {
          this.dog.play('LieDown', { once: true });
        }
        break;
      case 'sleep':
        this.facing = this.side * LYING_FACING;
        if (this.posture === 'lie') this.fallAsleep();
        else this.dog.play('LieDown', { once: true });
        break;
      case 'sad':
        this.duration = random(7, 13);
        this.facing = this.side * 0.65;
        this.dog.play('Sad', { fade: 0.6 });
        break;
      case 'happy':
        this.dog.play('Happy', { fade: 0.15 });
        break;
      case 'eat':
        this.side = 1;
        this.facing = SIDE;
        this.bowl.show(BOWL_X);
        this.dog.play('Happy', { fade: 0.15 });
        break;
      case 'held':
        // De frente, como un cachorro al que sostienen en alto de cara a ti.
        this.facing = 0;
        this.dog.play('Carry', { fade: 0.2 });
        break;
      case 'fall':
        this.fallSpeed = 0;
        break;
      case 'rise':
        this.dog.play(this.posture === 'sit' ? 'SitDown' : 'LieDown', { once: true, reverse: true, fade: 0.25 });
        break;
    }
  }

  private fallAsleep(): void {
    this.posture = 'lie';
    this.phase = 1;
    this.dog.play('Sleep', { fade: 0.9 });
    // Dormido casi no se mueve: con menos fotogramas por segundo gasta menos.
    this.stage.setFps(FPS_ASLEEP);
  }

  private next(): void {
    this.start(pickActivity(mood(this.needs), Math.random()));
  }

  private get lowSpirits(): boolean {
    const current = mood(this.needs);
    return current === 'hungry' || current === 'sad';
  }

  update(delta: number): void {
    this.clock += delta;

    switch (this.activity) {
      case 'idle':
      case 'sad':
        if (this.clock > this.duration) this.next();
        break;
      case 'walk':
        this.walk(delta);
        break;
      case 'sit':
      case 'lie':
        if (this.phase === 0) {
          if (this.dog.finished) {
            this.posture = this.activity;
            this.phase = 1;
            this.clock = 0;
            this.dog.play(this.activity === 'sit' ? 'Sit' : 'Lie');
          }
        } else if (this.clock > this.duration) {
          this.next();
        }
        break;
      case 'sleep':
        if (this.phase === 0) {
          if (this.dog.finished) this.fallAsleep();
        } else if (this.needs.energy >= RESTED) {
          this.start('idle');
        }
        break;
      case 'happy':
        if (this.clock > HAPPY_SECONDS) this.begin('idle');
        break;
      case 'eat':
        if (this.phase === 0) {
          if (this.clock > 0.8) {
            this.phase = 1;
            this.clock = 0;
            this.dog.play('Eat', { fade: 0.35 });
          }
        } else {
          this.bowl.setLevel(1 - this.clock / EAT_SECONDS);
          if (this.clock > EAT_SECONDS) {
            this.bowl.hide();
            this.begin('happy');
          }
        }
        break;
      case 'fall':
        this.fall(delta);
        break;
      case 'rise':
        if (this.dog.finished) {
          this.posture = 'stand';
          const pending = this.pending ?? 'idle';
          this.pending = null;
          this.begin(pending);
        }
        break;
      case 'held':
        break;
    }

    this.animateLayers(delta);
  }

  private walk(delta: number): void {
    const speed = WALK_SPEED * window.devicePixelRatio * (this.lowSpirits ? 0.7 : 1);
    const step = this.side * speed * delta;
    const remaining = this.targetX - this.windowPosition.x;
    if (Math.abs(remaining) <= Math.abs(step)) {
      this.windowPosition.x = this.targetX;
      this.begin('idle');
    } else {
      this.windowPosition.x += step;
    }
    void this.desktop.moveWindow(this.windowPosition);
  }

  private fall(delta: number): void {
    const floor = this.floorY;
    this.fallSpeed += GRAVITY * window.devicePixelRatio * delta;
    this.windowPosition.y += this.fallSpeed * delta;
    // Si lo soltaron por debajo del suelo (sobre la barra de tareas) vuelve a él directamente.
    if (this.windowPosition.y >= floor) {
      this.windowPosition.y = floor;
      this.begin('happy');
    }
    void this.desktop.moveWindow(this.windowPosition);
  }

  /** Giro suave, cola, reacción a las caricias y símbolos sobre la cabeza. */
  private animateLayers(delta: number): void {
    const turn = THREE.MathUtils.euclideanModulo(this.facing - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
    this.yaw += turn * Math.min(1, delta * 6);
    this.placeDog(delta);

    this.petLevel = Math.max(0, this.petLevel - delta * 0.9);
    this.dog.petting += (this.petLevel - this.dog.petting) * Math.min(1, delta * 8);
    this.dog.eyesClosed = this.asleep || this.petLevel > 0.55;

    this.dog.wag += (this.wagTarget() - this.dog.wag) * Math.min(1, delta * 4);

    const head = this.headOnScreen();
    const current = mood(this.needs);
    this.hud.setBubble(this.activity === 'sad' ? (current === 'hungry' ? '🍖' : '💔') : null, head);

    if (this.asleep) {
      this.emoteClock += delta;
      if (this.emoteClock > 2.6) {
        this.emoteClock = 0;
        this.hud.emote('💤', head);
      }
    }
  }

  /**
   * Coloca al perro en la escena. En el suelo solo cuenta hacia dónde mira; cuando la mano lo
   * lleva, además sube y se balancea como un péndulo que cuelga de la nuca.
   */
  private placeDog(delta: number): void {
    const held = this.activity === 'held';
    // Mientras cae sigue con las patas recogidas, y se posa al llegar al suelo. Si bajara dentro
    // de la ventana antes de cambiar de postura, las patas traseras asomarían por debajo.
    const lifted = held || this.activity === 'fall';
    this.time += delta;
    this.carry += ((lifted ? 1 : 0) - this.carry) * Math.min(1, delta * (lifted ? 7 : 6));
    // La mano, en cambio, suelta en cuanto se suelta el ratón.
    this.grip += ((held ? 1 : 0) - this.grip) * Math.min(1, delta * (held ? 15 : 12));

    this.dragSpeed *= Math.exp(-delta * 5);
    const pushed = THREE.MathUtils.clamp(-this.dragSpeed * SWAY_PER_SPEED, -SWAY_MAX, SWAY_MAX);
    const target = held ? pushed + SWAY_IDLE * Math.sin(this.time * 2.3) : 0;
    this.swaySpeed += (SWAY_STIFFNESS * (target - this.sway) - SWAY_DAMPING * this.swaySpeed) * delta;
    this.sway += this.swaySpeed * delta;

    const root = this.dog.root;
    // La nuca en coordenadas del propio perro: no depende de dónde esté colocado ahora.
    root.worldToLocal(this.dog.napePosition(nape));
    // Primero baja la mano y después lo levanta.
    base.set(0, CARRY_LIFT * THREE.MathUtils.smoothstep(this.carry, 0.3, 1), 0);
    yawTurn.setFromAxisAngle(UP, this.yaw);
    swayTurn.setFromAxisAngle(TOWARD_CAMERA, this.sway);
    pivot.copy(nape).applyQuaternion(yawTurn).add(base);
    root.quaternion.copy(swayTurn).multiply(yawTurn);
    root.position.copy(base).sub(pivot).applyQuaternion(swayTurn).add(pivot);

    // La mano gira con el perro alrededor de la nuca.
    fingertips.copy(HAND_GRIP).applyQuaternion(swayTurn).add(pivot);
    this.hand.place(fingertips, this.sway + HAND_TILT, this.grip);
  }

  private wagTarget(): number {
    if (this.petLevel > 0.1 && !this.asleep) return 0.9;
    switch (this.activity) {
      case 'happy':
      case 'eat':
        return 1;
      case 'held':
        // Va encantado: que se note.
        return 0.9;
      case 'sleep':
      case 'sad':
      case 'fall':
        return 0;
      default:
        break;
    }
    const current = mood(this.needs);
    if (current === 'happy') return 0.5;
    if (current === 'content') return 0.22;
    return 0.04;
  }

  private headOnScreen(): Point {
    return this.stage.project(this.dog.headPosition(headWorld));
  }
}
