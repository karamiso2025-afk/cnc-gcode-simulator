'use client';
import React, { useRef, useMemo, useEffect, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Viewer3DProps, PathSegment, BoundingBox, Point3D } from '../shared-types';

/* ---------- WebGL detection & Error Boundary ---------- */
function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return true; // SSR
  try {
    const cvs = document.createElement('canvas');
    return !!(cvs.getContext('webgl2') || cvs.getContext('webgl') || cvs.getContext('experimental-webgl'));
  } catch { return false; }
}

function WebGLUnsupported(): JSX.Element {
  return (
    <div className="flex items-center justify-center w-full h-full bg-zinc-900 text-white p-8">
      <div className="text-center max-w-md space-y-4">
        <p className="text-2xl font-bold text-red-400">⚠ WebGL非対応</p>
        <p>お使いのPC（グラフィックボード）はWebGL 3D描画に対応していません。</p>
        <div className="text-left text-sm text-zinc-400 space-y-1">
          <p>■ 対処法:</p>
          <p>・Chrome/Edgeを最新版に更新</p>
          <p>・chrome://flags → WebGL Draft Extensions を有効化</p>
          <p>・グラフィックドライバーを最新版に更新</p>
          <p>・GPUが古すぎる場合は新しいPCをお試しください</p>
        </div>
      </div>
    </div>
  );
}

class WebGLErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('WebGL Error:', error, info);
  }
  render(): ReactNode {
    if (this.state.hasError) return <WebGLUnsupported />;
    return this.props.children;
  }
}

type Props = Partial<Viewer3DProps>;

// Color constants for movement types
const COLOR_RAPID = '#ff0000';
const COLOR_LINEAR = '#3366ff';
const COLOR_ARC = '#33cc33';

function getSegmentColor(seg: PathSegment): string {
  switch (seg.type) {
    case 'rapid': return COLOR_RAPID;
    case 'linear': return COLOR_LINEAR;
    case 'arc_cw':
    case 'arc_ccw': return COLOR_ARC;
    default: return COLOR_LINEAR;
  }
}

function toVec3(p: Point3D): [number, number, number] {
  return [p.x, p.z, -p.y]; // Convert CNC coords (X,Y,Z) to Three.js (X=X, Y=Z, Z=-Y)
}

// Flatten to XY plane: CNC Z → 0, so Three.js Y = 0
function toVec3Flat(p: Point3D): [number, number, number] {
  return [p.x, 0, -p.y];
}

interface PathLinesProps {
  segments: PathSegment[];
  currentSegmentIndex: number;
  currentProgress: number;
  showRapids: boolean;
  boundingBox: BoundingBox | null;
  xyPlaneView?: boolean;
}

/**
 * Native THREE.LineSegments for rapid moves — avoids drei Line2 dashed rendering artifacts.
 * Merges all rapid segments into a single geometry with LineDashedMaterial.
 */
function RapidDashedLines({ segments, currentSegmentIndex, showRapids, xyPlaneView = false }: {
  segments: PathSegment[];
  currentSegmentIndex: number;
  showRapids: boolean;
  xyPlaneView?: boolean;
}): JSX.Element | null {
  const geometry = useMemo(() => {
    if (!showRapids) return null;
    const conv = xyPlaneView ? toVec3Flat : toVec3;
    const positions: number[] = [];
    const lineDistances: number[] = [];

    const visibleSegments = segments.slice(0, currentSegmentIndex + 1);
    for (const seg of visibleSegments) {
      if (seg.type !== 'rapid') continue;
      const s = conv(seg.start);
      const e = conv(seg.end);
      positions.push(s[0], s[1], s[2], e[0], e[1], e[2]);
      // Compute lineDistance inline — prevents 1-frame solid flash from useEffect delay
      const dx = e[0] - s[0], dy = e[1] - s[1], dz = e[2] - s[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      lineDistances.push(0, dist);
    }

    if (positions.length === 0) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('lineDistance', new THREE.Float32BufferAttribute(lineDistances, 1));
    return geom;
  }, [segments, currentSegmentIndex, showRapids, xyPlaneView]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineDashedMaterial color={COLOR_RAPID} dashSize={2} gapSize={2} transparent opacity={0.8} />
    </lineSegments>
  );
}

/**
 * Native THREE.LineSegments for cutting paths — avoids drei Line2 rendering artifacts on zoom.
 * Groups all linear and arc segments by color into merged geometries.
 */
function CuttingPathLines({ segments, currentSegmentIndex, xyPlaneView = false }: {
  segments: PathSegment[];
  currentSegmentIndex: number;
  xyPlaneView?: boolean;
}): JSX.Element {
  const geometries = useMemo(() => {
    const conv = xyPlaneView ? toVec3Flat : toVec3;
    // Group positions by color
    const byColor: Record<string, number[]> = {};

    const visibleSegments = segments.slice(0, currentSegmentIndex + 1);
    for (const seg of visibleSegments) {
      if (seg.type === 'rapid') continue;
      const color = getSegmentColor(seg);
      if (!byColor[color]) byColor[color] = [];
      const arr = byColor[color];

      if (seg.arcPoints && seg.arcPoints.length > 1) {
        // Arc: convert point sequence to line segments (pairs)
        for (let i = 0; i < seg.arcPoints.length - 1; i++) {
          const a = conv(seg.arcPoints[i]);
          const b = conv(seg.arcPoints[i + 1]);
          arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        }
      } else {
        const s = conv(seg.start);
        const e = conv(seg.end);
        arr.push(s[0], s[1], s[2], e[0], e[1], e[2]);
      }
    }

    const result: { geometry: THREE.BufferGeometry; color: string }[] = [];
    for (const [color, positions] of Object.entries(byColor)) {
      if (positions.length === 0) continue;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      result.push({ geometry: geom, color });
    }
    return result;
  }, [segments, currentSegmentIndex, xyPlaneView]);

  return (
    <group>
      {geometries.map((g, i) => (
        <lineSegments key={`cut-${g.color}-${i}`} geometry={g.geometry} frustumCulled={false}>
          <lineBasicMaterial color={g.color} />
        </lineSegments>
      ))}
    </group>
  );
}

function PathLines({ segments, currentSegmentIndex, showRapids, boundingBox, xyPlaneView = false }: PathLinesProps): JSX.Element {
  return (
    <group>
      <CuttingPathLines
        segments={segments}
        currentSegmentIndex={currentSegmentIndex}
        xyPlaneView={xyPlaneView}
      />
      <RapidDashedLines
        segments={segments}
        currentSegmentIndex={currentSegmentIndex}
        showRapids={showRapids}
        xyPlaneView={xyPlaneView}
      />
    </group>
  );
}

interface ToolHeadProps {
  segments: PathSegment[];
  currentSegmentIndex: number;
  currentProgress: number;
  showTool: boolean;
  toolDiameter: number;
}

function ToolHead({ segments, currentSegmentIndex, currentProgress, showTool, toolDiameter }: ToolHeadProps): JSX.Element | null {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock, camera }) => {
    if (!groupRef.current || segments.length === 0) return;
    const seg = segments[Math.min(currentSegmentIndex, segments.length - 1)];
    if (!seg) return;

    const t = Math.max(0, Math.min(1, currentProgress));
    let p: Point3D;
    if (seg.arcPoints && seg.arcPoints.length > 1 && t < 1) {
      const idx = Math.floor(t * (seg.arcPoints.length - 1));
      const localT = (t * (seg.arcPoints.length - 1)) - idx;
      const a = seg.arcPoints[idx];
      const b = seg.arcPoints[Math.min(idx + 1, seg.arcPoints.length - 1)];
      p = { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT, z: a.z + (b.z - a.z) * localT };
    } else {
      p = {
        x: seg.start.x + (seg.end.x - seg.start.x) * t,
        y: seg.start.y + (seg.end.y - seg.start.y) * t,
        z: seg.start.z + (seg.end.z - seg.start.z) * t,
      };
    }

    const [vx, vy, vz] = toVec3(p);
    groupRef.current.position.set(vx, vy, vz);

    if (!showTool) {
      // Marker mode: scale proportional to camera distance
      const dist = camera.position.distanceTo(groupRef.current.position);
      const s = dist * 0.004;
      groupRef.current.scale.set(s, s, s);

      const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 6);
      if (matRef.current) matRef.current.emissiveIntensity = pulse;
      if (ringRef.current) {
        const rs = 1 + 0.5 * pulse;
        ringRef.current.scale.set(rs, rs, rs);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - pulse * 0.5);
      }
    } else {
      // Tool mode: real-world scale (1:1 mm)
      groupRef.current.scale.set(1, 1, 1);
    }
  });

  if (segments.length === 0) return null;

  const r = toolDiameter / 2 || 3;
  const toolLength = Math.max(toolDiameter * 2, 20);

  return (
    <group ref={groupRef}>
      {showTool ? (
        <>
          {/* Tool cylinder — CNC Z+ = Three.js Y+, positioned above the tip */}
          <mesh position={[0, toolLength / 2, 0]}>
            <cylinderGeometry args={[r, r, toolLength, 32]} />
            <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} transparent opacity={0.7} />
          </mesh>
          {/* Tool tip ring on XY plane */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.2, r + 0.2, 32]} />
            <meshBasicMaterial color="#ff6600" side={THREE.DoubleSide} />
          </mesh>
        </>
      ) : (
        <>
          <mesh>
            <sphereGeometry args={[3, 16, 16]} />
            <meshStandardMaterial ref={matRef} color="#ff3300" emissive="#ff3300" emissiveIntensity={0.5} />
          </mesh>
          <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4, 6, 32]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

// Tool swept path — DISABLED: now drawn on MaterialSheet canvas instead
interface ToolSweptPathProps {
  segments: PathSegment[];
  currentSegmentIndex: number;
  toolDiameter: number;
  showTool: boolean;
  xyPlaneView?: boolean;
}

// Shader: pixel-perfect circles rendered on top of material sheet.
// depthWrite=true prevents overlapping same-Z quads from stacking opacity.
// renderOrder=2 ensures this renders AFTER MaterialSheet (renderOrder=0).
const sweptCircleMaterial = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: true,
  depthTest: true,
  uniforms: {
    uColor: { value: new THREE.Color('#ff8800') },
    uOpacity: { value: 0.7 },
  },
  vertexShader: /* glsl */ `
    attribute vec2 localUV;
    varying vec2 vUV;
    void main() {
      vUV = localUV;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUV;
    void main() {
      float dist = length(vUV);
      if (dist > 1.0) discard;
      float alpha = 1.0 - smoothstep(0.92, 1.0, dist);
      gl_FragColor = vec4(uColor, uOpacity * alpha);
    }
  `,
});

function ToolSweptPath(_props: ToolSweptPathProps): JSX.Element | null {
  // DISABLED — swept path is now drawn on MaterialSheet canvas texture
  return null;
}

interface MaterialSheetProps {
  materialSize: { x: number; y: number; z: number } | null;
  segments: PathSegment[];
  currentSegmentIndex: number;
  toolDiameter: number;
}

function MaterialSheet({ materialSize, segments, currentSegmentIndex, toolDiameter }: MaterialSheetProps): JSX.Element | null {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDrawnIdx = useRef(-1);
  const PPM = 2; // 2 pixels per mm for sharper texture

  const { canvas, texture } = useMemo(() => {
    if (!materialSize) return { canvas: null, texture: null };
    const w = Math.ceil(materialSize.x * PPM);
    const h = Math.ceil(materialSize.y * PPM);
    if (w <= 0 || h <= 0) return { canvas: null, texture: null };

    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext('2d')!;
    // Fill with yellow (material)
    ctx.fillStyle = 'rgba(255, 200, 50, 0.45)';
    ctx.fillRect(0, 0, w, h);
    // Border
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);

    const tex = new THREE.CanvasTexture(cvs);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    canvasRef.current = cvs;
    textureRef.current = tex;
    lastDrawnIdx.current = -1;
    return { canvas: cvs, texture: tex };
  }, [materialSize]);

  // Draw swept path (orange) + through-cut areas (white) on canvas
  useMemo(() => {
    if (!canvas || !materialSize || toolDiameter <= 0) return;
    const ctx = canvas.getContext('2d')!;
    const r = (toolDiameter / 2) * PPM;
    const thickness = materialSize.z;
    const hPx = materialSize.y * PPM;

    const startIdx = lastDrawnIdx.current + 1;
    const endIdx = currentSegmentIndex + 1;

    const lineW = toolDiameter * PPM; // stroke width = tool diameter

    const drawSweptAndThrough = (fromIdx: number, toIdx: number): void => {
      // Pass 1: Orange thick stroke for ALL cutting segments (tool swept path)
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ff8800';
      for (let i = fromIdx; i < toIdx && i < segments.length; i++) {
        const seg = segments[i];
        if (seg.type === 'rapid') continue;
        strokeSegmentOnCanvas(ctx, seg, lineW, PPM, hPx);
      }
      // Pass 2: White thick stroke for through-cuts only (Z < -thickness)
      ctx.strokeStyle = '#ffffff';
      for (let i = fromIdx; i < toIdx && i < segments.length; i++) {
        const seg = segments[i];
        if (seg.type === 'rapid') continue;
        if (seg.end.z >= -thickness) continue;
        strokeThroughOnCanvas(ctx, seg, lineW, PPM, hPx, thickness);
      }
    };

    if (endIdx <= startIdx) {
      // Full redraw needed (e.g. scrub backwards)
      const w = canvas.width;
      const h = canvas.height;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255, 200, 50, 0.45)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, w, h);
      drawSweptAndThrough(0, endIdx);
      lastDrawnIdx.current = currentSegmentIndex;
    } else {
      // Incremental draw
      drawSweptAndThrough(startIdx, endIdx);
      lastDrawnIdx.current = currentSegmentIndex;
    }

    if (textureRef.current) textureRef.current.needsUpdate = true;
  }, [canvas, materialSize, segments, currentSegmentIndex, toolDiameter]);

  if (!materialSize || !texture) return null;

  const cx = materialSize.x / 2;
  const cy = materialSize.y / 2;
  const pos = toVec3({ x: cx, y: cy, z: 0 });

  return (
    <mesh position={[pos[0], 0.01, pos[2]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
      <planeGeometry args={[materialSize.x, materialSize.y]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** Draw a thick stroke along a cutting segment on canvas using lineCap='round'.
 *  No individual circles — one smooth stroke per segment sub-path. */
function strokeSegmentOnCanvas(
  ctx: CanvasRenderingContext2D, seg: PathSegment, lineWidth: number, ppm: number, canvasH: number
): void {
  const pts: Point3D[] = (seg.arcPoints && seg.arcPoints.length > 1)
    ? seg.arcPoints : [seg.start, seg.end];
  if (pts.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(pts[0].x * ppm, canvasH - pts[0].y * ppm);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x * ppm, canvasH - pts[i].y * ppm);
  }
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Draw through-cut thick stroke (only sub-paths where Z < -thickness) */
function strokeThroughOnCanvas(
  ctx: CanvasRenderingContext2D, seg: PathSegment, lineWidth: number, ppm: number, canvasH: number, thickness: number
): void {
  const pts: Point3D[] = (seg.arcPoints && seg.arcPoints.length > 1)
    ? seg.arcPoints : [seg.start, seg.end];
  if (pts.length < 2) return;

  // Walk points; start/end sub-strokes where Z crosses -thickness boundary
  let inThrough = false;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const z = p.z;
    const px = p.x * ppm;
    const py = canvasH - p.y * ppm;

    if (z < -thickness) {
      if (!inThrough) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        inThrough = true;
      } else {
        ctx.lineTo(px, py);
      }
    } else {
      if (inThrough) {
        // Close the current through sub-path
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        inThrough = false;
      }
    }
  }
  // Flush remaining sub-path
  if (inThrough) {
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Helper: create a native THREE.BufferGeometry line from two points */
function makeLineGeom(a: [number,number,number], b: [number,number,number]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b], 3));
  return g;
}

function CNCAxes({ size, xyPlaneView = false }: { size: number; xyPlaneView?: boolean }): JSX.Element {
  // CNC axes mapped to Three.js: X→X(red), Y→-Z(green), Z→Y(blue)
  const labelSize = size * 0.12;
  const xGeom = useMemo(() => makeLineGeom([0,0,0],[size,0,0]), [size]);
  const yGeom = useMemo(() => makeLineGeom([0,0,0],[0,0,-size]), [size]);
  const zGeom = useMemo(() => makeLineGeom([0,0,0],[0,size,0]), [size]);

  return (
    <group>
      {/* CNC X axis = Three.js X+ (red) */}
      <lineSegments geometry={xGeom}><lineBasicMaterial color="#ff0000" /></lineSegments>
      <Text position={[size * 1.08, 0, 0]} fontSize={labelSize} color="#ff0000" anchorX="center" anchorY="middle">X</Text>
      {/* CNC Y axis = Three.js -Z (green) */}
      <lineSegments geometry={yGeom}><lineBasicMaterial color="#00cc00" /></lineSegments>
      <Text position={[0, 0, -size * 1.08]} fontSize={labelSize} color="#00cc00" anchorX="center" anchorY="middle">Y</Text>
      {/* CNC Z axis = Three.js Y+ (blue) — hidden in XY plane view (points at camera) */}
      {!xyPlaneView && (
        <>
          <lineSegments geometry={zGeom}><lineBasicMaterial color="#0066ff" /></lineSegments>
          <Text position={[0, size * 1.08, 0]} fontSize={labelSize} color="#0066ff" anchorX="center" anchorY="middle">Z</Text>
        </>
      )}
    </group>
  );
}

interface CameraControllerProps {
  xyPlaneView: boolean;
  cameraTarget: [number, number, number];
  cameraDistance: number;
  controlsRef: React.MutableRefObject<any>;
  resetViewKey: number;
  boundingBox: BoundingBox | null;
}

function CameraController({ xyPlaneView, cameraTarget, cameraDistance, controlsRef, resetViewKey, boundingBox }: CameraControllerProps): null {
  const { camera, gl, size } = useThree();
  const xyViewActive = useRef(false);
  // Manual pan/zoom state for XY mode
  const xyState = useRef({ cx: 0, cz: 0, height: 100, dragging: false, lastX: 0, lastY: 0 });

  // Setup effect: runs when view mode changes
  useEffect(() => {
    if (xyPlaneView) {
      xyViewActive.current = true;
      xyState.current.cx = cameraTarget[0];
      xyState.current.cz = cameraTarget[2];
      // Calculate camera height to fit bounding box in viewport
      const aspect = size.width / size.height;
      const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
      const bboxW = boundingBox ? (boundingBox.max.x - boundingBox.min.x) : 100;
      const bboxH = boundingBox ? (boundingBox.max.y - boundingBox.min.y) : 100;
      // Height needed to fit width: w/2 = h * tan(fov/2) * aspect → h = w / (2*tan(fov/2)*aspect)
      const hForWidth = (bboxW * 1.2) / (2 * Math.tan(fovRad / 2) * aspect);
      // Height needed to fit height: h_bbox/2 = h * tan(fov/2) → h = h_bbox / (2*tan(fov/2))
      const hForHeight = (bboxH * 1.2) / (2 * Math.tan(fovRad / 2));
      xyState.current.height = Math.max(hForWidth, hForHeight, 20);
    } else {
      xyViewActive.current = false;
      const controls = controlsRef.current;
      if (controls) {
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        camera.up.set(0, 1, 0);
        camera.position.set(
          cameraTarget[0] + cameraDistance * 0.7,
          cameraTarget[1] + cameraDistance * 0.5,
          cameraTarget[2] + cameraDistance * 0.7,
        );
        controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
        controls.update();
      }
    }
  }, [xyPlaneView, cameraTarget, cameraDistance, camera, controlsRef, resetViewKey, size, boundingBox]);

  // Pointer events for manual pan/zoom in XY mode
  useEffect(() => {
    if (!xyPlaneView) return;
    const canvas = gl.domElement;
    const st = xyState.current;
    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const tanHalf = Math.tan(fovRad / 2);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      // Mouse position as ratio (0-1) relative to canvas
      const ratioX = (e.clientX - rect.left) / rect.width;
      const ratioY = (e.clientY - rect.top) / rect.height;
      const aspect = rect.width / rect.height;

      const hOld = st.height;
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      const hNew = Math.max(5, Math.min(100000, hOld * factor));

      // Shift center so world point under mouse stays fixed on screen
      const dh = hOld - hNew;
      st.cx += (ratioX - 0.5) * 2 * tanHalf * aspect * dh;
      st.cz += (ratioY - 0.5) * 2 * tanHalf * dh;
      st.height = hNew;
    };
    const onPointerDown = (e: PointerEvent) => {
      st.dragging = true; st.lastX = e.clientX; st.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!st.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      // Pan: convert pixel delta to world units
      const worldPerPixelX = (2 * st.height * tanHalf * aspect) / rect.width;
      const worldPerPixelY = (2 * st.height * tanHalf) / rect.height;
      st.cx -= (e.clientX - st.lastX) * worldPerPixelX;
      st.cz += (e.clientY - st.lastY) * worldPerPixelY;
      st.lastX = e.clientX; st.lastY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      st.dragging = false; canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [xyPlaneView, gl, camera]);

  // Mouse-centered zoom for 3D orbit mode
  useEffect(() => {
    if (xyPlaneView) return;
    const canvas = gl.domElement;
    const controls = controlsRef.current;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!controls) return;

      const rect = canvas.getBoundingClientRect();
      // Mouse position in NDC (-1 to 1)
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast from mouse position to find world point under cursor
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

      // Intersect with horizontal plane through current target
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -controls.target.y);
      const mouseWorld = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(plane, mouseWorld);

      // Zoom factor: > 1 = zoom out, < 1 = zoom in
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

      if (hit) {
        // Scale camera and target positions relative to the mouse world point
        // This keeps the world point under the cursor fixed on screen
        const camOffset = new THREE.Vector3().subVectors(camera.position, mouseWorld).multiplyScalar(factor);
        const tgtOffset = new THREE.Vector3().subVectors(controls.target, mouseWorld).multiplyScalar(factor);
        camera.position.copy(mouseWorld).add(camOffset);
        controls.target.copy(mouseWorld).add(tgtOffset);
      } else {
        // Fallback: dolly along camera-to-target direction
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        offset.multiplyScalar(factor);
        camera.position.copy(controls.target).add(offset);
      }

      controls.update();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [xyPlaneView, gl, camera, controlsRef]);

  // Every frame: in XY mode, directly set camera (runs AFTER OrbitControls)
  useFrame(() => {
    if (!xyViewActive.current) return;
    const st = xyState.current;
    camera.up.set(0, 0, -1);
    camera.position.set(st.cx, st.height, st.cz);
    camera.lookAt(st.cx, 0, st.cz);
  });

  return null;
}

export default function Viewer3D({
  segments = [],
  currentSegmentIndex = 0,
  currentProgress = 0,
  showRapids = true,
  showGrid = true,
  showAxes = true,
  boundingBox = null,
  xyPlaneView = false,
  resetViewKey = 0,
  showTool = false,
  toolDiameter = 0,
  materialSize = null,
}: Props & { xyPlaneView?: boolean; resetViewKey?: number; showTool?: boolean; toolDiameter?: number; materialSize?: { x: number; y: number; z: number } | null }): JSX.Element {
  const controlsRef = useRef<any>(null);
  const cameraTarget = useMemo(() => {
    if (!boundingBox) return [0, 0, 0] as [number, number, number];
    const cx = (boundingBox.min.x + boundingBox.max.x) / 2;
    const cy = (boundingBox.min.y + boundingBox.max.y) / 2;
    const cz = (boundingBox.min.z + boundingBox.max.z) / 2;
    return toVec3({ x: cx, y: cy, z: cz });
  }, [boundingBox]);

  const cameraDistance = useMemo(() => {
    if (!boundingBox) return 100;
    const dx = boundingBox.max.x - boundingBox.min.x;
    const dy = boundingBox.max.y - boundingBox.min.y;
    const dz = boundingBox.max.z - boundingBox.min.z;
    return Math.max(dx, dy, dz, 50) * 1.5;
  }, [boundingBox]);

  const [webglOk] = useState(() => supportsWebGL());
  if (!webglOk) return <WebGLUnsupported />;

  return (
    <div
      data-testid="viewer3-d"
      className="relative w-full h-full bg-background"
      aria-label="3Dビューア"
    >
      <WebGLErrorBoundary>
      <Canvas
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          // Force WebGL1 compatibility for older GPUs
          if (!gl.capabilities.isWebGL2) {
            console.warn('WebGL2 not available, using WebGL1 fallback');
          }
        }}
        camera={{
          position: [cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7],
          fov: 50,
          near: 0.01,
          far: 100000,
        }}
        style={{ width: '100%', height: '100%' }}
        fallback={<div className="flex items-center justify-center w-full h-full text-white bg-zinc-900"><p className="text-center px-8">WebGLに対応していないブラウザです。<br/>Chrome/Edge/Firefoxの最新版をお試しください。</p></div>}
      >
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={0.8} />

        <OrbitControls ref={controlsRef} enabled={!xyPlaneView} enableZoom={false} panSpeed={1.5} />
        <CameraController
          xyPlaneView={xyPlaneView}
          cameraTarget={cameraTarget}
          cameraDistance={cameraDistance}
          controlsRef={controlsRef}
          resetViewKey={resetViewKey}
          boundingBox={boundingBox}
        />

        {showGrid && (
          <Grid
            args={[500, 500]}
            cellSize={10}
            cellThickness={0.5}
            cellColor="#888888"
            sectionSize={50}
            sectionThickness={1}
            sectionColor="#444444"
            fadeDistance={500}
            infiniteGrid={false}
          />
        )}

        {showAxes && <CNCAxes size={Math.max(cameraDistance * 0.3, 30)} xyPlaneView={xyPlaneView} />}

        <PathLines
          segments={segments}
          currentSegmentIndex={currentSegmentIndex}
          currentProgress={currentProgress}
          showRapids={showRapids}
          boundingBox={boundingBox}
          xyPlaneView={xyPlaneView}
        />

        <MaterialSheet
          materialSize={materialSize}
          segments={segments}
          currentSegmentIndex={currentSegmentIndex}
          toolDiameter={toolDiameter ?? 0}
        />

        {/* ToolSweptPath removed — orange swept path now drawn on MaterialSheet canvas */}

        <ToolHead
          segments={segments}
          currentSegmentIndex={currentSegmentIndex}
          currentProgress={currentProgress}
          showTool={showTool ?? false}
          toolDiameter={toolDiameter ?? 0}
        />
      </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
