import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Compass,
  Clock,
  Mic,
  MessageSquareText,
  Move,
  Newspaper,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

const INITIAL_PAN = { x: 0, y: 0 };
const PAN_LIMIT = { x: 520, y: 380 };
const INITIAL_ZOOM = 1;
const MIN_ZOOM = 0.72;
const MAX_ZOOM = 1.46;

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
    badgeClass: "border-[#f4b598]/70 bg-[#ffe0ce] text-[#bc5a42]",
    dotColor: "#f06f52",
  };
};

const clampPan = (pan, zoom = INITIAL_ZOOM) => ({
  x: Math.max(-PAN_LIMIT.x * zoom, Math.min(PAN_LIMIT.x * zoom, pan.x)),
  y: Math.max(-PAN_LIMIT.y * zoom, Math.min(PAN_LIMIT.y * zoom, pan.y)),
});

const formatElapsed = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes <= 0) return `${restSeconds} 秒`;
  return `${minutes} 分 ${String(restSeconds).padStart(2, "0")} 秒`;
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
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const listRefs = useRef({});
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState(
    [...rooms].sort((a, b) => getStaticSimilarity(b) - getStaticSimilarity(a))[0]?.id,
  );
  const [hoveredId, setHoveredId] = useState(null);
  const [pan, setPan] = useState(INITIAL_PAN);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [isPanning, setIsPanning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [waitingCollapsed, setWaitingCollapsed] = useState(false);
  const [closeWaitingConfirmOpen, setCloseWaitingConfirmOpen] = useState(false);
  const selectedRoom = rooms.find((room) => room.id === selectedId);
  const roomsWithSignal = useMemo(
    () =>
      rooms.map((room) => {
        const similarity = getStaticSimilarity(room);
        return {
          ...room,
          ...getRoomPosition(room),
          matchLabel: getMatchTone(similarity),
          similarity,
        };
      }),
    [rooms],
  );
  const selectedSignal = roomsWithSignal.find((room) => room.id === selectedId);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const syncCanvasSize = () => {
      const bounds = canvasRef.current.getBoundingClientRect();
      setCanvasSize({ width: bounds.width, height: bounds.height });
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    listRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

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

  const getLineEnd = (room) => ({
    x: canvasSize.width / 2 + pan.x + room.mapX * zoom,
    y: canvasSize.height / 2 + pan.y + room.mapY * zoom,
  });

  const startPanning = (event) => {
    if (event.target.closest("[data-stop-pan]")) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const panMap = (event) => {
    if (!dragRef.current) return;
    const nextPan = clampPan(
      {
        x: dragRef.current.originX + event.clientX - dragRef.current.startX,
        y: dragRef.current.originY + event.clientY - dragRef.current.startY,
      },
      zoom,
    );
    setPan(nextPan);
  };

  const stopPanning = () => {
    dragRef.current = null;
    setIsPanning(false);
  };

  const changeZoom = (delta) => {
    setZoom((current) => {
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((current + delta).toFixed(2))));
      setPan((currentPan) => clampPan(currentPan, nextZoom));
      return nextZoom;
    });
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
    <main className="relative min-h-screen overflow-hidden bg-[#fff8ee] px-6 py-8">
      <button
        onClick={onBack}
        className="fixed left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full bg-white/78 px-4 py-3 font-semibold text-stone-700 shadow-soft backdrop-blur-xl hover:bg-white"
      >
        <ChevronLeft size={18} />
        返回首页
      </button>

      {waitingRoom ? (
        waitingCollapsed ? (
          <button
            onClick={() => setWaitingCollapsed(false)}
            className="fixed left-1/2 top-6 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#f0c6a8]/80 bg-white/92 px-4 py-3 text-sm font-semibold text-stone-700 shadow-[0_18px_48px_rgba(92,55,32,0.18)] backdrop-blur-xl transition hover:bg-white"
            aria-label="展开等待提示"
          >
            <Clock size={16} className="text-[#bc5a42]" />
            已等待 {formatElapsed(elapsedSeconds)}
            <ChevronDown size={16} className="text-stone-400" />
          </button>
        ) : (
          <div className="fixed left-1/2 top-6 z-30 w-[min(92vw,560px)] -translate-x-1/2 rounded-[28px] border border-[#f0c6a8]/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(92,55,32,0.2)] backdrop-blur-xl">
            <div className="absolute right-3 top-3 flex items-center gap-1">
              <button
                onClick={() => setWaitingCollapsed(true)}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-[#fff8ee] hover:text-stone-700"
                aria-label="收起等待提示"
                title="收起等待提示"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => setCloseWaitingConfirmOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-[#fff8ee] hover:text-stone-700"
                aria-label="关闭等待提示"
                title="关闭等待提示"
              >
                <X size={16} />
              </button>
            </div>
            <div className="pr-20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ffe0ce] px-3 py-1.5 text-sm font-semibold text-[#bc5a42]">
                  <Clock size={15} />
                  正在等待玩家加入
                </span>
                <span className="rounded-full bg-[#fff8ee] px-3 py-1.5 text-sm font-semibold text-stone-600">
                  已等待 {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-stone-800">{waitingRoom.name}</h2>
              <p className="mt-1 text-sm leading-6 text-stone-500">
                等待过程中你也可以继续浏览星系，选择下方已有房间直接加入。
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
              className="rounded-2xl bg-[#f06f52] px-5 py-3 font-semibold text-white shadow-glow transition hover:bg-[#e45f47]"
            >
              确认
            </button>
          </div>
        </Modal>
      ) : null}

      <section className="mx-auto grid h-[calc(100vh-64px)] w-full max-w-7xl gap-5 pt-16 lg:grid-cols-[1fr_390px]">
        <div
          ref={canvasRef}
          onPointerDown={startPanning}
          onPointerMove={panMap}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
          className={`semantic-space relative h-full min-h-[620px] overflow-hidden rounded-[36px] border border-white/80 shadow-soft ${
            isPanning ? "is-panning" : ""
          }`}
        >
          <div className="pointer-events-none absolute left-8 top-8 z-10 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/62 px-3 py-2 text-sm font-semibold text-[#af6449] shadow-sm backdrop-blur-xl">
              <Sparkles size={15} />
              宇宙房间地图
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-stone-800">
              越靠近我的星系，越可能同频相遇
            </h1>
          </div>

          <div
            data-stop-pan
            className="absolute right-6 top-6 z-30 flex items-center gap-2 rounded-full border border-white/76 bg-white/70 p-2 shadow-sm backdrop-blur-xl"
          >
            <button
              onClick={() => changeZoom(-0.12)}
              className="grid h-10 w-10 place-items-center rounded-full text-stone-600 transition hover:bg-white"
              aria-label="缩小星图"
              title="缩小星图"
            >
              <ZoomOut size={18} />
            </button>
            <span className="min-w-12 text-center text-xs font-semibold text-stone-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => changeZoom(0.12)}
              className="grid h-10 w-10 place-items-center rounded-full text-stone-600 transition hover:bg-white"
              aria-label="放大星图"
              title="放大星图"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          {canvasSize.width && canvasSize.height ? (
            <svg
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-45"
              viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
              preserveAspectRatio="none"
            >
              {roomsWithSignal.map((room) => {
                const end = getLineEnd(room);
                return (
                  <line
                    key={room.id}
                    x1={canvasSize.width / 2}
                    y1={canvasSize.height / 2}
                    x2={end.x}
                    y2={end.y}
                    stroke={room.color}
                    strokeWidth={selectedId === room.id || hoveredId === room.id ? 1.7 : 0.8}
                    strokeDasharray="7 9"
                    opacity={selectedId === room.id || hoveredId === room.id ? 0.58 : 0.2}
                  />
                );
              })}
            </svg>
          ) : null}

          <div
            className="my-star pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <span className="my-star__orbit" />
            <span className="my-star__core">
              <Compass size={20} />
            </span>
          </div>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 mt-16 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/80 bg-[#f06f52] px-4 py-3 text-sm font-semibold text-white shadow-glow"
          >
            <Move size={16} />
            我的坐标
          </div>

          <div
            className="galaxy-map absolute inset-0 z-10"
            style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
          >
            {roomsWithSignal.map((room, index) => {
              const roomTypeStyle = getRoomTypeStyle(room.type);
              const RoomTypeIcon = roomTypeStyle.Icon;

              return (
                <div
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  data-stop-pan
                  data-selected={selectedId === room.id ? "true" : undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(room.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setSelectedId(room.id);
                  }}
                  onMouseEnter={() => setHoveredId(room.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    left: `calc(50% + ${room.mapX}px)`,
                    top: `calc(50% + ${room.mapY}px)`,
                    "--room-color": room.color,
                    "--halo-size": `${168 + room.similarity * 0.82}px`,
                    "--offset": `${(index % 2 === 0 ? -1 : 1) * 6}px`,
                    "--rotate": `${(index - 1.5) * 2}deg`,
                  }}
                  className={`galaxy-room absolute z-10 -translate-x-1/2 -translate-y-1/2 text-left transition ${
                    selectedId === room.id || hoveredId === room.id ? "is-active" : ""
                  }`}
                >
                  <span className="galaxy-room__halo" />
                  <span className="galaxy-room__dust galaxy-room__dust--one" />
                  <span className="galaxy-room__dust galaxy-room__dust--two" />
                  <span className="galaxy-room__card flex items-center gap-3">
                    <Avatar src={room.hostAvatar} name={room.hostName} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-stone-800">{room.hostName}</span>
                      <span className="block max-w-[150px] truncate text-xs text-stone-500">{room.name}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${roomTypeStyle.badgeClass}`}>
                          <RoomTypeIcon size={12} />
                          {room.type}
                        </span>
                        <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold" style={{ color: room.color, backgroundColor: `${room.color}1c` }}>
                          {room.similarity}%
                        </span>
                      </span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="glass-panel cosmic-side-panel flex min-h-0 flex-col rounded-[36px] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#af6449]">附近房间</p>
            <span className="rounded-full bg-white/62 px-3 py-1 text-xs font-semibold text-stone-500">
              以我的坐标排序
            </span>
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
                    onClick={() => setSelectedId(room.id)}
                    onMouseEnter={() => setHoveredId(room.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`cosmic-list-item flex min-w-[250px] items-center gap-3 rounded-3xl border p-3 text-left transition lg:min-w-0 ${
                      selectedId === room.id
                        ? "border-[#f06f52]/45 bg-[#fff0d7]"
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
              style={{ "--room-color": selectedSignal.color || "#f06f52" }}
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
                  <p className="mb-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-[#af6449]">
                    选中的星系 · {selectedSignal.matchLabel}
                  </p>
                  <h2 className="text-2xl font-semibold text-stone-800">{selectedRoom.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">房主 {selectedRoom.hostName}</p>
                </div>
              </div>
              <p className="mb-4 rounded-2xl bg-[#fff8ee] px-4 py-3 text-sm leading-6 text-stone-600">
                {selectedRoom.vibe}
              </p>
              <div className="mb-4 rounded-[24px] bg-white/70 p-4">
                <p className="mb-3 text-xs font-semibold text-[#af6449]">TA 的个人信息</p>
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
                      className="rounded-full bg-[#fff8ee] px-3 py-1.5 text-xs font-semibold text-stone-600"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => viewProfileFeed(selectedRoom)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fff8ee] px-4 py-3 text-sm font-semibold text-[#af6449] transition hover:bg-white"
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
                    : "bg-[#f06f52] shadow-glow hover:bg-[#e45f47]"
                }`}
              >
                相遇
              </button>
            </div>
          ) : (
            <div className="selected-galaxy-card mt-auto rounded-[30px] border border-white/76 bg-white/66 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#af6449]">未选中星系</p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                点击左侧星系卡片或附近房间列表，查看 TA 的资料与房间信息。
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
