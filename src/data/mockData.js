export function getMockUser() {
  return {
    id: "me",
    nickname: "小橘",
    avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=orange",
    region: "杭州",
    interests: ["电影", "旅行", "美食"],
  };
}

export function getMockRooms() {
  return [
    {
      id: "room-1",
      name: "半熟芝士夜聊",
      hostName: "Nana",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=nana",
      type: "语音房",
      vibe: "喜欢电影、慢旅行、睡前电台",
      x: 22,
      y: 34,
      color: "#ff8a7a",
    },
    {
      id: "room-2",
      name: "城市漫游交换站",
      hostName: "洛屿",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=loyu",
      type: "打字房",
      vibe: "摄影、咖啡、地图收藏",
      x: 54,
      y: 28,
      color: "#50bfa5",
    },
    {
      id: "room-3",
      name: "一起把歌听完",
      hostName: "Momo",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=momo",
      type: "语音房",
      vibe: "独立音乐、书籍、深夜散步",
      x: 70,
      y: 60,
      color: "#f6bd60",
    },
    {
      id: "room-4",
      name: "周末拼图同盟",
      hostName: "阿澈",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=ache",
      type: "语音房",
      vibe: "游戏、轻竞技、治愈系",
      x: 35,
      y: 72,
      color: "#9f86ff",
    },
  ];
}

export function getMockQuestions() {
  return [
    {
      id: "q-1",
      text: "如果今晚可以把一个城市变成你的秘密基地，你会选择哪里？",
      a: "有海风的城市",
      b: "凌晨还亮着灯的城市",
      c: "写下你的答案",
    },
    {
      id: "q-2",
      text: "你更想和刚认识的人一起完成哪件小事？",
      a: "交换一首歌",
      b: "计划一次随机散步",
      c: "写下你的答案",
    },
    {
      id: "q-3",
      text: "如果你们的友情有一种味道，它会是什么？",
      a: "热可可",
      b: "柑橘汽水",
      c: "写下你的答案",
    },
  ];
}

export function getMockFeed() {
  return [
    {
      id: "feed-1",
      user: "洛屿",
      title: "今天把路边花店画进了备忘录",
      text: "一束小雏菊，一个等红灯时想到的问题。",
    },
    {
      id: "feed-2",
      user: "Momo",
      title: "睡前歌单更新",
      text: "适合雨后散步，也适合刚认识的人一起听。",
    },
  ];
}

export function getInitialMessages() {
  return [
    {
      id: "thread-welcome",
      friendId: "system",
      name: "相遇小助手",
      avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=helper",
      subtitle: "今晚也会有柔软的新连接。",
      messages: [{ from: "system", text: "欢迎来到 Uslike。" }],
      decorHint: false,
    },
  ];
}

export function getGameList() {
  return ["种菜", "五子棋", "钓鱼", "拼图"];
}

export function makeFriendFromRoom(room) {
  return {
    id: room.id,
    name: room.hostName,
    avatar: room.hostAvatar,
    subtitle: "你们已添加为好友，继续你们的缘分吧！",
    messages: [
      { from: "system", text: "你们已添加为好友，继续你们的缘分吧！" },
      { from: "them", text: "刚刚那个问题好有画面感。" },
    ],
    decorHint: true,
  };
}
