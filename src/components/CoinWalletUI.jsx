import { Check, Gem, Gift, LockKeyhole, ShoppingBag, Sparkles } from "lucide-react";
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

export function CheckInCard({ wallet, onOpen, onClaim }) {
  const status = getCheckInState(wallet);
  return (
    <>
      <div className="hidden w-full items-center gap-1.5 rounded-[20px] border border-white/70 bg-white/56 p-2 shadow-soft backdrop-blur-xl xl:flex">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eeeaff] text-[#6b5ee7]">
            {status.checkedIn ? <Check size={18} /> : <Gift size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-stone-800">
              {status.checkedIn ? "今日已签到" : "今日签到"}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-stone-500">
              {status.checkedIn
                ? `连续 ${wallet.streak} 天 · 明日 +${status.reward}`
                : `第 ${status.nextDay} 天 · 可领 +${status.reward} 币`}
            </span>
          </span>
        </button>
        {status.checkedIn ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label="查看签到详情"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/80 bg-white/62 text-[#625dc7] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
          >
            <Check size={17} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClaim}
            aria-label={`签到领取 ${status.reward} 互像币`}
            className="aurora-dark h-9 shrink-0 rounded-xl px-2.5 text-xs font-semibold text-white shadow-glow transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
          >
            +{status.reward}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={status.checkedIn ? onOpen : onClaim}
        aria-label={
          status.checkedIn
            ? `今日已签到，连续 ${wallet.streak} 天`
            : `签到领取 ${status.reward} 互像币`
        }
        className="grid h-12 shrink-0 grid-flow-col place-items-center gap-1.5 rounded-full border border-white/70 bg-white/56 px-3 text-[#6b5ee7] shadow-soft backdrop-blur-xl transition hover:bg-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55 xl:hidden"
      >
        {status.checkedIn ? <Check size={18} /> : <Gift size={18} />}
        {!status.checkedIn ? <span className="text-xs font-bold">+{status.reward}</span> : null}
      </button>
    </>
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
