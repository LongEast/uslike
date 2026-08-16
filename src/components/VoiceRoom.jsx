import { ChevronLeft, ChevronUp, Gamepad2, Lock, MessageCircle, Mic, MicOff, PenLine, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import ChatSidebar from "./ChatSidebar.jsx";
import Modal from "./Modal.jsx";

export default function VoiceRoom({
  user,
  room,
  questions,
  games,
  onExit,
  onAddFriend,
  onToast,
  onFirstInteraction,
}) {
  const [micOn, setMicOn] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [skipReady, setSkipReady] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [theirAnswer, setTheirAnswer] = useState("");
  const [lightGameUnlocked, setLightGameUnlocked] = useState(() =>
    room.isFriend ? Boolean(room.friendGameUnlocked) : false,
  );
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([
    { from: "them", text: "我已经进来啦，先听一个问题。" },
  ]);
  const [showGames, setShowGames] = useState(false);
  const [friendState, setFriendState] = useState(() => (room.isFriend ? "added" : "idle"));
  const firstInteractionRef = useRef(false);

  const hasNextQuestion = questionIndex < questions.length - 1;
  const currentQuestion = questions[Math.min(questionIndex, questions.length - 1)];
  const textGameUnlocked = room.isFriend
    ? Boolean(room.friendTextGameUnlocked)
    : messages.length > 50;

  useEffect(() => {
    setSkipReady(questionIndex > 0);
    setMyAnswer("");
    setTheirAnswer("");
    if (questionIndex > 0) return undefined;

    const readyTimer = window.setTimeout(() => setSkipReady(true), 60000);
    return () => window.clearTimeout(readyTimer);
  }, [questionIndex]);

  const answeredBoth = Boolean(myAnswer && theirAnswer);

  useEffect(() => {
    if (answeredBoth) {
      setSkipReady(true);
      if (!room.isFriend) setLightGameUnlocked(true);
    }
  }, [answeredBoth, room.isFriend]);

  const answerQuestion = (answer) => {
    setMyAnswer(answer);
    if (questionIndex === 0 && !room.isFriend) {
      setLightGameUnlocked(true);
      if (!firstInteractionRef.current) {
        firstInteractionRef.current = true;
        onFirstInteraction?.();
      }
    }
    window.setTimeout(() => setTheirAnswer("TA 也回答了"), 650);
  };

  const skipQuestion = () => {
    if (!hasNextQuestion) return;
    setQuestionIndex((index) => index + 1);
  };

  const addFriend = () => {
    if (friendState === "idle") {
      setFriendState("requested");
      onToast("好友申请已发送。");
      return;
    }

    if (friendState === "requested") {
      setFriendState("added");
      onAddFriend(room);
      onToast("对方已通过，你们已添加为好友。");
    }
  };

  const sendMessage = (text) => {
    setMessages((current) => [
      ...current,
      { from: "me", text },
      { from: "them", text: "哈哈哈" },
    ]);
  };

  const friendButtonText = useMemo(() => {
    if (friendState === "added") return "已添加";
    if (friendState === "requested") return "已申请好友";
    return "保持联系";
  }, [friendState]);

  return (
    <main className="main-wash relative min-h-screen overflow-hidden px-6 py-8">
      <button
        onClick={onExit}
        className="fixed left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full bg-white/78 px-4 py-3 font-semibold text-stone-700 shadow-soft backdrop-blur-xl hover:bg-white"
      >
        <ChevronLeft size={18} />
        退出房间
      </button>
      {!chatOpen ? (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full bg-white/78 px-4 py-3 font-semibold text-stone-700 shadow-soft backdrop-blur-xl hover:bg-white"
        >
          <MessageCircle size={18} />
          聊天
        </button>
      ) : null}

      <section
        className={`mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-7xl gap-6 pt-16 ${
          chatOpen ? "lg:grid-cols-[minmax(0,1fr)_390px]" : "lg:grid-cols-1"
        }`}
      >
        <div className="grid min-h-[calc(100vh-128px)] min-w-0 grid-rows-[auto_1fr_auto] gap-6">
          <QuestionCard
          question={currentQuestion}
          showTimer={questionIndex === 0}
          ready={skipReady}
          answeredBoth={answeredBoth}
          myAnswer={myAnswer}
          theirAnswer={theirAnswer}
          hasNextQuestion={hasNextQuestion}
          onAnswer={answerQuestion}
          onSkip={skipQuestion}
        />

          <div className="flex items-start justify-center gap-12 md:gap-28">
            <UserSeat user={user} micOn={micOn} label="你" />
            <UserSeat
            user={{ nickname: room.hostName, avatar: room.hostAvatar }}
            micOn
            label="对方"
            action={
              <button
                onClick={addFriend}
                disabled={friendState === "added"}
                className={`mt-4 rounded-full px-5 py-3 text-sm font-semibold transition ${
                  friendState === "added"
                    ? "bg-[#dcf8ee] text-[#26866f]"
                    : "aurora-dark text-white shadow-glow hover:brightness-110"
                }`}
              >
                {friendButtonText}
              </button>
            }
            />
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-[28px] bg-white/70 p-3 shadow-soft backdrop-blur-xl">
          <div className="inline-flex h-12 overflow-hidden rounded-xl bg-[#f1f2f4] text-stone-700 shadow-sm">
            <button
              onClick={() => setMicOn((value) => !value)}
              className="inline-flex items-center gap-2.5 px-4 font-semibold transition hover:bg-white/70"
              aria-pressed={micOn}
              title={micOn ? "关闭麦克风" : "打开麦克风"}
            >
              {micOn ? (
                <Mic size={21} className="text-stone-600" />
              ) : (
                <MicOff size={21} className="text-[#ef4444]" />
              )}
              <span>麦克风</span>
            </button>
            <button
              onClick={() => onToast("麦克风设置稍后开放。")}
              className="grid w-10 place-items-center border-l border-white/80 text-stone-500 transition hover:bg-white/70 hover:text-stone-800"
              aria-label="麦克风设置"
              title="麦克风设置"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          <button
            onClick={() => lightGameUnlocked ? setShowGames(true) : onToast("双方完成一道问题后解锁。")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold transition ${
              lightGameUnlocked
                ? "bg-[#dcf8ee] text-[#247e68] hover:bg-[#c9f2e5]"
                : "bg-stone-100 text-stone-400"
            }`}
          >
            {lightGameUnlocked ? <Gamepad2 size={18} /> : <Lock size={18} />}
            双人游戏
          </button>
          <button
            onClick={() => onToast(textGameUnlocked
              ? "双人互动文字游戏已解锁。"
              : "互发消息超过 50 条后解锁。\nVIP 可直接解锁（Demo 阶段免费）")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold ${
              textGameUnlocked ? "bg-[#eeeaff] text-[#6b5ee7]" : "bg-stone-100 text-stone-400"
            }`}
          >
            {textGameUnlocked ? <PenLine size={18} /> : <Lock size={18} />}
            <span className="text-left">
              <span className="block">双人互动文字游戏</span>
              {!textGameUnlocked ? (
                <span className="mt-0.5 block text-[11px] font-medium leading-4 text-stone-400">
                  VIP 可直接解锁（Demo 阶段免费）
                </span>
              ) : null}
            </span>
          </button>
          </div>
        </div>

        <ChatSidebar
          inlineDesktop
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={messages}
          onSend={sendMessage}
          textGameUnlocked={textGameUnlocked}
        />
      </section>

      {showGames ? (
        <Modal title="双人游戏" onClose={() => setShowGames(false)} width="max-w-md">
          <p className="mb-4 rounded-2xl bg-[#f4f2ff] px-4 py-3 text-center text-sm font-semibold text-[#6b5ee7]">
            暂未开放
          </p>
          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => (
              <button
                key={game}
                type="button"
                disabled
                className="cursor-not-allowed rounded-3xl bg-stone-100/80 px-5 py-6 text-lg font-semibold text-stone-400 shadow-sm"
              >
                {game}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function QuestionCard({ question, showTimer, ready, answeredBoth, myAnswer, theirAnswer, hasNextQuestion, onAnswer, onSkip }) {
  return (
    <div className="glass-panel mx-auto w-full max-w-3xl rounded-[32px] p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6b5ee7]">电波一下</p>
          <h1 className="mt-2 text-2xl font-semibold leading-snug text-stone-800">{question.text}</h1>
        </div>
        <button
          onClick={onSkip}
          disabled={!ready || !hasNextQuestion}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
            ready && hasNextQuestion
              ? "aurora-dark text-white shadow-glow hover:brightness-110"
              : "bg-stone-100 text-stone-400"
          }`}
        >
          {hasNextQuestion ? "下一题" : "已是最后一题"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[question.a, question.b].map((answer, index) => (
          <button
            key={answer}
            onClick={() => onAnswer(answer)}
            className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold transition ${
              myAnswer === answer
                ? "border-[#8b82e8]/55 bg-[#eeeaff] text-[#6b5ee7]"
                : "border-[#d8dcff]/70 bg-white/78 text-stone-700 hover:border-[#bdb8ff] hover:bg-white"
            }`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#bdb8ff]/80 bg-[#eeeaff] text-sm font-bold text-[#6b5ee7] shadow-sm">
              {String.fromCharCode(65 + index)}
            </span>
            <span>{answer}</span>
          </button>
        ))}
        <div className="warm-field flex items-center gap-3 rounded-2xl border-[#d8dcff]/90 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#bdb8ff]/80 bg-[#eeeaff] text-sm font-bold text-[#6b5ee7] shadow-sm">
            C
          </span>
          <input
            key={question.id}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.currentTarget.value.trim()) {
                onAnswer(event.currentTarget.value.trim());
              }
            }}
            placeholder={question.c}
            className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-stone-400"
          />
        </div>
      </div>

      <div className={`mt-5 ${answeredBoth ? "answered" : ""}`}>
        {showTimer ? (
          <div className="light-track relative h-7 overflow-hidden rounded-full">
            <span
              key={`left-${question.id}`}
              className="answer-dot answer-dot--left absolute top-1/2 h-4 w-4 rounded-full bg-[#8b82e8] opacity-80 shadow-glow"
            />
            <span
              key={`right-${question.id}`}
              className="answer-dot answer-dot--right absolute top-1/2 h-4 w-4 rounded-full bg-[#50bfa5] opacity-80 shadow-glow"
            />
          </div>
        ) : null}
        <div className={`${showTimer ? "mt-3" : ""} flex items-center justify-between text-xs font-semibold text-stone-500`}>
          <span>{myAnswer ? "你已回答" : "等待你的选择"}</span>
          <span>{theirAnswer || "等待对方回答"}</span>
        </div>
      </div>
    </div>
  );
}

function UserSeat({ user, micOn, label, action }) {
  return (
    <div className="flex w-40 flex-col items-center text-center">
      <Avatar src={user.avatar} name={user.nickname} size="xl" glow />
      <div className="mt-4 flex items-center gap-2 rounded-full bg-white/78 px-4 py-2 shadow-sm">
        <span className="font-semibold text-stone-800">{user.nickname}</span>
        <span
          className={`h-2.5 w-2.5 rounded-full ${micOn ? "bg-[#50bfa5]" : "bg-[#ef4444]"}`}
          title={micOn ? "麦克风开启" : "麦克风关闭"}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-stone-400">{label}</p>
      {action}
    </div>
  );
}
