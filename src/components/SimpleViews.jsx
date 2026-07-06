import { useState } from "react";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

export function FeedView({ feed }) {
  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <h2 className="mb-5 text-3xl font-semibold text-stone-800">动态</h2>
      <div className="grid gap-4">
        {feed.map((item) => (
          <article key={item.id} className="glass-panel rounded-[28px] p-6">
            <p className="text-sm font-semibold text-[#b7664d]">{item.user}</p>
            <h3 className="mt-2 text-xl font-semibold text-stone-800">{item.title}</h3>
            <p className="mt-2 leading-7 text-stone-500">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MessagesView({ threads }) {
  const [activeThread, setActiveThread] = useState(null);
  const [friendActions, setFriendActions] = useState(null);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-5 pb-32 pt-24 lg:grid-cols-[360px_1fr]">
      <div className="glass-panel rounded-[32px] p-5">
        <h2 className="mb-4 text-2xl font-semibold text-stone-800">消息</h2>
        <div className="space-y-3">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveThread(thread)}
              className="flex w-full items-center gap-3 rounded-3xl bg-white/68 p-3 text-left transition hover:bg-white"
            >
              <Avatar src={thread.avatar} name={thread.name} />
              <span>
                <span className="block font-semibold text-stone-800">{thread.name}</span>
                <span className="mt-1 block text-xs text-stone-500">{thread.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel min-h-[560px] rounded-[32px] p-5">
        {activeThread ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-white/70 pb-4">
              <button onClick={() => setFriendActions(activeThread)}>
                <Avatar src={activeThread.avatar} name={activeThread.name} />
              </button>
              <div>
                <h3 className="text-xl font-semibold text-stone-800">{activeThread.name}</h3>
                <p className="text-xs text-stone-500">{activeThread.subtitle}</p>
              </div>
            </div>
            {activeThread.decorHint ? (
              <div className="my-5 flex h-28 items-center justify-center rounded-[28px] border border-dashed border-[#e3b494] bg-white/48 text-sm text-stone-500">
                开始装点属于你们的空间吧！
              </div>
            ) : null}
            <div className="flex-1 space-y-3 overflow-auto py-4">
              {activeThread.messages.map((message, index) => (
                <p
                  key={`${message.from}-${index}`}
                  className={`max-w-[72%] rounded-3xl px-4 py-3 text-sm ${
                    message.from === "them"
                      ? "bg-white text-stone-700"
                      : "ml-auto bg-[#f06f52] text-white"
                  }`}
                >
                  {message.text}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-stone-500">
            选择一个聊天框
          </div>
        )}
      </div>

      {friendActions ? (
        <Modal title={`${friendActions.name} 的操作`} onClose={() => setFriendActions(null)} width="max-w-sm">
          <div className="grid gap-2">
            {["查看好友信息", "设置好友备注", "查看 TA 的动态", "举报好友", "删除好友"].map((action) => (
              <button key={action} className="rounded-2xl bg-white/72 px-4 py-3 text-left font-semibold text-stone-700 hover:bg-white">
                {action}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export function FriendsView({ friends }) {
  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <h2 className="mb-5 text-3xl font-semibold text-stone-800">好友</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {friends.length === 0 ? (
          <div className="glass-panel rounded-[28px] p-8 text-stone-500">还没有添加好友。</div>
        ) : (
          friends.map((friend) => (
            <div key={friend.id} className="glass-panel flex items-center gap-4 rounded-[28px] p-5">
              <Avatar src={friend.avatar} name={friend.name} size="lg" />
              <div>
                <h3 className="text-xl font-semibold text-stone-800">{friend.name}</h3>
                <p className="mt-1 text-sm text-stone-500">{friend.subtitle}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function SettingsView() {
  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <div className="glass-panel rounded-[32px] p-8">
        <h2 className="text-3xl font-semibold text-stone-800">设置</h2>
        <p className="mt-3 text-stone-500">这里先保留为 demo stub。</p>
      </div>
    </section>
  );
}
