import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Mic,
  MessageSquareText,
  Newspaper,
  RefreshCw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

const INITIAL_CAMERA = { yaw: -0.38, pitch: 0.58, distance: 120, targetX: 0, targetZ: 0 };
const MIN_DISTANCE = 72;
const MAX_DISTANCE = 178;
const PAN_LIMIT = 92;
const ROOM_SPACE_SCALE = 8.5;
const MAX_ROOM_BATCH_SIZE = 5;

const getRoomPosition = (room) => ({
  mapX: room.mapX ?? (room.x - 50) * 12,
  mapY: room.mapY ?? (room.y - 50) * 9,
});

const getStaticSimilarity = (room) => {
  if (room.similarity) return room.similarity;
  const { mapX, mapY } = getRoomPosition(room);
  const distance = Math.hypot(mapX, mapY);
  return Math.max(32, Math.min(98, Math.round(100 - distance / 8)));
};

const getMatchTone = (similarity) => {
  if (similarity >= 76) return "同频很近";
  if (similarity >= 64) return "高匹配";
  if (similarity >= 52) return "可探索";
  return "遥远星系";
};

const getRoomTypeStyle = (type) => {
  if (type === "打字房") {
    return {
      Icon: MessageSquareText,
      badgeClass: "border-[#a8dfd1]/70 bg-[#e6f7f2] text-[#2d8c77]",
      dotColor: "#50bfa5",
    };
  }

  return {
    Icon: Mic,
    badgeClass: "border-[#bdb8ff]/70 bg-[#eeeaff] text-[#6b5ee7]",
    dotColor: "#8b82e8",
  };
};

const formatElapsed = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes <= 0) return `${restSeconds} 秒`;
  return `${minutes} 分 ${String(restSeconds).padStart(2, "0")} 秒`;
};

const hashString = (value) =>
  [...String(value)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973, 17);

const getRoomVector = (room) => {
  const seed = hashString(room.id);
  return new THREE.Vector3(
    room.mapX / ROOM_SPACE_SCALE,
    ((seed % 15) - 7) * 0.88,
    room.mapY / ROOM_SPACE_SCALE,
  );
};

const updateCamera = (camera, cameraState) => {
  const { yaw, pitch, distance, targetX, targetZ } = cameraState.current;
  const target = new THREE.Vector3(targetX, 0, targetZ);
  const y = Math.sin(pitch) * distance;
  const radius = Math.cos(pitch) * distance;
  camera.position.set(target.x + Math.sin(yaw) * radius, y, target.z + Math.cos(yaw) * radius);
  camera.lookAt(target);
};

const createRingPoints = (radius, y = 0, segments = 160) => {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }
  return points;
};

const buildStarField = (count, radius, palette, spiral = false) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const branch = index % 5;
    const spin = index * 0.043 + branch * ((Math.PI * 2) / 5);
    const distance = spiral
      ? Math.pow((index % 233) / 233, 0.62) * radius
      : Math.pow(((index * 37) % count) / count, 0.34) * radius;
    const jitter = spiral ? 7.5 : 42;
    const x = Math.cos(spin + distance * 0.034) * distance + Math.sin(index * 12.989) * jitter;
    const y = spiral ? Math.sin(index * 5.318) * 4.8 : (Math.sin(index * 2.37) + Math.cos(index * 0.91)) * 22;
    const z = Math.sin(spin + distance * 0.034) * distance + Math.cos(index * 78.233) * jitter;
    const color = new THREE.Color(palette[index % palette.length]);

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
};

const normalizeHexColor = (value) => {
  if (!value?.startsWith("#")) return null;
  const hex = value.slice(1);
  if (hex.length === 3) {
    return `#${hex.split("").map((char) => `${char}${char}`).join("")}`.toLowerCase();
  }
  if (hex.length === 6 || hex.length === 8) {
    return `#${hex.slice(0, 6)}`.toLowerCase();
  }
  return null;
};

const getRgbFromHex = (hex) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const getColorSignal = (hex) => {
  const rgb = getRgbFromHex(hex);
  if (!rgb) return null;
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  return { lightness, saturation };
};

const extractDominantAvatarColor = (svgText) => {
  const colorCounts = new Map();
  const attributePattern = /(?:fill|stroke|stop-color)=["'](#[0-9a-fA-F]{3,8})["']/g;
  const stylePattern = /(?:fill|stroke|stop-color):\s*(#[0-9a-fA-F]{3,8})/g;

  [attributePattern, stylePattern].forEach((pattern) => {
    for (const match of svgText.matchAll(pattern)) {
      const color = normalizeHexColor(match[1]);
      if (!color) continue;
      const signal = getColorSignal(color);
      if (!signal || signal.saturation < 0.22 || signal.lightness < 0.18 || signal.lightness > 0.9) continue;
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  });

  let bestColor = null;
  let bestScore = 0;
  colorCounts.forEach((count, color) => {
    const signal = getColorSignal(color);
    const lightnessBias = 1 - Math.abs(signal.lightness - 0.56);
    const score = count * (0.6 + signal.saturation) * lightnessBias;
    if (score > bestScore) {
      bestScore = score;
      bestColor = color;
    }
  });

  return bestColor;
};

export default function RoomDiscovery({
  rooms,
  waitingRoom,
  onBack,
  onDismissWaiting,
  onEnterVoice,
  onEnterText,
  onToast,
}) {
  const spaceRef = useRef(null);
  const sceneCanvasRef = useRef(null);
  const dragRef = useRef(null);
  const suppressNextSpaceClickRef = useRef(false);
  const listRefs = useRef({});
  const cameraStateRef = useRef({ ...INITIAL_CAMERA });
  const sceneStateRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [cameraDistance, setCameraDistance] = useState(INITIAL_CAMERA.distance);
  const [isExploring, setIsExploring] = useState(false);
  const [labelPositions, setLabelPositions] = useState({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [waitingCollapsed, setWaitingCollapsed] = useState(false);
  const [closeWaitingConfirmOpen, setCloseWaitingConfirmOpen] = useState(false);
  const [avatarColors, setAvatarColors] = useState({});
  const [roomBatchIndex, setRoomBatchIndex] = useState(0);
  const batchSize = Math.min(MAX_ROOM_BATCH_SIZE, Math.max(1, Math.floor(rooms.length / 2) || rooms.length));
  const allRoomsWithSignal = useMemo(
    () =>
      rooms.map((room) => {
        const similarity = getStaticSimilarity(room);
        return {
          ...room,
          ...getRoomPosition(room),
          color: avatarColors[room.id] || room.color,
          matchLabel: getMatchTone(similarity),
          similarity,
        };
      }),
    [avatarColors, rooms],
  );
  const roomsWithSignal = useMemo(() => {
    if (allRoomsWithSignal.length <= batchSize) return allRoomsWithSignal;

    const startIndex = (roomBatchIndex * batchSize) % allRoomsWithSignal.length;
    return Array.from(
      { length: batchSize },
      (_, index) => allRoomsWithSignal[(startIndex + index) % allRoomsWithSignal.length],
    );
  }, [allRoomsWithSignal, batchSize, roomBatchIndex]);
  const selectedRoom = roomsWithSignal.find((room) => room.id === selectedId);
  const selectedSignal = roomsWithSignal.find((room) => room.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    if (!roomsWithSignal.some((room) => room.id === selectedId)) {
      setSelectedId(null);
    }
  }, [roomsWithSignal, selectedId]);

  useEffect(() => {
    let cancelled = false;

    const loadAvatarColors = async () => {
      const entries = await Promise.all(
        rooms.map(async (room) => {
          try {
            const response = await fetch(room.hostAvatar);
            if (!response.ok) return null;
            const svgText = await response.text();
            const color = extractDominantAvatarColor(svgText);
            return color ? [room.id, color] : null;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;
      const nextColors = Object.fromEntries(entries.filter(Boolean));
      setAvatarColors((current) => ({ ...current, ...nextColors }));
    };

    loadAvatarColors();

    return () => {
      cancelled = true;
    };
  }, [rooms]);

  useEffect(() => {
    if (!selectedId) return;
    listRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  useEffect(() => {
    const container = spaceRef.current;
    const canvas = sceneCanvasRef.current;
    if (!container || !canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf4f6ff, 0.0038);

    const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 600);
    updateCamera(camera, cameraStateRef);

    const galaxyGroup = new THREE.Group();
    galaxyGroup.rotation.y = -0.26;
    scene.add(galaxyGroup);

    scene.add(new THREE.AmbientLight(0xf6f8ff, 1.6));
    const keyLight = new THREE.PointLight(0xc8d2ff, 9, 280);
    keyLight.position.set(-34, 44, 58);
    scene.add(keyLight);
    const mintLight = new THREE.PointLight(0xbdeee8, 7, 240);
    mintLight.position.set(42, 28, -44);
    scene.add(mintLight);
    const violetLight = new THREE.PointLight(0xd8c7ff, 8, 260);
    violetLight.position.set(-64, 18, -38);
    scene.add(violetLight);

    const farStars = new THREE.Points(
      buildStarField(420, 176, ["#ffffff", "#d8e2ff", "#c8fff5", "#eadcff", "#c4b5fd"]),
      new THREE.PointsMaterial({
        size: 0.72,
        transparent: true,
        opacity: 0.42,
        vertexColors: true,
        depthWrite: false,
      }),
    );
    scene.add(farStars);

    const spiral = new THREE.Points(
      buildStarField(560, 86, ["#ffffff", "#bdeee8", "#d8e2ff", "#eadcff", "#a5b4fc"], true),
      new THREE.PointsMaterial({
        size: 0.94,
        transparent: true,
        opacity: 0.58,
        vertexColors: true,
        depthWrite: false,
      }),
    );
    galaxyGroup.add(spiral);

    [18, 30, 42, 56, 72, 88].forEach((radius, index) => {
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(createRingPoints(radius, -1.2 + index * 0.28)),
        new THREE.LineBasicMaterial({
          color: index % 2 ? 0x8dd8c8 : 0x9ca3ff,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
          transparent: true,
          opacity: index % 2 ? 0.34 : 0.28,
        }),
      );
      ring.rotation.x = Math.PI / 2 + index * 0.015;
      galaxyGroup.add(ring);
    });

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.7, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x9ca3ff,
        emissive: 0xc7d2fe,
        emissiveIntensity: 1.4,
        roughness: 0.38,
        metalness: 0.08,
      }),
    );
    galaxyGroup.add(core);

    const coreHalo = new THREE.Mesh(
      new THREE.SphereGeometry(7.8, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xc7d2fe,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    );
    galaxyGroup.add(coreHalo);

    const roomObjects = new Map();
    roomsWithSignal.forEach((room) => {
      const position = getRoomVector(room);
      const color = new THREE.Color(room.color);
      const roomGroup = new THREE.Group();
      roomGroup.position.copy(position);

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), position.clone()]),
        new THREE.LineBasicMaterial({
          color,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
          linewidth: 2,
          transparent: true,
          opacity: 0.54,
        }),
      );
      galaxyGroup.add(line);

      const star = new THREE.Mesh(
        new THREE.SphereGeometry(1.95 + room.similarity / 80, 32, 32),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.8,
          roughness: 0.44,
          metalness: 0.04,
        }),
      );
      roomGroup.add(star);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(5.8 + room.similarity / 22, 32, 32),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        }),
      );
      roomGroup.add(halo);

      const orbit = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(createRingPoints(5.2 + room.similarity / 24, 0, 96)),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.46,
        }),
      );
      orbit.rotation.x = Math.PI / 2.5;
      orbit.rotation.z = hashString(room.id) * 0.01;
      roomGroup.add(orbit);

      galaxyGroup.add(roomGroup);
      roomObjects.set(room.id, { group: roomGroup, star, halo, orbit, line, position });
    });

    sceneStateRef.current = { camera, core, coreHalo, farStars, galaxyGroup, renderer, roomObjects, spiral };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frameId = 0;
    let lastLabels = "";
    const projected = new THREE.Vector3();

    const render = () => {
      frameId = window.requestAnimationFrame(render);
      const sceneState = sceneStateRef.current;
      if (!sceneState) return;

      sceneState.spiral.rotation.y += 0.0007;
      sceneState.farStars.rotation.y -= 0.00016;
      sceneState.core.rotation.y += 0.008;
      sceneState.coreHalo.scale.setScalar(1 + Math.sin(performance.now() * 0.0018) * 0.04);

      updateCamera(camera, cameraStateRef);
      const bounds = container.getBoundingClientRect();
      const minLabelY = bounds.width < 520 ? 190 : 168;
      const nextLabels = {};
      sceneState.roomObjects.forEach((object, id) => {
        projected.copy(object.position).applyMatrix4(sceneState.galaxyGroup.matrixWorld).project(camera);
        const x = ((projected.x + 1) / 2) * bounds.width;
        const y = ((-projected.y + 1) / 2) * bounds.height;
        const visible =
          projected.z > -1 &&
          projected.z < 1 &&
          x > 58 &&
          x < bounds.width - 58 &&
          y > minLabelY &&
          y < bounds.height - 54;
        nextLabels[id] = {
          x,
          y,
          visible,
          scale: THREE.MathUtils.clamp(1.08 - projected.z * 0.18, 0.74, 1.12),
          z: projected.z,
        };
      });
      const signature = JSON.stringify(nextLabels);
      if (signature !== lastLabels) {
        lastLabels = signature;
        setLabelPositions(nextLabels);
      }

      renderer.render(scene, camera);
    };

    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      sceneStateRef.current = null;
      renderer.dispose();
      farStars.geometry.dispose();
      farStars.material.dispose();
      spiral.geometry.dispose();
      spiral.material.dispose();
      core.geometry.dispose();
      core.material.dispose();
      coreHalo.geometry.dispose();
      coreHalo.material.dispose();
      roomObjects.forEach((object) => {
        object.star.geometry.dispose();
        object.star.material.dispose();
        object.halo.geometry.dispose();
        object.halo.material.dispose();
        object.orbit.geometry.dispose();
        object.orbit.material.dispose();
        object.line.geometry.dispose();
        object.line.material.dispose();
      });
    };
  }, [roomsWithSignal]);

  useEffect(() => {
    const sceneState = sceneStateRef.current;
    if (!sceneState) return;

    sceneState.roomObjects.forEach((object, id) => {
      const active = id === selectedId;
      const hovered = id === hoveredId;
      object.group.scale.setScalar(active ? 1.55 : hovered ? 1.34 : 1);
      object.halo.material.opacity = active ? 0.32 : hovered ? 0.22 : 0.12;
      object.orbit.material.opacity = active ? 0.7 : hovered ? 0.5 : 0.26;
      object.line.material.opacity = active ? 0.88 : hovered ? 0.68 : 0.38;
    });
  }, [hoveredId, selectedId]);

  useEffect(() => {
    if (!waitingRoom?.startedAt) {
      setElapsedSeconds(0);
      return undefined;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - waitingRoom.startedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [waitingRoom?.startedAt]);

  const startExploring = (event) => {
    if (event.target.closest("[data-stop-pan]")) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originTargetX: cameraStateRef.current.targetX,
      originTargetZ: cameraStateRef.current.targetZ,
      moved: false,
    };
    setIsExploring(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const exploreGalaxy = (event) => {
    if (!dragRef.current) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.hypot(deltaX, deltaY) > 6) {
      dragRef.current.moved = true;
    }
    const panSpeed = cameraStateRef.current.distance / 520;
    const right = new THREE.Vector3(Math.cos(INITIAL_CAMERA.yaw), 0, -Math.sin(INITIAL_CAMERA.yaw));
    const forward = new THREE.Vector3(-Math.sin(INITIAL_CAMERA.yaw), 0, -Math.cos(INITIAL_CAMERA.yaw));
    const nextTargetX =
      dragRef.current.originTargetX - right.x * deltaX * panSpeed + forward.x * deltaY * panSpeed;
    const nextTargetZ =
      dragRef.current.originTargetZ - right.z * deltaX * panSpeed + forward.z * deltaY * panSpeed;
    cameraStateRef.current.targetX = THREE.MathUtils.clamp(nextTargetX, -PAN_LIMIT, PAN_LIMIT);
    cameraStateRef.current.targetZ = THREE.MathUtils.clamp(nextTargetZ, -PAN_LIMIT, PAN_LIMIT);
  };

  const stopExploring = () => {
    if (dragRef.current?.moved) {
      suppressNextSpaceClickRef.current = true;
    }
    dragRef.current = null;
    setIsExploring(false);
  };

  const closeSelectedFromSpace = (event) => {
    if (event.target.closest("[data-stop-pan]")) return;
    if (suppressNextSpaceClickRef.current) {
      suppressNextSpaceClickRef.current = false;
      return;
    }
    setSelectedId(null);
  };

  const changeZoom = (delta) => {
    setCameraDistance((current) => {
      const nextDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, current + delta));
      cameraStateRef.current.distance = nextDistance;
      return nextDistance;
    });
  };

  const focusRoomInGalaxy = (room) => {
    const position = getRoomVector(room);
    cameraStateRef.current.targetX = THREE.MathUtils.clamp(position.x, -PAN_LIMIT, PAN_LIMIT);
    cameraStateRef.current.targetZ = THREE.MathUtils.clamp(position.z, -PAN_LIMIT, PAN_LIMIT);
  };

  const refreshRoomBatch = () => {
    setSelectedId(null);
    setHoveredId(null);
    setRoomBatchIndex((current) => current + 1);
  };

  const viewProfileFeed = (room) => {
    onToast(`${room.hostName} 的动态页稍后开放，先从这张星系卡片认识 TA。`);
  };

  const meetRoom = () => {
    if (!selectedRoom) return;
    if (selectedRoom.type === "语音房") {
      onEnterVoice(selectedRoom);
      return;
    }
    onEnterText(selectedRoom);
  };

  return (
    <main className="main-wash relative min-h-screen overflow-hidden px-6 py-8">
      <button
        onClick={onBack}
        className="fixed left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full bg-white/78 px-4 py-3 font-semibold text-stone-700 shadow-soft backdrop-blur-xl hover:bg-white"
      >
        <ChevronLeft size={18} />
        返回
      </button>

      {waitingRoom ? (
        waitingCollapsed ? (
          <button
            onClick={() => setWaitingCollapsed(false)}
            className="fixed left-1/2 top-6 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold text-stone-700 shadow-soft backdrop-blur-xl transition hover:bg-white/90"
            aria-label="展开等待提示"
          >
            <Clock size={16} className="text-[#6b5ee7]" />
            已等待 {formatElapsed(elapsedSeconds)}
            <ChevronDown size={16} className="text-stone-400" />
          </button>
        ) : (
          <div className="fixed left-1/2 top-6 z-30 w-[min(92vw,560px)] -translate-x-1/2 rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-soft backdrop-blur-xl">
            <div className="absolute right-3 top-3 flex items-center gap-1">
              <button
                onClick={() => setWaitingCollapsed(true)}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-[#eef2ff] hover:text-stone-700"
                aria-label="收起等待提示"
                title="收起等待提示"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => setCloseWaitingConfirmOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-[#eef2ff] hover:text-stone-700"
                aria-label="关闭等待提示"
                title="关闭等待提示"
              >
                <X size={16} />
              </button>
            </div>
            <div className="pr-20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eeeaff] px-3 py-1.5 text-sm font-semibold text-[#6b5ee7]">
                  <Clock size={15} />
                  正在等待玩家加入
                </span>
                <span className="rounded-full bg-[#f4f6ff] px-3 py-1.5 text-sm font-semibold text-stone-600">
                  已等待 {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-stone-800">{waitingRoom.name}</h2>
              <p className="mt-1 text-sm leading-6 text-stone-500">
                等待过程中你也可以继续浏览同频空间，选择下方已有房间直接加入。
              </p>
            </div>
          </div>
        )
      ) : null}

      {closeWaitingConfirmOpen ? (
        <Modal title="你确认关闭当前房间吗？" onClose={() => setCloseWaitingConfirmOpen(false)} width="max-w-sm">
          <p className="text-sm leading-6 text-stone-500">
            关闭后将停止当前房间的等待提示，你仍然可以继续浏览并加入已有房间。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setCloseWaitingConfirmOpen(false)}
              className="rounded-2xl bg-white/78 px-5 py-3 font-semibold text-stone-600 transition hover:bg-white"
            >
              取消
            </button>
            <button
              onClick={() => {
                setCloseWaitingConfirmOpen(false);
                onDismissWaiting();
              }}
              className="aurora-dark rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              确认
            </button>
          </div>
        </Modal>
      ) : null}

      <section className="mx-auto grid h-[calc(100vh-64px)] w-full min-w-0 max-w-7xl gap-5 pt-16 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div
          ref={spaceRef}
          onPointerDown={startExploring}
          onPointerMove={exploreGalaxy}
          onPointerUp={stopExploring}
          onPointerCancel={stopExploring}
          onClick={closeSelectedFromSpace}
          className={`semantic-space relative h-full min-h-[620px] min-w-0 overflow-hidden rounded-[36px] border border-white/80 shadow-soft ${
            isExploring ? "is-panning" : ""
          }`}
        >
          <canvas ref={sceneCanvasRef} className="cosmic-canvas absolute inset-0 z-[2] h-full w-full" />

          <div className="pointer-events-none absolute left-8 top-8 z-20 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/64 px-3 py-2 text-sm font-semibold text-[#6b5ee7] shadow-sm backdrop-blur-xl">
              <Sparkles size={15} />
              同频房间地图
            </p>
            <h1 className="mt-4 max-w-[calc(100vw-96px)] text-3xl font-semibold leading-tight text-stone-900 drop-shadow-[0_8px_26px_rgba(255,255,255,0.45)] sm:max-w-2xl sm:text-4xl">
              越靠近我的坐标，越可能同频相遇
            </h1>
          </div>

          <div
            data-stop-pan
            className="absolute bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-white/70 bg-white/64 p-2 shadow-soft backdrop-blur-xl sm:bottom-auto sm:top-6"
          >
            <button
              onClick={() => changeZoom(14)}
              className="grid h-10 w-10 place-items-center rounded-full text-stone-600 transition hover:bg-white/70"
              aria-label="缩小星图"
              title="缩小星图"
            >
              <ZoomOut size={18} />
            </button>
            <span className="min-w-12 text-center text-xs font-semibold text-[#6b5ee7]">
              {Math.round(((MAX_DISTANCE - cameraDistance) / (MAX_DISTANCE - MIN_DISTANCE)) * 100 + 58)}%
            </span>
            <button
              onClick={() => changeZoom(-14)}
              className="grid h-10 w-10 place-items-center rounded-full text-stone-600 transition hover:bg-white/70"
              aria-label="放大星图"
              title="放大星图"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="galaxy-map absolute inset-0 z-20">
            {roomsWithSignal.map((room, index) => {
              const roomTypeStyle = getRoomTypeStyle(room.type);
              const RoomTypeIcon = roomTypeStyle.Icon;
              const isExpanded = selectedId === room.id;
              const labelPosition = labelPositions[room.id];
              if (!labelPosition?.visible) return null;

              return (
                <div
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  data-stop-pan
                  data-selected={isExpanded ? "true" : undefined}
                  data-expanded={isExpanded ? "true" : undefined}
                  aria-label={`${room.hostName}，匹配度 ${room.similarity}%，点击查看详情`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId((currentId) => (currentId === room.id ? null : room.id));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setSelectedId((currentId) => (currentId === room.id ? null : room.id));
                  }}
                  onMouseEnter={() => setHoveredId(room.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    left: `${labelPosition.x}px`,
                    top: `${labelPosition.y}px`,
                    "--room-color": room.color,
                    "--halo-size": `${96 + room.similarity * 0.42}px`,
                    "--offset": `${(index % 2 === 0 ? -1 : 1) * 6}px`,
                    "--depth-scale": labelPosition.scale,
                    zIndex: Math.round((1 - labelPosition.z) * 100),
                  }}
                  className={`galaxy-room absolute z-10 -translate-x-1/2 -translate-y-1/2 text-left transition ${
                    isExpanded || hoveredId === room.id ? "is-active" : ""
                  }`}
                >
                  <span className="galaxy-room__halo" />
                  <span className="galaxy-room__dust galaxy-room__dust--one" />
                  <span className="galaxy-room__dust galaxy-room__dust--two" />
                  <span className="galaxy-room__card flex items-center gap-3">
                    <span className="galaxy-room__avatar-star">
                      <Avatar src={room.hostAvatar} name={room.hostName} />
                    </span>
                    {isExpanded ? (
                      <span className="galaxy-room__details min-w-0">
                        <span className="block truncate font-semibold text-stone-800">{room.hostName}</span>
                        <span className="block max-w-[150px] truncate text-xs text-stone-500">{room.name}</span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <span className="galaxy-room__type-badge inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold">
                            <RoomTypeIcon size={12} />
                            {room.type}
                          </span>
                          <span className="galaxy-room__match galaxy-room__match--inline inline-flex rounded-full px-2 py-1 text-[11px] font-semibold" style={{ color: room.color, backgroundColor: `${room.color}1c` }}>
                            {room.similarity}%
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="galaxy-room__match inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: room.color, backgroundColor: `${room.color}1c` }}>
                        {room.similarity}%
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="glass-panel cosmic-side-panel flex min-h-0 min-w-0 flex-col rounded-[36px] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#6b5ee7]">附近房间</p>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-white/62 px-3 py-1 text-xs font-semibold text-stone-500 sm:inline-flex">
                以我的坐标排序
              </span>
              <button
                onClick={refreshRoomBatch}
                disabled={allRoomsWithSignal.length <= batchSize}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/68 px-3 py-1 text-xs font-semibold text-[#6b5ee7] shadow-sm backdrop-blur-xl transition hover:bg-white disabled:pointer-events-none disabled:opacity-45"
                title="换一批房间"
              >
                <RefreshCw size={13} />
                换一批
              </button>
            </div>
          </div>
          <div className="card-scroll mb-5 flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {[...roomsWithSignal]
              .sort((a, b) => b.similarity - a.similarity)
              .map((room) => {
                const roomTypeStyle = getRoomTypeStyle(room.type);
                const RoomTypeIcon = roomTypeStyle.Icon;

                return (
                  <button
                    key={room.id}
                    data-selected={selectedId === room.id ? "true" : undefined}
                    ref={(node) => {
                      listRefs.current[room.id] = node;
                    }}
                    onClick={() => {
                      setSelectedId(room.id);
                      focusRoomInGalaxy(room);
                    }}
                    onMouseEnter={() => setHoveredId(room.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`cosmic-list-item flex min-w-[250px] items-center gap-3 rounded-3xl border p-3 text-left transition lg:min-w-0 ${
                      selectedId === room.id
                        ? "border-[#8b82e8]/45 bg-[#eeeaff]"
                        : "border-white/70 bg-white/62 hover:border-white hover:bg-white"
                    }`}
                  >
                    <Avatar src={room.hostAvatar} name={room.hostName} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate font-semibold text-stone-800">{room.hostName}</span>
                        <span className="shrink-0 text-xs font-semibold" style={{ color: room.color }}>
                          {room.similarity}%
                        </span>
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold ${roomTypeStyle.badgeClass}`}>
                          <RoomTypeIcon size={12} />
                          {room.type}
                        </span>
                        <span>{room.matchLabel}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>

          {selectedRoom && selectedSignal ? (
            <div
              className="selected-galaxy-card mt-auto rounded-[30px] border border-white/76 bg-white/76 p-5 shadow-sm"
              style={{ "--room-color": selectedSignal.color || "#8b82e8" }}
            >
              <button
                onClick={() => setSelectedId(null)}
                className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/74 text-stone-500 shadow-sm transition hover:bg-white hover:text-stone-800"
                aria-label="关闭房间详情"
                title="关闭房间详情"
              >
                <X size={17} />
              </button>

              <div className="mb-4 flex items-center gap-4 pr-9">
                <Avatar src={selectedRoom.hostAvatar} name={selectedRoom.hostName} size="lg" glow />
                <div className="min-w-0">
                  <p className="mb-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-[#6b5ee7]">
                    选中的房间 · {selectedSignal.matchLabel}
                  </p>
                  <h2 className="text-2xl font-semibold text-stone-800">{selectedRoom.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">房主 {selectedRoom.hostName}</p>
                </div>
              </div>
              <p className="mb-4 rounded-2xl bg-[#f4f6ff] px-4 py-3 text-sm leading-6 text-stone-600">
                {selectedRoom.vibe}
              </p>
              <div className="mb-4 rounded-[24px] bg-white/70 p-4">
                <p className="mb-3 text-xs font-semibold text-[#6b5ee7]">TA 的个人信息</p>
                <div className="grid grid-cols-2 gap-3 text-xs text-stone-500">
                  <span>
                    <strong className="block text-sm text-stone-800">{selectedRoom.nickname || selectedRoom.hostName}</strong>
                    昵称
                  </span>
                  <span>
                    <strong className="block text-sm text-stone-800">
                      {selectedRoom.age ? `${selectedRoom.age} 岁` : "选填"}
                    </strong>
                    年龄
                  </span>
                  <span>
                    <strong className="block text-sm text-stone-800">{selectedRoom.gender || "神秘"}</strong>
                    性别
                  </span>
                  <span>
                    <strong className="block text-sm text-stone-800">{selectedRoom.region || "未填写"}</strong>
                    地域
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedRoom.interests || []).map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-[#f4f6ff] px-3 py-1.5 text-xs font-semibold text-stone-600"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => viewProfileFeed(selectedRoom)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f4f6ff] px-4 py-3 text-sm font-semibold text-[#6b5ee7] transition hover:bg-white"
                >
                  <Newspaper size={16} />
                  查看TA的动态
                </button>
              </div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {(() => {
                  const roomTypeStyle = getRoomTypeStyle(selectedRoom.type);
                  const RoomTypeIcon = roomTypeStyle.Icon;

                  return (
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${roomTypeStyle.badgeClass}`}>
                      <RoomTypeIcon size={16} />
                      {selectedRoom.type}
                    </div>
                  );
                })()}
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-stone-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedSignal.color }} />
                  相似度 {selectedSignal.similarity}%
                </div>
              </div>
              <button
                onClick={meetRoom}
                className={`w-full rounded-2xl px-5 py-3 font-semibold text-white transition ${
                  selectedRoom.type === "打字房"
                    ? "bg-[#50bfa5] shadow-[0_18px_40px_rgba(80,191,165,0.26)] hover:bg-[#42aa92]"
                    : "aurora-dark shadow-glow hover:brightness-110"
                }`}
              >
                相遇
              </button>
            </div>
          ) : (
            <div className="selected-galaxy-card mt-auto rounded-[30px] border border-white/76 bg-white/66 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#6b5ee7]">未选中房间</p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                点击左侧房间卡片或附近房间列表，查看 TA 的资料与房间信息。
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
