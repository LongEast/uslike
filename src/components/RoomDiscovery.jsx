import { ChevronLeft, Mic, MessageSquareText, Move } from "lucide-react";
import { useState } from "react";
import Avatar from "./Avatar.jsx";

export default function RoomDiscovery({ rooms, onBack, onEnterVoice, onToast }) {
  const [selectedId, setSelectedId] = useState(rooms[0]?.id);
  const [marker, setMarker] = useState({ x: 48, y: 48 });
  const selectedRoom = rooms.find((room) => room.id === selectedId) || rooms[0];

  const moveMarker = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - bounds.left) / bounds.width) * 100);
    const y = Math.round(((event.clientY - bounds.top) / bounds.height) * 100);
    setMarker({ x: Math.min(92, Math.max(8, x)), y: Math.min(86, Math.max(12, y)) });
  };

  const meetRoom = () => {
    if (selectedRoom.type === "语音房") {
      onEnterVoice(selectedRoom);
      return;
    }
    onToast("这个打字房暂时是展示卡片，语音房可以进入完整 demo。");
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

      <section className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-7xl gap-5 pt-16 lg:grid-cols-[1fr_390px]">
        <div
          onClick={moveMarker}
          className="semantic-space relative min-h-[620px] overflow-hidden rounded-[36px] border border-white/80 shadow-soft"
        >
          <div className="absolute left-8 top-8 max-w-lg">
            <p className="text-sm font-semibold text-[#af6449]">高维语义空间</p>
            <h1 className="mt-2 text-4xl font-semibold text-stone-800">拖动你的方向，靠近相似的房间 cluster</h1>
          </div>
          <div className="absolute inset-0 opacity-35">
            <div className="absolute left-[18%] top-[28%] h-48 w-48 rounded-full border border-[#ff8a7a]" />
            <div className="absolute left-[58%] top-[18%] h-52 w-52 rounded-full border border-[#50bfa5]" />
            <div className="absolute left-[44%] top-[58%] h-56 w-56 rounded-full border border-[#f6bd60]" />
          </div>

          <button
            onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
            onPointerMove={(event) => {
              if (event.buttons === 1) moveMarker(event);
            }}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-[#f06f52] px-4 py-3 font-semibold text-white shadow-glow"
          >
            <Move size={16} />
            当前方向
          </button>

          {rooms.map((room, index) => (
            <button
              key={room.id}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(room.id);
              }}
              style={{
                left: `${room.x}%`,
                top: `${room.y}%`,
                "--offset": `${(index % 2 === 0 ? -1 : 1) * 6}px`,
                "--rotate": `${(index - 1.5) * 2}deg`,
              }}
              className={`room-card absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-[26px] border p-3 text-left shadow-soft transition hover:-translate-y-[54%] ${
                selectedId === room.id
                  ? "border-[#f06f52] bg-white"
                  : "border-white/80 bg-white/72 hover:bg-white"
              }`}
            >
              <Avatar src={room.hostAvatar} name={room.hostName} />
              <span>
                <span className="block font-semibold text-stone-800">{room.hostName}</span>
                <span className="block text-xs text-stone-500">{room.name}</span>
              </span>
            </button>
          ))}
        </div>

        <aside className="glass-panel flex flex-col rounded-[36px] p-5">
          <p className="mb-4 text-sm font-semibold text-[#af6449]">附近房间</p>
          <div className="card-scroll mb-5 flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedId(room.id)}
                className={`flex min-w-[220px] items-center gap-3 rounded-3xl p-3 text-left transition lg:min-w-0 ${
                  selectedId === room.id ? "bg-[#fff0d7]" : "bg-white/68 hover:bg-white"
                }`}
              >
                <Avatar src={room.hostAvatar} name={room.hostName} />
                <span>
                  <span className="block font-semibold text-stone-800">{room.hostName}</span>
                  <span className="block text-xs text-stone-500">{room.type}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-[30px] bg-white/74 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              <Avatar src={selectedRoom.hostAvatar} name={selectedRoom.hostName} size="lg" glow />
              <div>
                <h2 className="text-2xl font-semibold text-stone-800">{selectedRoom.name}</h2>
                <p className="mt-1 text-sm text-stone-500">房主 {selectedRoom.hostName}</p>
              </div>
            </div>
            <p className="mb-4 rounded-2xl bg-[#fff8ee] px-4 py-3 text-sm leading-6 text-stone-600">
              {selectedRoom.vibe}
            </p>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e6f7f2] px-3 py-2 text-sm font-semibold text-[#2d8c77]">
              {selectedRoom.type === "语音房" ? <Mic size={16} /> : <MessageSquareText size={16} />}
              {selectedRoom.type}
            </div>
            <button
              onClick={meetRoom}
              className="w-full rounded-2xl bg-[#f06f52] px-5 py-3 font-semibold text-white shadow-glow transition hover:bg-[#e45f47]"
            >
              相遇
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
