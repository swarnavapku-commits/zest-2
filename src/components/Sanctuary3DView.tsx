import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { LevelInfo } from '../types/habit';
import {
  computeSanctuaryMetrics,
  groundHeightAt,
  SANCTUARY_CAMERA_PRESETS,
  SANCTUARY_MOODS,
  type SanctuaryCameraPresetId,
  type SanctuaryMood,
} from '../utils/sanctuary';

interface Sanctuary3DViewProps {
  levelInfo: LevelInfo;
  dailyPercentage: number;
  completedCount: number;
  totalCount: number;
  bestStreak: number;
}

function createProceduralBarkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#5c422c';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i += 1) {
      const x = (i * 17) % 256;
      ctx.fillStyle = i % 2 === 0 ? '#483321' : '#705239';
      ctx.fillRect(x, 0, 3 + (i % 4), 256);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createProceduralStoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c8cec1';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i += 1) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(90,104,84,0.18)' : 'rgba(255,255,255,0.22)';
      ctx.fillRect(x, y, 4, 4);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(22, 34, 14, 0.55)');
    grad.addColorStop(0.65, 'rgba(22, 34, 14, 0.18)');
    grad.addColorStop(1, 'rgba(22, 34, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Sanctuary3DView({
  levelInfo,
  dailyPercentage,
  completedCount,
  totalCount,
  bestStreak,
}: Sanctuary3DViewProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [mood, setMood] = useState<SanctuaryMood>('morning');
  const [cameraPreset, setCameraPreset] = useState<SanctuaryCameraPresetId>('overview');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<string>('Botanical Sanctuary');

  const metrics = useMemo(
    () =>
      computeSanctuaryMetrics({
        level: levelInfo.level,
        dailyPercentage,
        bestStreak,
      }),
    [levelInfo.level, dailyPercentage, bestStreak],
  );

  // Refs synced to WebGL loop without tearing down canvas
  const moodRef = useRef<SanctuaryMood>(mood);
  const metricsRef = useRef(metrics);
  const cameraTargetRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    lookAt: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...SANCTUARY_CAMERA_PRESETS.overview.position),
    lookAt: new THREE.Vector3(...SANCTUARY_CAMERA_PRESETS.overview.target),
  });
  const applyPresetFnRef = useRef<((id: SanctuaryCameraPresetId) => void) | null>(null);
  const applyMoodFnRef = useRef<((nextMood: SanctuaryMood) => void) | null>(null);
  const requestRenderFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    moodRef.current = mood;
    applyMoodFnRef.current?.(mood);
    requestRenderFnRef.current?.();
  }, [mood]);

  useEffect(() => {
    metricsRef.current = metrics;
    requestRenderFnRef.current?.();
  }, [metrics]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(320, mount.clientWidth);
    const height = Math.max(360, mount.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialMood = SANCTUARY_MOODS[moodRef.current];
    scene.background = new THREE.Color(initialMood.skyHex);
    scene.fog = new THREE.FogExp2(initialMood.fogHex, initialMood.fogDensity);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.42;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 140);
    camera.position.set(...SANCTUARY_CAMERA_PRESETS.overview.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...SANCTUARY_CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.5;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.25;
    controls.update();

    // Lighting rig (<= 3 shadow casters: 1 directional key + hemisphere + rim)
    const hemiLight = new THREE.HemisphereLight(
      initialMood.hemiSkyHex,
      initialMood.hemiGroundHex,
      initialMood.hemiIntensity,
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(
      initialMood.keyColorHex,
      initialMood.keyIntensity,
    );
    keyLight.position.set(10, 14, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -11;
    keyLight.shadow.camera.right = 11;
    keyLight.shadow.camera.top = 11;
    keyLight.shadow.camera.bottom = -11;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 36;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc9e8ff, 0.65);
    rimLight.position.set(-9, 7, -8);
    scene.add(rimLight);

    // Procedural Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const barkTex = createProceduralBarkTexture(maxAniso);
    const stoneTex = createProceduralStoneTexture(maxAniso);
    const shadowTex = createRadialContactShadowTexture();

    // Undulating Botanical Terrain
    const terrainGeo = new THREE.PlaneGeometry(76, 76, 48, 48);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i += 1) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, groundHeightAt(vx, vz));
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x6f9e42,
      roughness: 0.9,
      metalness: 0.0,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Plaza Terrace Disc (offset +0.025 on Y to prevent coplanar Z-fighting)
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0xc4bfa9,
      map: stoneTex,
      roughness: 0.88,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const plazaGeo = new THREE.CylinderGeometry(4.4, 4.7, 0.14, 40);
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.set(0, 0.04, 0);
    plazaMesh.receiveShadow = true;
    scene.add(plazaMesh);

    const contactMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    });

    // HERO 1: Composite 9-Part Botanical Sanctuary Tree Group
    const treeGroup = new THREE.Group();
    treeGroup.userData.landmark = 'Ritual Canopy Tree';
    treeGroup.userData.preset = 'tree' as SanctuaryCameraPresetId;

    const barkMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      color: 0x705136,
      roughness: 0.92,
      metalness: 0.0,
    });
    const leafMatPrimary = new THREE.MeshStandardMaterial({
      color: 0x4b7c00,
      roughness: 0.44,
      metalness: 0.04,
    });
    const leafMatBright = new THREE.MeshStandardMaterial({
      color: 0x69a412,
      roughness: 0.38,
      metalness: 0.05,
    });
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xcc8400,
      emissiveIntensity: 0.45,
      roughness: 0.28,
      metalness: 0.15,
    });

    // 1. Fluted LatheGeometry trunk (bottom-center pivot at y=0)
    const trunkProfile = [
      new THREE.Vector2(0.55, 0),
      new THREE.Vector2(0.42, 0.35),
      new THREE.Vector2(0.3, 1.15),
      new THREE.Vector2(0.24, 1.95),
      new THREE.Vector2(0.16, 2.55),
      new THREE.Vector2(0.02, 2.75),
    ];
    const trunkGeo = new THREE.LatheGeometry(trunkProfile, 16);
    const trunkMesh = new THREE.Mesh(trunkGeo, barkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    trunkMesh.layers.enable(1);
    treeGroup.add(trunkMesh);

    // 2-4. Three organic root flares / low boughs via TubeGeometry
    for (let r = 0; r < 3; r += 1) {
      const ang = (r * Math.PI * 2) / 3 + 0.3;
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * 0.2, 0.85, Math.sin(ang) * 0.2),
        new THREE.Vector3(Math.cos(ang) * 0.55, 0.32, Math.sin(ang) * 0.55),
        new THREE.Vector3(Math.cos(ang) * 0.95, 0.04, Math.sin(ang) * 0.95),
      ]);
      const rootMesh = new THREE.Mesh(
        new THREE.TubeGeometry(rootCurve, 10, 0.11, 8, false),
        barkMat,
      );
      rootMesh.castShadow = true;
      treeGroup.add(rootMesh);
    }

    // 5-8. Four sculpted canopy clusters
    const canopyPivot = new THREE.Group();
    canopyPivot.position.set(0, 2.55, 0);
    const crownSpecs = [
      { pos: [0, 0.72, 0], radius: 1.42, mat: leafMatPrimary },
      { pos: [-0.92, 0.18, 0.45], radius: 0.98, mat: leafMatBright },
      { pos: [0.95, 0.24, 0.25], radius: 1.02, mat: leafMatPrimary },
      { pos: [0.08, 0.16, -0.9], radius: 0.96, mat: leafMatBright },
    ];
    for (const spec of crownSpecs) {
      const crownGeo = new THREE.IcosahedronGeometry(spec.radius, 2);
      const crown = new THREE.Mesh(crownGeo, spec.mat);
      crown.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      crown.scale.set(1.1, 0.76, 1.08);
      crown.castShadow = true;
      crown.receiveShadow = true;
      crown.layers.enable(1);
      canopyPivot.add(crown);
    }

    // 9. Blossom / Golden Fruit Nodes around canopy
    const blossomGroup = new THREE.Group();
    const blossomGeo = new THREE.SphereGeometry(0.11, 12, 12);
    const blossomOffsets: [number, number, number][] = [
      [-1.15, 0.35, 0.82],
      [1.12, 0.42, 0.65],
      [0.15, 1.25, 0.95],
      [-0.58, 0.98, -0.78],
      [0.78, 0.82, -0.82],
      [0.0, 1.52, -0.15],
      [-1.35, -0.05, 0.18],
      [1.32, 0.02, -0.22],
    ];
    const blossomMeshes: THREE.Mesh[] = [];
    for (const [bx, by, bz] of blossomOffsets) {
      const bMesh = new THREE.Mesh(blossomGeo, blossomMat);
      bMesh.position.set(bx, by, bz);
      blossomGroup.add(bMesh);
      blossomMeshes.push(bMesh);
    }
    canopyPivot.add(blossomGroup);
    treeGroup.add(canopyPivot);

    const treeShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), contactMat);
    treeShadow.rotation.x = -Math.PI / 2;
    treeShadow.position.y = 0.03;
    treeGroup.add(treeShadow);

    treeGroup.position.set(0, 0.09, 0);
    scene.add(treeGroup);

    // HERO 2: Composite 6-Part Zen Water Fountain
    const fountainGroup = new THREE.Group();
    fountainGroup.userData.landmark = 'Zen Water Basin';
    fountainGroup.userData.preset = 'fountain' as SanctuaryCameraPresetId;

    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x9aa396,
      roughness: 0.84,
      metalness: 0.05,
    });
    const brassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd6a64f,
      metalness: 0.92,
      roughness: 0.18,
      anisotropy: 0.8,
      clearcoat: 0.4,
    });
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x76b8d8,
      roughness: 0.06,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transmission: isSoftwareGl ? 0 : 0.88,
      ior: 1.33,
      thickness: 0.6,
      transparent: true,
      opacity: isSoftwareGl ? 0.62 : 1,
    });

    const basinBase = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.75, 0),
          new THREE.Vector2(0.55, 0.25),
          new THREE.Vector2(0.95, 0.45),
          new THREE.Vector2(1.02, 0.68),
          new THREE.Vector2(0.86, 0.68),
          new THREE.Vector2(0.78, 0.36),
          new THREE.Vector2(0, 0.36),
        ],
        24,
      ),
      stoneMat,
    );
    basinBase.castShadow = true;
    basinBase.receiveShadow = true;
    basinBase.layers.enable(1);
    fountainGroup.add(basinBase);

    const basinRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.08, 12, 32),
      stoneMat,
    );
    basinRim.rotation.x = Math.PI / 2;
    basinRim.position.y = 0.68;
    fountainGroup.add(basinRim);

    const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(0.86, 28), waterMat);
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.58;
    fountainGroup.add(waterDisc);

    const spoutStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 0.65, 16),
      brassMat,
    );
    spoutStand.position.set(-0.55, 0.68, 0);
    fountainGroup.add(spoutStand);

    const spoutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, 0.96, 0),
      new THREE.Vector3(-0.32, 1.04, 0),
      new THREE.Vector3(-0.14, 0.88, 0),
    ]);
    const spoutArm = new THREE.Mesh(
      new THREE.TubeGeometry(spoutCurve, 12, 0.045, 10, false),
      brassMat,
    );
    fountainGroup.add(spoutArm);

    const rippleRingMat = new THREE.MeshBasicMaterial({
      color: 0xe6f7ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const rippleRing = new THREE.Mesh(
      new THREE.RingGeometry(0.14, 0.19, 24),
      rippleRingMat,
    );
    rippleRing.rotation.x = -Math.PI / 2;
    rippleRing.position.set(-0.1, 0.6, 0);
    fountainGroup.add(rippleRing);

    const fountainShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 2.5),
      contactMat,
    );
    fountainShadow.rotation.x = -Math.PI / 2;
    fountainShadow.position.y = 0.025;
    fountainGroup.add(fountainShadow);

    fountainGroup.position.set(2.8, 0.09, 0.9);
    scene.add(fountainGroup);

    // HERO 3: Composite 5-Part Stone Botanical Lantern Shrine
    const lanternGroup = new THREE.Group();
    lanternGroup.userData.landmark = 'Stone Lantern Shrine';
    lanternGroup.userData.preset = 'lantern' as SanctuaryCameraPresetId;

    const lanternPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 0.28, 6),
      stoneMat,
    );
    lanternPlinth.position.y = 0.14;
    lanternPlinth.castShadow = true;
    lanternGroup.add(lanternPlinth);

    const lanternPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.23, 0.88, 8),
      stoneMat,
    );
    lanternPillar.position.y = 0.72;
    lanternPillar.castShadow = true;
    lanternPillar.layers.enable(1);
    lanternGroup.add(lanternPillar);

    const lanternCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffe4a0,
      emissive: 0xffa826,
      emissiveIntensity: 1.1,
      roughness: 0.22,
      metalness: 0.0,
    });
    const lanternCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.38),
      lanternCoreMat,
    );
    lanternCore.position.y = 1.32;
    lanternCore.layers.enable(1);
    lanternGroup.add(lanternCore);

    const lanternRoof = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.56, 0),
          new THREE.Vector2(0.42, 0.14),
          new THREE.Vector2(0.18, 0.32),
          new THREE.Vector2(0, 0.38),
        ],
        6,
      ),
      stoneMat,
    );
    lanternRoof.position.y = 1.5;
    lanternRoof.castShadow = true;
    lanternGroup.add(lanternRoof);

    const lanternFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      brassMat,
    );
    lanternFinial.position.y = 1.94;
    lanternGroup.add(lanternFinial);

    const lanternPointLight = new THREE.PointLight(0xffb84d, 1.5, 6.5, 2);
    lanternPointLight.position.set(0, 1.32, 0);
    lanternGroup.add(lanternPointLight);

    const lanternShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.7),
      contactMat,
    );
    lanternShadow.rotation.x = -Math.PI / 2;
    lanternShadow.position.y = 0.025;
    lanternGroup.add(lanternShadow);

    lanternGroup.position.set(-2.6, 0.09, 1.4);
    scene.add(lanternGroup);

    // Instanced Foliage Tufts & Stepping Stones & Perimeter Grove
    const dummy = new THREE.Object3D();
    const tintColor = new THREE.Color();

    // 1. Stepping stones (InstancedMesh)
    const stoneCount = 16;
    const stepGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.07, 10);
    const stepInst = new THREE.InstancedMesh(stepGeo, stoneMat, stoneCount);
    stepInst.receiveShadow = true;
    for (let i = 0; i < stoneCount; i += 1) {
      const t = (i / (stoneCount - 1)) * Math.PI * 1.4 - 0.5;
      const radius = 1.85 + (i % 3) * 0.65;
      const sx = Math.cos(t) * radius;
      const sz = Math.sin(t) * radius;
      dummy.position.set(sx, 0.125, sz);
      dummy.rotation.set(0, t * 0.7, 0);
      const sc = 0.85 + ((i * 7) % 5) * 0.07;
      dummy.scale.set(sc, 1, sc * 0.88);
      dummy.updateMatrix();
      stepInst.setMatrixAt(i, dummy.matrix);
      tintColor.setHex(i % 2 === 0 ? 0xd9dfd2 : 0xc7cfc0);
      stepInst.setColorAt(i, tintColor);
    }
    stepInst.instanceMatrix.needsUpdate = true;
    if (stepInst.instanceColor) stepInst.instanceColor.needsUpdate = true;
    stepInst.computeBoundingSphere();
    scene.add(stepInst);

    // 2. Botanical Meadow Ferns & Shrub Clusters (InstancedMesh, 42 tufts)
    const fernCount = 42;
    const fernGeo = new THREE.DodecahedronGeometry(0.32, 1);
    fernGeo.scale(1.25, 0.72, 1.15);
    fernGeo.translate(0, 0.18, 0);
    const fernMat = new THREE.MeshStandardMaterial({
      color: 0x45781d,
      roughness: 0.78,
      metalness: 0.0,
    });
    const fernInst = new THREE.InstancedMesh(fernGeo, fernMat, fernCount);
    fernInst.castShadow = !isSoftwareGl;
    for (let i = 0; i < fernCount; i += 1) {
      const ang = (i / fernCount) * Math.PI * 2 + (i % 3) * 0.14;
      const dist = 5.1 + ((i * 19) % 10) * 0.95;
      const fx = Math.cos(ang) * dist;
      const fz = Math.sin(ang) * dist;
      const fy = groundHeightAt(fx, fz);
      dummy.position.set(fx, fy, fz);
      dummy.rotation.set(0, ang, 0);
      const scaleVar = 0.82 + ((i * 11) % 30) * 0.012;
      dummy.scale.set(scaleVar, scaleVar * 0.95, scaleVar);
      dummy.updateMatrix();
      fernInst.setMatrixAt(i, dummy.matrix);
      tintColor.setHSL(0.25 + ((i % 5) - 2) * 0.015, 0.42, 0.72 + (i % 4) * 0.06);
      fernInst.setColorAt(i, tintColor);
    }
    fernInst.instanceMatrix.needsUpdate = true;
    if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true;
    fernInst.computeBoundingSphere();
    scene.add(fernInst);

    // 3. Perimeter Tree Grove (InstancedMesh trunks + crowns = 22 trees)
    const groveCount = 22;
    const gTrunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.2, 8);
    gTrunkGeo.translate(0, 1.1, 0);
    const gCrownGeo = new THREE.IcosahedronGeometry(1.25, 1);
    gCrownGeo.translate(0, 2.65, 0);
    const gTrunkInst = new THREE.InstancedMesh(gTrunkGeo, barkMat, groveCount);
    const gCrownInst = new THREE.InstancedMesh(
      gCrownGeo,
      new THREE.MeshStandardMaterial({ color: 0x4b7c12, roughness: 0.72 }),
      groveCount,
    );
    for (let i = 0; i < groveCount; i += 1) {
      const ang = (i / groveCount) * Math.PI * 2;
      const dist = 12.5 + (i % 4) * 2.3;
      const tx = Math.cos(ang) * dist;
      const tz = Math.sin(ang) * dist;
      const ty = groundHeightAt(tx, tz);
      const sc = 0.85 + ((i * 13) % 30) * 0.01;
      dummy.position.set(tx, ty, tz);
      dummy.rotation.set(0, ang, 0);
      dummy.scale.set(sc, sc * (0.95 + (i % 3) * 0.12), sc);
      dummy.updateMatrix();
      gTrunkInst.setMatrixAt(i, dummy.matrix);
      gCrownInst.setMatrixAt(i, dummy.matrix);
      tintColor.setHSL(0.24 + ((i % 4) - 1.5) * 0.015, 0.36, 0.72 + (i % 3) * 0.08);
      gCrownInst.setColorAt(i, tintColor);
    }
    gTrunkInst.instanceMatrix.needsUpdate = true;
    gCrownInst.instanceMatrix.needsUpdate = true;
    if (gCrownInst.instanceColor) gCrownInst.instanceColor.needsUpdate = true;
    gTrunkInst.computeBoundingSphere();
    gCrownInst.computeBoundingSphere();
    scene.add(gTrunkInst);
    scene.add(gCrownInst);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on click to focus clicked landmark
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved =
        Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        [treeGroup, fountainGroup, lanternGroup],
        true,
      );
      if (hits.length > 0) {
        let cur: THREE.Object3D | null = hits[0].object;
        while (cur && !cur.userData.preset) {
          cur = cur.parent;
        }
        if (cur?.userData.preset) {
          const presetId = cur.userData.preset as SanctuaryCameraPresetId;
          setCameraPreset(presetId);
          setSelectedLandmark(String(cur.userData.landmark || 'Sanctuary'));
          applyPresetFnRef.current?.(presetId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Rendering / Pacing Loop
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastClock = performance.now();

    function applyMetricsAndAnimate(delta: number, elapsed: number) {
      const m = metricsRef.current;
      const currentMood = SANCTUARY_MOODS[moodRef.current];

      // Smoothly scale canopy & blossoms to Zest progress
      canopyPivot.scale.x = THREE.MathUtils.damp(
        canopyPivot.scale.x,
        m.canopyScale,
        6,
        delta,
      );
      canopyPivot.scale.y = THREE.MathUtils.damp(
        canopyPivot.scale.y,
        m.canopyScale,
        6,
        delta,
      );
      canopyPivot.scale.z = THREE.MathUtils.damp(
        canopyPivot.scale.z,
        m.canopyScale,
        6,
        delta,
      );

      blossomMeshes.forEach((bm, idx) => {
        const threshold = idx / blossomMeshes.length;
        const targetS = m.blossomRatio >= threshold ? 1.0 : 0.25;
        bm.scale.setScalar(THREE.MathUtils.damp(bm.scale.x, targetS, 6, delta));
      });

      lanternCoreMat.emissiveIntensity =
        m.lanternGlow * currentMood.lanternBoost;
      lanternPointLight.intensity =
        m.lanternGlow * currentMood.lanternBoost * 1.1;

      const ripplePhase = ((elapsed * 0.45 * m.fountainFlow) % 1);
      rippleRing.scale.setScalar(0.8 + ripplePhase * 3.1);
      rippleRingMat.opacity = (1 - ripplePhase) * 0.55;

      // Damped camera preset transition (cancels on arrival or OrbitControls start)
      if (cameraTargetRef.current.active) {
        const lambda = 7;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          cameraTargetRef.current.pos.x,
          lambda,
          delta,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          cameraTargetRef.current.pos.y,
          lambda,
          delta,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          cameraTargetRef.current.pos.z,
          lambda,
          delta,
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          cameraTargetRef.current.lookAt.x,
          lambda,
          delta,
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          cameraTargetRef.current.lookAt.y,
          lambda,
          delta,
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          cameraTargetRef.current.lookAt.z,
          lambda,
          delta,
        );

        const dist =
          camera.position.distanceTo(cameraTargetRef.current.pos) +
          controls.target.distanceTo(cameraTargetRef.current.lookAt);
        if (dist < 0.04) {
          camera.position.copy(cameraTargetRef.current.pos);
          controls.target.copy(cameraTargetRef.current.lookAt);
          cameraTargetRef.current.active = false;
        }
      }
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.1, (now - lastClock) / 1000);
        lastClock = now;

        applyMetricsAndAnimate(delta, now / 1000);
        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || cameraTargetRef.current.active)) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderFnRef.current = requestRender;

    applyPresetFnRef.current = (presetId: SanctuaryCameraPresetId) => {
      const p = SANCTUARY_CAMERA_PRESETS[presetId];
      cameraTargetRef.current.pos.set(...p.position);
      cameraTargetRef.current.lookAt.set(...p.target);
      cameraTargetRef.current.active = true;
      setSelectedLandmark(p.label);
      requestRender();
    };

    applyMoodFnRef.current = (nextMood: SanctuaryMood) => {
      const cfg = SANCTUARY_MOODS[nextMood];
      (scene.background as THREE.Color).setHex(cfg.skyHex);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(cfg.fogHex);
        scene.fog.density = cfg.fogDensity;
      }
      keyLight.color.setHex(cfg.keyColorHex);
      keyLight.intensity = cfg.keyIntensity;
      hemiLight.color.setHex(cfg.hemiSkyHex);
      hemiLight.groundColor.setHex(cfg.hemiGroundHex);
      hemiLight.intensity = cfg.hemiIntensity;
      requestRender();
    };

    controls.addEventListener('start', () => {
      cameraTargetRef.current.active = false;
    });
    controls.addEventListener('change', () => {
      requestRender();
    });

    const onResize = () => {
      if (!mount || disposed) return;
      const w = Math.max(320, mount.clientWidth);
      const h = Math.max(360, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    // Initial render
    requestRender();

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      controls.dispose();
      envTex.dispose();
      barkTex.dispose();
      stoneTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleSelectPreset = (id: SanctuaryCameraPresetId) => {
    setCameraPreset(id);
    applyPresetFnRef.current?.(id);
  };

  return (
    <section className="space-y-4">
      <div className="relative w-full h-[540px] sm:h-[620px] rounded-3xl overflow-hidden border-2 border-[#D8E0D1] bg-[#EAF4E2] shadow-[0px_8px_24px_rgba(26,38,14,0.08)]">
        {/* Isolated empty WebGL container */}
        <div
          ref={canvasMountRef}
          data-testid="sanctuary-canvas-container"
          className="w-full h-full"
        />

        {/* Minimal Top-Left Spec Badge (solid surface, no backdrop-filter over WebGL) */}
        <div className="absolute top-4 left-4 z-10 max-w-[290px] rounded-2xl bg-[#FDFFFB]/95 border border-[#D8E0D1] px-4 py-2.5 shadow-[0px_4px_12px_rgba(26,38,14,0.08)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B7C00]">
              Level {levelInfo.level} · {metrics.stageLabel}
            </span>
          </div>
          <h1 className="font-display font-bold text-lg text-[#1A260E] leading-tight mt-0.5">
            {selectedLandmark}
          </h1>
          <p className="text-xs font-medium text-[#586251] mt-0.5">
            {completedCount}/{totalCount} rituals blooming today · {bestStreak}d best streak
          </p>
        </div>

        {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion, no backdrop-filter) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(94%,840px)] flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            aria-expanded={!dockCollapsed}
            className="mb-1.5 px-3.5 py-1 rounded-full bg-[#FDFFFB] border border-[#D8E0D1] text-xs font-bold text-[#1A260E] inline-flex items-center gap-1 shadow-sm cursor-pointer hover:bg-[#E7F2DF]"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="w-full rounded-2xl bg-[#FDFFFB]/95 border border-[#D8E0D1] px-3 py-2.5 shadow-[0px_8px_20px_rgba(26,38,14,0.12)] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Camera focus presets">
                {(Object.keys(SANCTUARY_CAMERA_PRESETS) as SanctuaryCameraPresetId[]).map(
                  (id) => {
                    const preset = SANCTUARY_CAMERA_PRESETS[id];
                    const active = cameraPreset === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectPreset(id)}
                        className={`px-3 min-h-[36px] rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#4B7C00] text-white'
                            : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  },
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Sanctuary lighting mood">
                {(Object.keys(SANCTUARY_MOODS) as SanctuaryMood[]).map((mId) => {
                  const mCfg = SANCTUARY_MOODS[mId];
                  const active = mood === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => setMood(mId)}
                      className={`px-3 min-h-[36px] rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#1C3400] text-[#F9FFEA]'
                          : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                      }`}
                    >
                      {mCfg.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('overview')}
                  aria-label="Reset camera view"
                  className="px-2.5 min-h-[36px] rounded-xl bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2] inline-flex items-center justify-center cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
