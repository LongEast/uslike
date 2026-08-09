import { Clock3, Gem, RotateCcw, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCooldown } from "../services/coinWallet.js";
import Modal from "./Modal.jsx";

export function DepositConfirmModal({ balance, actionLabel = "进入房间", onCancel, onConfirm }) {
  return (
    <Modal title={actionLabel} onClose={onCancel} width="max-w-md">
      <div className="rounded-2xl bg-[#f4f6ff] p-4 text-sm leading-7 text-stone-600">
        <p><strong className="text-[#6b5ee7]">暂时冻结 1 互像币</strong>作为互动保证金，不是房间消费。</p>
        <p className="mt-2">完成第一道互动问题后，1 互像币将自动返还。若进入后短时间内直接退出且未完成互动，保证金将不会返还。</p>
      </div>
      <p className="mt-4 flex items-center justify-between rounded-2xl border border-white bg-white/72 px-4 py-3 text-sm text-stone-500">
        当前余额 <strong className="inline-flex items-center gap-1 text-base text-stone-800"><Gem size={16} className="text-[#7977dd]" />{balance} 互像币</strong>
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onCancel} className="rounded-2xl bg-stone-100 px-5 py-3 font-semibold text-stone-600 transition hover:bg-stone-200">取消</button>
        <button type="button" onClick={onConfirm} className="aurora-dark rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110">确认进入</button>
      </div>
    </Modal>
  );
}

export function InsufficientCoinsModal({ onClose, onCheckIn, onStore }) {
  return (
    <Modal title="互像币余额不足" onClose={onClose} width="max-w-md">
      <p className="text-sm leading-7 text-stone-600">进入陌生人互动房间需要 1 互像币作为互动保证金。你可以通过每日签到、互动任务或商城获得互像币。</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onCheckIn} className="rounded-2xl bg-[#eeeaff] px-4 py-3 font-semibold text-[#6b5ee7] transition hover:bg-[#e3ddff]">去签到</button>
        <button type="button" onClick={onStore} className="aurora-dark inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white shadow-glow transition hover:brightness-110"><ShoppingBag size={17} />前往商城</button>
      </div>
    </Modal>
  );
}

export function ExitDepositModal({ quickExit, onContinue, onExit }) {
  return (
    <Modal title="还没有完成首次互动" onClose={onContinue} width="max-w-md">
      <p className="text-sm leading-7 text-stone-600">
        {quickExit ? "你进入房间还不足一分钟，" : "你还没有回答本次房间的第一道问题，"}
        现在退出将扣除已冻结的 1 互像币。完成第一道问题后退出，保证金将自动返还。
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onContinue} className="rounded-2xl bg-[#eeeaff] px-4 py-3 font-semibold text-[#6b5ee7] transition hover:bg-[#e3ddff]">继续互动</button>
        <button type="button" onClick={onExit} className="rounded-2xl bg-[#fff1ed] px-4 py-3 font-semibold text-[#ba624b] transition hover:bg-[#ffe8e1]">仍然退出</button>
      </div>
    </Modal>
  );
}

export function ResumeRoomModal({ roomName, onClose, onResume }) {
  return (
    <Modal title="检测到未完成的房间互动" onClose={onClose} width="max-w-md">
      <div className="flex items-start gap-3 rounded-2xl bg-[#f4f6ff] p-4">
        <RotateCcw size={20} className="mt-1 shrink-0 text-[#6b5ee7]" />
        <p className="text-sm leading-7 text-stone-600">你可以继续「{roomName}」中刚才的互动，互动保证金仍处于冻结状态，不会再次冻结互像币。</p>
      </div>
      <button type="button" onClick={onResume} className="aurora-dark mt-5 w-full rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110">继续房间</button>
    </Modal>
  );
}

export function CooldownModal({ cooldownUntil, onClose }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Modal title="暂时无法加入新房间" onClose={onClose} width="max-w-md">
      <div className="text-center">
        <Clock3 className="mx-auto text-[#ba7950]" size={30} />
        <p className="mt-4 text-sm leading-7 text-stone-600">由于短时间内多次退出互动，你需要等待：</p>
        <p className="mt-2 text-4xl font-semibold tabular-nums text-stone-800">{formatCooldown(cooldownUntil - now)}</p>
        <p className="mt-3 text-sm text-stone-500">后才能再次加入陌生人互动。好友聊天、动态、商城和签到不受影响。</p>
      </div>
    </Modal>
  );
}
