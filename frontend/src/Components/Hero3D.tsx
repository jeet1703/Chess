import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Chess, Move, PieceSymbol, Square } from "chess.js";

// Italian Game, Møller line. Plays on a loop until the viewer clicks the board.
const DEMO_LINE = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+", "Nc3", "Nxe4", "O-O"];
const DEMO_STEP = 1.3; // seconds between demo moves

const C = {
  light: 0xf0e2c8,
  dark: 0xb98a62,
  frame: 0x5b3f2c,
  white: 0xf6f1e8,
  black: 0x2b2522,
  highlight: 0xf5c84c,
  check: 0xe5484d,
  marker: 0x1c1917,
};

type Part = { geo: THREE.BufferGeometry; p?: [number, number, number]; r?: [number, number, number] };

const lathe = (pts: number[][]) =>
  new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 40);

const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);

// Turned-wood profiles for each piece, built once and shared.
const buildParts = (): Record<PieceSymbol, Part[]> => {
  const egg = new THREE.SphereGeometry(0.17, 32, 24);
  egg.scale(1, 1.35, 1);
  return {
    p: [
      { geo: lathe([[0, 0], [0.33, 0], [0.33, 0.06], [0.26, 0.1], [0.16, 0.16], [0.11, 0.4], [0.19, 0.43], [0.19, 0.46], [0.1, 0.48], [0, 0.48]]) },
      { geo: new THREE.SphereGeometry(0.15, 32, 24), p: [0, 0.6, 0] },
    ],
    r: [
      { geo: lathe([[0, 0], [0.36, 0], [0.36, 0.07], [0.29, 0.11], [0.22, 0.17], [0.2, 0.6], [0.27, 0.63], [0.27, 0.8], [0, 0.8]]) },
      ...[0, 1, 2, 3].map((i): Part => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return { geo: box(0.12, 0.1, 0.12), p: [Math.cos(a) * 0.19, 0.85, Math.sin(a) * 0.19], r: [0, -a, 0] };
      }),
    ],
    n: [
      { geo: lathe([[0, 0], [0.35, 0], [0.35, 0.07], [0.27, 0.11], [0.2, 0.18], [0.2, 0.3], [0, 0.3]]) },
      { geo: box(0.28, 0.5, 0.34), p: [0, 0.52, 0.04], r: [0.25, 0, 0] },
      { geo: box(0.24, 0.2, 0.5), p: [0, 0.78, -0.08], r: [-0.35, 0, 0] },
      { geo: box(0.06, 0.42, 0.1), p: [0, 0.62, 0.2], r: [0.25, 0, 0] },
      { geo: box(0.06, 0.12, 0.06), p: [0.07, 0.92, 0.08] },
      { geo: box(0.06, 0.12, 0.06), p: [-0.07, 0.92, 0.08] },
    ],
    b: [
      { geo: lathe([[0, 0], [0.35, 0], [0.35, 0.07], [0.28, 0.11], [0.18, 0.18], [0.12, 0.5], [0.21, 0.54], [0.21, 0.57], [0.12, 0.6], [0, 0.6]]) },
      { geo: egg, p: [0, 0.78, 0] },
      { geo: new THREE.SphereGeometry(0.05, 16, 12), p: [0, 1.03, 0] },
    ],
    q: [
      { geo: lathe([[0, 0], [0.38, 0], [0.38, 0.08], [0.3, 0.12], [0.2, 0.2], [0.13, 0.7], [0.24, 0.74], [0.24, 0.78], [0.16, 0.82], [0.22, 0.98], [0, 0.98]]) },
      { geo: new THREE.SphereGeometry(0.08, 20, 16), p: [0, 1.04, 0] },
    ],
    k: [
      { geo: lathe([[0, 0], [0.38, 0], [0.38, 0.08], [0.3, 0.12], [0.2, 0.2], [0.14, 0.75], [0.25, 0.79], [0.25, 0.83], [0.17, 0.86], [0.21, 1.0], [0, 1.0]]) },
      { geo: box(0.07, 0.28, 0.07), p: [0, 1.13, 0] },
      { geo: box(0.22, 0.07, 0.07), p: [0, 1.15, 0] },
    ],
  };
};

const sqPos = (sq: Square) =>
  new THREE.Vector3(sq.charCodeAt(0) - 97 - 3.5, 0, 4.5 - Number(sq[1]));

const pointToSquare = (p: THREE.Vector3): Square | null => {
  const file = Math.floor(p.x + 4);
  const rank = Math.floor(5 - p.z);
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
  return `${"abcdefgh"[file]}${rank}` as Square;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const bounce = (t: number) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

export interface Hero3DStatus { mode: 'demo' | 'play'; text: string }
export interface Hero3DHandle { reset: () => void; demo: () => void }

interface Hero3DProps {
  onStatus?: (s: Hero3DStatus) => void;
  controlRef?: React.MutableRefObject<Hero3DHandle | null>;
  className?: string;
}

export const Hero3D = ({ onStatus, controlRef, className = '' }: Hero3DProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    // Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dccb, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(5, 11, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -7; sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.6);
    fill.position.set(-6, 4, -5);
    scene.add(fill);

    // Board
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

    const squareGeo = track(box(1, 0.2, 1));
    const lightMat = track(new THREE.MeshStandardMaterial({ color: C.light, roughness: 0.65 }));
    const darkMat = track(new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.6 }));
    const squares: THREE.Mesh[] = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const m = new THREE.Mesh(squareGeo, (f + r) % 2 === 1 ? darkMat : lightMat);
        m.position.set(f - 3.5, -0.1, 4.5 - r);
        m.receiveShadow = true;
        scene.add(m);
        squares.push(m);
      }
    }
    const frame = new THREE.Mesh(
      track(box(9, 0.32, 9)),
      track(new THREE.MeshStandardMaterial({ color: C.frame, roughness: 0.45, metalness: 0.05 }))
    );
    frame.position.y = -0.17;
    frame.castShadow = true;
    frame.receiveShadow = true;
    scene.add(frame);

    const ground = new THREE.Mesh(
      track(new THREE.PlaneGeometry(60, 60)),
      track(new THREE.ShadowMaterial({ opacity: 0.12 }))
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.33;
    ground.receiveShadow = true;
    scene.add(ground);

    // Square overlays: last move, selection, check, legal-move markers
    const overlayGeo = track(new THREE.PlaneGeometry(1, 1));
    const makeOverlay = (color: number, opacity: number) => {
      const m = new THREE.Mesh(overlayGeo, track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.004;
      m.visible = false;
      scene.add(m);
      return m;
    };
    const lastFrom = makeOverlay(C.highlight, 0.4);
    const lastTo = makeOverlay(C.highlight, 0.4);
    const selOverlay = makeOverlay(C.highlight, 0.7);
    const checkOverlay = makeOverlay(C.check, 0.6);
    const dotGeo = track(new THREE.CircleGeometry(0.16, 32));
    const ringGeo = track(new THREE.RingGeometry(0.38, 0.47, 40));
    const markerMat = track(new THREE.MeshBasicMaterial({ color: C.marker, transparent: true, opacity: 0.22, depthWrite: false }));
    const markers = new THREE.Group();
    scene.add(markers);

    const place = (m: THREE.Object3D, sq: Square, y = 0.004) => {
      const p = sqPos(sq);
      m.position.set(p.x, y, p.z);
      m.visible = true;
    };

    // Pieces
    const parts = buildParts();
    Object.values(parts).flat().forEach((pt) => track(pt.geo));
    const mats = {
      w: track(new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.35 })),
      b: track(new THREE.MeshStandardMaterial({ color: C.black, roughness: 0.3, metalness: 0.1 })),
    };

    const buildPiece = (type: PieceSymbol, color: 'w' | 'b') => {
      const outer = new THREE.Group();
      const body = new THREE.Group();
      body.name = 'body';
      for (const pt of parts[type]) {
        const m = new THREE.Mesh(pt.geo, mats[color]);
        if (pt.p) m.position.set(...pt.p);
        if (pt.r) m.rotation.set(...pt.r);
        m.castShadow = true;
        m.receiveShadow = true;
        body.add(m);
      }
      if (color === 'b') body.rotation.y = Math.PI;
      outer.add(body);
      return outer;
    };

    // Tweens
    type Tween = { start: number; dur: number; update: (k: number) => void; done?: () => void };
    let tweens: Tween[] = [];
    let now = 0;
    const tween = (dur: number, update: Tween['update'], done?: () => void, delay = 0) =>
      tweens.push({ start: now + delay, dur, update, done });

    const chess = new Chess();
    const pieces = new Map<Square, THREE.Group>();
    const sliding = new Set<THREE.Group>();

    const fadeOut = (g: THREE.Group, delay = 0) => {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.material = (o.material as THREE.Material).clone();
          (o.material as THREE.Material).transparent = true;
        }
      });
      const y0 = g.position.y;
      tween(0.4, (k) => {
        const e = easeOut(k);
        g.scale.setScalar(1 - 0.5 * e);
        g.position.y = y0 - 0.3 * e;
        g.traverse((o) => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).opacity = 1 - e; });
      }, () => {
        scene.remove(g);
        g.traverse((o) => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose(); });
      }, delay);
    };

    const spawnAll = (drop: boolean) => {
      pieces.forEach((g) => fadeOut(g));
      pieces.clear();
      let i = 0;
      chess.board().flat().forEach((p) => {
        if (!p) return;
        const g = buildPiece(p.type, p.color);
        const target = sqPos(p.square);
        g.position.copy(target);
        scene.add(g);
        pieces.set(p.square, g);
        if (drop) {
          const h = 3 + Math.random() * 1.5;
          g.position.y = h;
          g.visible = false;
          tween(0.7, (k) => {
            g.visible = true;
            g.position.y = h * (1 - bounce(k));
          }, undefined, 0.25 + i * 0.03);
        }
        i++;
      });
    };

    const slide = (g: THREE.Group, to: Square, arcBoost = 0, done?: () => void) => {
      const from = g.position.clone();
      const dest = sqPos(to);
      const dist = from.distanceTo(dest);
      const arc = 0.35 + dist * 0.07 + arcBoost;
      sliding.add(g);
      tween(0.55, (k) => {
        const e = easeInOut(k);
        g.position.lerpVectors(from, dest, e);
        g.position.y = Math.sin(Math.PI * e) * arc;
      }, () => { sliding.delete(g); done?.(); });
    };

    const refreshHighlights = (last?: Move) => {
      if (last) { place(lastFrom, last.from); place(lastTo, last.to); }
      else { lastFrom.visible = false; lastTo.visible = false; }
      checkOverlay.visible = false;
      if (chess.inCheck()) {
        const king = chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn());
        if (king) place(checkOverlay, king.square, 0.006);
      }
    };

    const applyMove = (move: Move) => {
      const g = pieces.get(move.from);
      if (!g) return;
      let capSq: Square = move.to;
      if (move.flags.includes('e')) capSq = `${move.to[0]}${move.from[1]}` as Square;
      const victim = move.captured ? pieces.get(capSq) : undefined;
      if (victim) { pieces.delete(capSq); fadeOut(victim, 0.25); }
      pieces.delete(move.from);
      pieces.set(move.to, g);

      slide(g, move.to, move.piece === 'n' ? 0.5 : 0, () => {
        if (move.promotion) {
          const q = buildPiece(move.promotion, move.color);
          q.position.copy(sqPos(move.to));
          scene.add(q);
          fadeOut(g);
          pieces.set(move.to, q);
          tween(0.35, (k) => q.scale.setScalar(0.4 + 0.6 * easeOut(k)));
        }
      });

      const back = move.color === 'w' ? '1' : '8';
      const rookMove = move.flags.includes('k') ? [`h${back}`, `f${back}`] : move.flags.includes('q') ? [`a${back}`, `d${back}`] : null;
      if (rookMove) {
        const [rf, rt] = rookMove as [Square, Square];
        const rook = pieces.get(rf);
        if (rook) {
          pieces.delete(rf);
          pieces.set(rt, rook);
          tweens.push({ start: now + 0.15, dur: 0, update: () => {}, done: () => slide(rook, rt) });
        }
      }
      refreshHighlights(move);
    };

    // Status reporting
    let mode: 'demo' | 'play' = 'demo';
    const report = () => {
      const hist = chess.history();
      let text: string;
      if (mode === 'demo') {
        const i = hist.length - 1;
        text = i >= 0 ? `${Math.floor(i / 2) + 1}.${i % 2 ? '..' : ''} ${hist[i]}` : 'Italian Game';
      } else if (chess.isCheckmate()) {
        text = `Checkmate. ${chess.turn() === 'w' ? 'Black' : 'White'} wins`;
      } else if (chess.isDraw()) {
        text = 'Draw';
      } else {
        text = `${chess.turn() === 'w' ? 'White' : 'Black'} to move${chess.inCheck() ? ', in check' : ''}`;
      }
      statusRef.current?.({ mode, text });
    };

    // Selection
    let selected: Square | null = null;
    let targets: Square[] = [];
    const select = (sq: Square | null) => {
      selected = sq;
      markers.clear();
      selOverlay.visible = false;
      targets = [];
      if (!sq) return;
      place(selOverlay, sq, 0.005);
      const legal = chess.moves({ square: sq, verbose: true });
      targets = legal.map((m) => m.to);
      legal.forEach((m) => {
        const marker = new THREE.Mesh(m.captured ? ringGeo : dotGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        place(marker, m.to, 0.008);
        marker.scale.setScalar(0.01);
        markers.add(marker);
        tween(0.18, (k) => marker.scale.setScalar(Math.max(0.01, easeOut(k))));
      });
    };

    let demoPly = 0;
    let nextDemoAt = 2.4;

    const reset = (toMode: 'demo' | 'play') => {
      mode = toMode;
      chess.reset();
      select(null);
      refreshHighlights();
      spawnAll(true);
      demoPly = 0;
      nextDemoAt = now + 2;
      report();
    };

    const handleSquare = (sq: Square) => {
      if (mode === 'demo') {
        mode = 'play';
        report();
      }
      if (chess.isGameOver()) return;
      const piece = chess.get(sq);
      if (piece && piece.color === chess.turn()) {
        select(sq === selected ? null : sq);
        return;
      }
      if (selected && targets.includes(sq)) {
        const move = chess.move({ from: selected, to: sq, promotion: 'q' });
        select(null);
        applyMove(move);
        report();
        return;
      }
      select(null);
    };

    // Pointer input
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const parallax = new THREE.Vector2();
    let hoverSq: Square | null = null;
    let downAt: { x: number; y: number } | null = null;

    const pick = (ev: PointerEvent): Square | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const objs: THREE.Object3D[] = [...squares];
      pieces.forEach((g) => objs.push(g));
      const hit = raycaster.intersectObjects(objs, true)[0];
      return hit ? pointToSquare(hit.point) : null;
    };

    const onMove = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      parallax.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, ((ev.clientY - rect.top) / rect.height) * 2 - 1);
      hoverSq = pick(ev);
      const p = hoverSq ? chess.get(hoverSq) : null;
      const actionable = !!hoverSq && ((!!p && p.color === chess.turn()) || targets.includes(hoverSq));
      renderer.domElement.style.cursor = actionable ? 'pointer' : 'default';
    };
    const onDown = (ev: PointerEvent) => { downAt = { x: ev.clientX, y: ev.clientY }; };
    const onUp = (ev: PointerEvent) => {
      if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 6) { downAt = null; return; }
      downAt = null;
      const sq = pick(ev);
      if (sq) handleSquare(sq);
    };
    const onLeave = () => { hoverSq = null; parallax.set(0, 0); };
    const el = renderer.domElement;
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);

    // Sizing and visibility
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      // Pull back on narrow screens so the whole board stays in frame.
      camera.zoom = Math.min(0.92, camera.aspect / 1.35);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let onScreen = true;
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
    io.observe(host);

    // Main loop: intro camera sweep, slow orbit, demo playback, tweens
    const start = performance.now();
    const look = new THREE.Vector3(0, -0.3, 0);
    let orbitAmp = 0.35;
    const parallaxEased = new THREE.Vector2();
    let raf = 0;

    const frameLoop = () => {
      raf = requestAnimationFrame(frameLoop);
      now = (performance.now() - start) / 1000;

      // Tweens
      const active = tweens;
      tweens = [];
      for (const t of active) {
        const k = t.dur === 0 ? 1 : (now - t.start) / t.dur;
        if (k < 0) { tweens.push(t); continue; }
        t.update(Math.min(1, k));
        if (k >= 1) t.done?.(); else tweens.push(t);
      }

      // Demo playback
      if (mode === 'demo' && !reduced && now >= nextDemoAt) {
        if (demoPly < DEMO_LINE.length) {
          applyMove(chess.move(DEMO_LINE[demoPly]));
          demoPly++;
          nextDemoAt = now + DEMO_STEP;
          report();
        } else {
          reset('demo');
          nextDemoAt = now + 2.4;
        }
      }

      // Hover / selection lift
      pieces.forEach((g, sq) => {
        const body = g.getObjectByName('body');
        if (!body) return;
        const target = sq === selected ? 0.22 : (sq === hoverSq && !sliding.has(g) && chess.get(sq)?.color === chess.turn() && mode === 'play') ? 0.08 : 0;
        body.position.y += (target - body.position.y) * 0.2;
      });

      // Camera
      const intro = reduced ? 1 : easeOut(Math.min(1, now / 2.6));
      orbitAmp += ((mode === 'demo' ? 0.35 : 0.06) - orbitAmp) * 0.02;
      parallaxEased.lerp(parallax, 0.05);
      const angle = (1 - intro) * -1.1 + (reduced ? 0 : orbitAmp * Math.sin(now * 0.12)) + parallaxEased.x * 0.12;
      const radius = THREE.MathUtils.lerp(24, 12.5, intro);
      const height = THREE.MathUtils.lerp(16, 9.2, intro) + parallaxEased.y * 0.5;
      camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
      camera.lookAt(look);

      if (onScreen) renderer.render(scene, camera);
    };

    spawnAll(!reduced);
    report();
    frameLoop();

    if (controlRef) {
      controlRef.current = {
        reset: () => reset('play'),
        demo: () => reset('demo'),
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      if (controlRef) controlRef.current = null;
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      host.removeChild(el);
    };
  }, [controlRef]);

  if (failed) {
    return (
      <div className={`grid place-items-center text-stone-400 text-sm ${className}`}>
        Your browser can't show the 3D board (WebGL is off).
      </div>
    );
  }

  return <div ref={hostRef} className={className} />;
};
