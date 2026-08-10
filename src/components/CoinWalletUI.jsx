import { Check, ChevronRight, Gem, Gift, LockKeyhole, ShoppingBag, Sparkles } from "lucide-react";
import { CHECK_IN_REWARDS, getCheckInState } from "../services/coinWallet.js";
import Modal from "./Modal.jsx";

export function CoinBalancePill({ balance, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/[0.58] px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur-xl transition hover:bg-white/[0.86]"
      aria-label={`互像币余额 ${balance}`}
    >
      <Gem size={compact ? 15 : 17} className="text-[#7977dd]" />
      <span>{balance}</span>
    </button>
  );
}

export function CheckInCard({ wallet, onOpen, onClaim, onOpenStore }) {
  const status = getCheckInState(wallet);
  return (
    <div className="glass-panel rounded-[28px] p-5">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eeeaff] text-[#6b5ee7]">
            <Gift size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-stone-800">今日签到</span>
            <span className="mt-1 block text-sm text-stone-500">
              {status.checkedIn ? `已连续签到 ${wallet.streak} 天` : `连续签到第 ${status.nextDay} 天 · 今日 +${status.reward} 币`}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenStore}
          aria-label={`前往互像商城，当前余额 ${wallet.balance}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/70 bg-white/[0.58] px-2.5 py-1.5 text-xs font-semibold text-[#6b5ee7] shadow-sm backdrop-blur-xl transition hover:bg-white/[0.86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
        >
          余额 {wallet.balance} <ChevronRight size={14} />
        </button>
      </div>
      {status.checkedIn ? (
        <button type="button" onClick={onOpen} className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/80 bg-gradient-to-r from-[#edf2ff]/90 via-white/[0.68] to-[#f2eaff]/90 px-4 py-3 text-sm font-semibold text-[#625dc7] shadow-[0_10px_30px_rgba(92,84,174,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55">
          <span className="inline-flex items-center gap-2"><Check size={17} />今日已签到</span>
          <span>明日 +{status.reward} 币</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onClaim}
          className="aurora-dark mt-4 w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
        >
          签到领取 +{status.reward} 互像币
        </button>
      )}
    </div>
  );
}

export function CheckInModal({ wallet, onClose, onClaim }) {
  const status = getCheckInState(wallet);
  const claimedCount = status.checkedIn ? status.currentDay : Math.max(0, status.nextDay - 1);
  return (
    <Modal title="每日签到" onClose={onClose} width="max-w-2xl" variant="glass">
      <div className="checkin-reward-board relative overflow-hidden rounded-[26px] p-5">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#6b5ee7]">连续相遇，积攒一点心意</p>
              <p className="mt-1 text-2xl font-semibold text-stone-800">
                {status.checkedIn ? `已连续签到 ${wallet.streak} 天` : `今天是第 ${status.nextDay} 天`}
              </p>
            </div>
            <CoinBalancePill balance={wallet.balance} />
          </div>
          <div className="card-scroll -mx-2 mt-3 grid grid-flow-col auto-cols-[62px] gap-2 overflow-x-auto px-2 pb-8 pt-2 sm:grid-flow-row sm:grid-cols-7 sm:auto-cols-auto sm:overflow-visible">
            {CHECK_IN_REWARDS.map((reward, index) => {
              const day = index + 1;
              const claimed = day <= claimedCount;
              const today = !status.checkedIn && day === status.nextDay;
              const featured = day === (status.checkedIn ? status.currentDay : status.nextDay);
              return (
                <div
                  key={day}
                  className={`checkin-day-card min-w-[62px] rounded-2xl border px-2 py-3 text-center sm:min-w-0 ${featured ? "checkin-day-card--featured" : ""} ${
                    claimed
                      ? "checkin-day-card--claimed"
                      : today
                        ? "checkin-day-card--today"
                        : "checkin-day-card--locked"
                  }`}
                >
                  <span className="block text-[11px] font-semibold">Day {day}</span>
                  <span className="mt-2 grid place-items-center">
                    {claimed ? <Check size={17} /> : today ? <Sparkles size={17} /> : <LockKeyhole size={15} />}
                  </span>
                  <span className="mt-2 block text-sm font-bold">+{reward}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {status.checkedIn ? (
        <div className="mt-5 rounded-2xl border border-white/80 bg-gradient-to-r from-[#edf2ff]/[0.88] via-white/70 to-[#f2eaff]/[0.88] px-5 py-4 text-center font-semibold text-[#625dc7] shadow-[0_12px_32px_rgba(92,84,174,0.10)] backdrop-blur-xl">
          <Check className="mr-2 inline" size={18} />今日已签到，明天再来吧
        </div>
      ) : (
        <button type="button" onClick={onClaim} className="aurora-dark mt-5 w-full rounded-2xl px-5 py-3.5 font-semibold text-white shadow-glow transition hover:brightness-110">
          签到领取 +{status.reward} 互像币
        </button>
      )}
    </Modal>
  );
}

const dayLabel = (createdAt) => {
  const value = new Date(createdAt);
  const today = new Date();
  if (value.toDateString() === today.toDateString()) return "今天";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (value.toDateString() === yesterday.toDateString()) return "昨天";
  return `${value.getMonth() + 1} 月 ${value.getDate()} 日`;
};

export function CoinHistoryModal({ wallet, onClose, onOpenStore }) {
  const groups = wallet.transactions.reduce((result, item) => {
    const label = dayLabel(item.createdAt);
    if (!result[label]) result[label] = [];
    result[label].push(item);
    return result;
  }, {});
  return (
    <Modal
      title="互像币记录"
      onClose={onClose}
      width="max-w-md"
      headerAction={<CoinBalancePill balance={wallet.balance} />}
    >
      <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
        {Object.entries(groups).map(([label, items]) => (
          <section key={label}>
            <p className="mb-2 text-xs font-semibold text-stone-400">{label}</p>
            <div className="overflow-hidden rounded-2xl border border-stone-100 bg-[#f9faff]">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 border-b border-white px-4 py-3.5 last:border-0">
                  <span className="text-sm font-medium text-stone-700">{item.label}</span>
                  <span className={`font-semibold ${item.amount > 0 ? "text-[#2d8c77]" : "text-stone-600"}`}>
                    {item.amount > 0 ? "+" : ""}{item.amount}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <button type="button" onClick={onOpenStore} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#eeeaff] px-5 py-3 font-semibold text-[#6b5ee7] transition hover:bg-[#e3ddff]">
        <ShoppingBag size={18} />前往互像商城
      </button>
    </Modal>
  );
}
