import { ChevronLeft, Gamepad2, ImagePlus, Lock, PenLine, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";
import SpotlightTutorial from "./SpotlightTutorial.jsx";

export default function TextRoom({
  user,
  room,
  questions,
  games,
  onExit,
  onAddFriend,
  onToast,
  tutorialStep,
  tutorialQuestions,
  onTutorialStep,
  onTutorialDismiss,
  onTutorialComplete,
  onFirstInteraction,
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [skipReady, setSkipReady] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [theirAnswer, setTheirAnswer] = useState("");
  const [lightGameUnlocked, setLightGameUnlocked] = useState(() =>
    room.isFriend ? Boolean(room.friendGameUnlocked) : false,
  );
  const isTutorialRoom = Boolean(room.isTutorial);
  const [messages, setMessages] = useState(() =>
    isTutorialRoom
      ? [
          { id: "tutorial-system-intro", from: "system", text: "不过回答之前，可以先跟对方讨论一下选什么哦。" },
          {
            id: "tutorial-assistant-intro",
            from: "them",
            text: "感觉让朋友插进来怪不好意思的，感觉路人看我的眼神都充满嫌弃，负罪感好强哈哈哈",
          },
        ]
      : [{ from: "them", text: "我已经进来啦，先听一个问题。" }],
  );
  const [draft, setDraft] = useState("");
  const [showGames, setShowGames] = useState(false);
  const [friendState, setFriendState] = useState(() => (room.isFriend ? "added" : "idle"));
  const questionCardRef = useRef(null);
  const assistantIntroRef = useRef(null);
  const messageInputRef = useRef(null);
  const messageSendRef = useRef(null);
  const assistantReplyRef = useRef(null);
  const answerRefs = [useRef(null), useRef(null)];
  const nextQuestionRef = useRef(null);
  const keepContactRef = useRef(null);
  const answerLockedRef = useRef(false);
  const messageLockedRef = useRef(false);
  const tutorialFinishedRef = useRef(false);
  const tutorialTimersRef = useRef([]);
  const firstInteractionRef = useRef(false);

  const hasNextQuestion = isTutorialRoom
    ? questionIndex < tutorialQuestions.length - 1
    : questionIndex < questions.length - 1;
  const currentQuestion = isTutorialRoom
    ? tutorialQuestions[Math.min(questionIndex, tutorialQuestions.length - 1)]
    : questions[Math.min(questionIndex, questions.length - 1)];
  const answeredBoth = Boolean(myAnswer && theirAnswer);
  const textGameUnlocked = room.isFriend
    ? Boolean(room.friendTextGameUnlocked)
    : messages.filter((message) => message.from === "me" || message.from === "them").length >= 50;

  useEffect(() => {
    setSkipReady(questionIndex > 0);
    setMyAnswer("");
    setTheirAnswer("");
    answerLockedRef.current = false;
    if (questionIndex > 0) return undefined;

    const readyTimer = window.setTimeout(() => setSkipReady(true), 60000);
    return () => window.clearTimeout(readyTimer);
  }, [questionIndex]);

  useEffect(() => {
    if (answeredBoth) {
      setSkipReady(true);
      if (!room.isFriend) setLightGameUnlocked(true);
    }
  }, [answeredBoth, room.isFriend]);

  useEffect(() => () => {
    tutorialTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const scheduleTutorialUpdate = (callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    tutorialTimersRef.current.push(timer);
  };

  const finishTutorialQuestions = () => {
    if (tutorialFinishedRef.current) return;
    tutorialFinishedRef.current = true;
    setMessages((current) => current.some((message) => message.id === "tutorial-finish")
      ? current
      : [
          ...current,
          { id: "tutorial-finish", from: "system", text: "祝你们聊得愉快哦！如果开心可以保持联系！" },
        ]);
    onTutorialStep?.("keep_contact");
  };

  const answerQuestion = (answer) => {
    const expectedStep = questionIndex === 0 ? "answer_first" : "answer_second";
    if (isTutorialRoom && tutorialStep !== expectedStep) return;
    if (isTutorialRoom && (myAnswer || answerLockedRef.current)) return;
    if (isTutorialRoom) answerLockedRef.current = true;
    setMyAnswer(answer);
    if (questionIndex === 0 && !room.isFriend) {
      setLightGameUnlocked(true);
      if (!firstInteractionRef.current) {
        firstInteractionRef.current = true;
        onFirstInteraction?.();
      }
    }
    scheduleTutorialUpdate(() => {
      setTheirAnswer("相遇小助手也回答了");
      if (isTutorialRoom) {
        if (questionIndex === 0) onTutorialStep?.("next_question");
        else finishTutorialQuestions();
      }
    }, 650);
  };

  const sendMessage = () => {
    if (!draft.trim()) return;
    if (isTutorialRoom && tutorialStep === "send_message") {
      if (messageLockedRef.current) return;
      messageLockedRef.current = true;
      const reply = draft.trim();
      setMessages((current) => [...current, { id: `tutorial-me-${Date.now()}`, from: "me", text: reply }]);
      setDraft("");
      scheduleTutorialUpdate(() => {
        setMessages((current) => [
          ...current,
          {
            id: "tutorial-assistant-reply",
            from: "them",
            text: "我记得上次我去卢浮宫的时候有一个看着像导游的人排在我前面，然后一转眼的功夫就上百个游客直接插在了我们前面，给我们吓哭了hhh",
          },
        ]);
        onTutorialStep?.("assistant_reply");
      }, 500);
      return;
    }
    setMessages((current) => [
      ...current,
      { from: "me", text: draft.trim() },
      { from: "them", text: "哈哈哈，我也想继续聊这个。" },
    ]);
    setDraft("");
  };

  const addFriend = () => {
    if (isTutorialRoom) {
      onTutorialComplete?.();
      return;
    }
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

      <section className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-7xl gap-6 pt-16 lg:grid-cols-[1fr_390px]">
        <div className="grid min-h-[calc(100vh-128px)] grid-rows-[auto_1fr_auto] gap-6">
          <QuestionCard
            cardRef={questionCardRef}
            question={currentQuestion}
            showTimer={questionIndex === 0}
            ready={skipReady}
            answeredBoth={answeredBoth}
            myAnswer={myAnswer}
            theirAnswer={theirAnswer}
            hasNextQuestion={hasNextQuestion}
            onAnswer={answerQuestion}
            onSkip={() => {
              if (isTutorialRoom && tutorialStep === "next_question") {
                setQuestionIndex(1);
                onTutorialStep?.("answer_second");
                return;
              }
              if (hasNextQuestion) setQuestionIndex((index) => index + 1);
            }}
            onSkipTutorialQuestion={finishTutorialQuestions}
            answerRefs={answerRefs}
            nextQuestionRef={nextQuestionRef}
            answersDisabled={isTutorialRoom && !["answer_first", "answer_second"].includes(tutorialStep)}
            showCustomAnswer={!isTutorialRoom || questionIndex === 1}
            showSkipTutorialQuestion={isTutorialRoom && questionIndex === 1 && tutorialStep === "answer_second"}
          />

          <div className="flex items-start justify-center gap-12 md:gap-28">
            <UserSeat user={user} label="你" />
            <UserSeat
              user={{ nickname: room.hostName, avatar: room.hostAvatar }}
              label="对方"
              action={
                <button
                  ref={keepContactRef}
                  onClick={addFriend}
                  disabled={friendState === "added"}
                  className={`mt-4 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    tutorialStep === "keep_contact" ? "ring-4 ring-[#8b82e8]/35 ring-offset-2" : ""
                  } ${
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
              onClick={() => onToast(textGameUnlocked ? "双人互动文字游戏已解锁。" : "互发消息超过 50 条后解锁。")}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold ${
                textGameUnlocked ? "bg-[#eeeaff] text-[#6b5ee7]" : "bg-stone-100 text-stone-400"
              }`}
            >
              {textGameUnlocked ? <PenLine size={18} /> : <Lock size={18} />}
              双人互动文字游戏
            </button>
          </div>
        </div>

        <aside className="glass-panel flex min-h-[620px] flex-col rounded-[34px] p-5">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-stone-800">房间聊天</h2>
            <p className="mt-1 text-sm text-stone-500">{messages.length} 条消息</p>
          </div>

          {textGameUnlocked ? (
            <div className="mb-3 rounded-2xl bg-[#dcf8ee] px-4 py-3 text-sm font-semibold text-[#26866f]">
              双人互动文字游戏已解锁
            </div>
          ) : null}

          <div className="card-scroll flex-1 space-y-3 overflow-y-auto rounded-[28px] bg-[#f4f6ff]/78 p-4">
            {messages.map((message, index) => (
              message.from === "system" ? (
                <div
                  key={`${message.from}-${index}`}
                  className="mx-auto max-w-[90%] px-3 py-1 text-center text-xs font-medium leading-5 text-stone-400"
                >
                  {message.text}
                </div>
              ) : (
              <div
                key={message.id || `${message.from}-${index}`}
                ref={message.id === "tutorial-assistant-intro"
                  ? assistantIntroRef
                  : message.id === "tutorial-assistant-reply"
                    ? assistantReplyRef
                    : null}
                className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm ${
                  message.from === "me"
                    ? "chat-bubble-me ml-auto text-white"
                    : "mr-auto border border-black bg-white/58 text-stone-700 backdrop-blur-xl"
                }`}
              >
                {message.text}
              </div>
              )
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              title="发送图片"
              className="rounded-2xl bg-[#eeeaff] px-4 text-[#6b5ee7] transition hover:bg-white"
            >
              <ImagePlus size={20} />
            </button>
            <input
              ref={messageInputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="输入消息"
              className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
            />
            <button
              ref={messageSendRef}
              onClick={sendMessage}
              className="aurora-dark rounded-2xl px-4 text-white shadow-glow transition hover:brightness-110"
            >
              <Send size={20} />
            </button>
          </div>
        </aside>
      </section>

      {showGames ? (
        <Modal title="双人游戏" onClose={() => setShowGames(false)} width="max-w-md">
          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => (
              <button key={game} className="rounded-3xl bg-white/76 px-5 py-6 text-lg font-semibold text-stone-800 shadow-sm hover:bg-white">
                {game}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
      {tutorialStep === "question_intro" ? (
        <SpotlightTutorial
          step={5}
          targets={[{ ref: questionCardRef, padding: 7, radius: 32 }]}
          showContinue
          onContinue={() => onTutorialStep?.("assistant_intro")}
          onDismiss={onTutorialDismiss}
        >
          这是“电波一下”题卡。先和对方聊聊，再选择你的答案。
        </SpotlightTutorial>
      ) : null}
      {tutorialStep === "assistant_intro" ? (
        <SpotlightTutorial
          step={6}
          targets={[{ ref: assistantIntroRef, padding: 7, radius: 24 }]}
          showContinue
          onContinue={() => onTutorialStep?.("send_message")}
          onDismiss={onTutorialDismiss}
        >
          相遇小助手已经先说了自己的想法。
        </SpotlightTutorial>
      ) : null}
      {tutorialStep === "send_message" ? (
        <SpotlightTutorial
          step={7}
          targets={[
            { ref: messageInputRef, padding: 6, radius: 18 },
            { ref: messageSendRef, padding: 6, radius: 18 },
          ]}
          onDismiss={onTutorialDismiss}
        >
          随便回点啥吧，消息小助手会认真回复你的
        </SpotlightTutorial>
      ) : null}
      {tutorialStep === "assistant_reply" ? (
        <SpotlightTutorial
          step={8}
          targets={[{ ref: assistantReplyRef, padding: 7, radius: 24 }]}
          showContinue
          onContinue={() => onTutorialStep?.("answer_first")}
          onDismiss={onTutorialDismiss}
        >
          相遇小助手回复了你。点击“下一步”继续答题。
        </SpotlightTutorial>
      ) : null}
      {tutorialStep === "answer_first" ? (
        <SpotlightTutorial
          step={9}
          targets={answerRefs.map((ref) => ({ ref, padding: 6, radius: 18 }))}
          onDismiss={onTutorialDismiss}
        >
          选择 A 或 B，告诉相遇小助手你的答案。
        </SpotlightTutorial>
      ) : null}
      {tutorialStep === "next_question" ? (
        <SpotlightTutorial
          step={10}
          targets={[{ ref: nextQuestionRef, padding: 7, radius: 18 }]}
          onDismiss={onTutorialDismiss}
        >
          题库不止一道。点击“下一题”继续体验。
        </SpotlightTutorial>
      ) : null}
      {tutorialStep === "answer_second" ? (
        <SpotlightTutorial
          step={11}
          targets={[{ ref: questionCardRef, padding: 7, radius: 32 }]}
          onDismiss={onTutorialDismiss}
        >
          你可以回答这道动物语言题，也可以点击“跳过此题”。
        </SpotlightTutorial>
      ) : null}
      {tutorialStep === "keep_contact" ? (
        <SpotlightTutorial
          step={12}
          targets={[{ ref: keepContactRef, padding: 7, radius: 18 }]}
          onDismiss={onTutorialDismiss}
          actionLabel="新手引导完成！点击”保持联系“查看消息页"
          onAction={onTutorialComplete}
        >
          你已经完成第一次相遇，也可以点击“保持联系”前往消息页。
        </SpotlightTutorial>
      ) : null}
    </main>
  );
}

function QuestionCard({
  cardRef,
  question,
  showTimer,
  ready,
  answeredBoth,
  myAnswer,
  theirAnswer,
  hasNextQuestion,
  onAnswer,
  onSkip,
  onSkipTutorialQuestion,
  answerRefs,
  nextQuestionRef,
  answersDisabled,
  showCustomAnswer,
  showSkipTutorialQuestion,
}) {
  return (
    <div ref={cardRef} className="glass-panel mx-auto w-full max-w-3xl rounded-[32px] p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6b5ee7]">电波一下</p>
          <h1 className="mt-2 text-2xl font-semibold leading-snug text-stone-800">{question.text}</h1>
        </div>
        <button
          ref={nextQuestionRef}
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

      <div className={`mt-5 grid gap-3 ${showCustomAnswer ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {[question.a, question.b].map((answer, index) => (
          <button
            key={answer}
            ref={answerRefs?.[index]}
            onClick={() => onAnswer(answer)}
            disabled={answersDisabled}
            className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold transition ${
              myAnswer === answer
                ? "border-[#8b82e8]/55 bg-[#eeeaff] text-[#6b5ee7]"
                : "border-[#d8dcff]/70 bg-white/78 text-stone-700 hover:border-[#bdb8ff] hover:bg-white"
            } disabled:cursor-not-allowed disabled:opacity-55`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#bdb8ff]/80 bg-[#eeeaff] text-sm font-bold text-[#6b5ee7] shadow-sm">
              {String.fromCharCode(65 + index)}
            </span>
            <span>{answer}</span>
          </button>
        ))}
        {showCustomAnswer ? (
        <div className={`warm-field flex items-center gap-3 rounded-2xl border-[#d8dcff]/90 px-4 py-3 ${answersDisabled ? "opacity-55" : ""}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#bdb8ff]/80 bg-[#eeeaff] text-sm font-bold text-[#6b5ee7] shadow-sm">
            C
          </span>
          <input
            key={question.id}
            disabled={answersDisabled}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.currentTarget.value.trim()) {
                onAnswer(event.currentTarget.value.trim());
              }
            }}
            placeholder={question.c}
            className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-stone-400"
          />
        </div>
        ) : null}
      </div>

      {showSkipTutorialQuestion ? (
        <button
          type="button"
          onClick={onSkipTutorialQuestion}
          className="mt-4 w-full rounded-2xl bg-white/72 px-4 py-3 text-sm font-semibold text-stone-500 transition hover:bg-white hover:text-[#6b5ee7]"
        >
          跳过此题
        </button>
      ) : null}

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

function UserSeat({ user, label, action }) {
  return (
    <div className="flex w-40 flex-col items-center text-center">
      <Avatar src={user.avatar} name={user.nickname} size="xl" glow />
      <div className="mt-4 flex items-center gap-2 rounded-full bg-white/78 px-4 py-2 shadow-sm">
        <span className="font-semibold text-stone-800">{user.nickname}</span>
        <span className="h-2.5 w-2.5 rounded-full bg-[#50bfa5]" title="在线" />
      </div>
      <p className="mt-2 text-xs font-semibold text-stone-400">{label}</p>
      {action}
    </div>
  );
}
