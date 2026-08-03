export function getMockUser() {
  return {
    id: "me",
    nickname: "小橘",
    avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=orange",
    region: "杭州",
    interests: ["电影", "旅行", "美食"],
  };
}

export function getMeetTutorialRoom() {
  return {
    id: "tutorial-meet-assistant",
    name: "相遇小助手的练习房",
    hostName: "相遇小助手",
    hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=helper",
    nickname: "相遇小助手",
    age: null,
    gender: "神秘",
    region: "Uslike",
    interests: ["新手引导", "轻松聊天"],
    type: "打字房",
    vibe: "测试账号 · 陪你完成第一次相遇",
    x: 50,
    y: 50,
    color: "#f28b45",
    mapX: 0,
    mapY: 0,
    similarity: 99,
    isTutorial: true,
  };
}

export function getMeetTutorialQuestions() {
  return [
    {
      id: "values-queue-friend",
      text: "朋友赶时间，希望加入你已经排了很久的队伍。你会：",
      a: "让 TA 进来，偶尔帮助具体的人并不过分",
      b: "拒绝，因为这会让后面所有人承担代价",
      c: "写下你的答案",
    },
    {
      id: "values-animal-language",
      text: "你可以和所有动物对话，但是其他人类从此听不懂你说话。你会接受吗？",
      a: "接受，能和动物交流值得这个代价",
      b: "不接受，我仍然希望能和其他人类沟通",
      c: "写下你的答案",
    },
  ];
}

export function getMockRooms() {
  return [
    {
      id: "room-1",
      name: "半熟芝士夜聊",
      hostName: "Nana",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=nana",
      nickname: "Nana",
      age: 25,
      gender: "女",
      region: "杭州",
      interests: ["电影", "旅行", "美食"],
      type: "语音房",
      vibe: "喜欢电影、慢旅行、睡前电台",
      x: 22,
      y: 34,
      color: "#ff8a7a",
      mapX: -310,
      mapY: -140,
      similarity: 58,
    },
    {
      id: "room-2",
      name: "城市漫游交换站",
      hostName: "洛屿",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=loyu",
      nickname: "洛屿",
      age: 27,
      gender: "神秘",
      region: "上海",
      interests: ["旅行", "音乐", "美食"],
      type: "打字房",
      vibe: "摄影、咖啡、地图收藏",
      x: 54,
      y: 28,
      color: "#50bfa5",
      mapX: 62,
      mapY: -178,
      similarity: 84,
    },
    {
      id: "room-3",
      name: "一起把歌听完",
      hostName: "Momo",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=momo",
      nickname: "Momo",
      age: 24,
      gender: "女",
      region: "成都",
      interests: ["音乐", "书籍", "电影"],
      type: "语音房",
      vibe: "独立音乐、书籍、深夜散步",
      x: 70,
      y: 60,
      color: "#f6bd60",
      mapX: 236,
      mapY: 86,
      similarity: 73,
    },
    {
      id: "room-4",
      name: "周末拼图同盟",
      hostName: "阿澈",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=ache",
      nickname: "阿澈",
      age: 26,
      gender: "男",
      region: "广州",
      interests: ["游戏", "音乐", "美食"],
      type: "语音房",
      vibe: "游戏、轻竞技、治愈系",
      x: 35,
      y: 72,
      color: "#9f86ff",
      mapX: -185,
      mapY: 204,
      similarity: 67,
    },
    {
      id: "room-5",
      name: "晨间咖啡航线",
      hostName: "枝枝",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=zhizhi",
      nickname: "枝枝",
      age: 23,
      gender: "女",
      region: "苏州",
      interests: ["旅行", "书籍", "美食"],
      type: "打字房",
      vibe: "晨跑、手冲、城市观察",
      x: 82,
      y: 26,
      color: "#7bb7ff",
      mapX: 520,
      mapY: -220,
      similarity: 49,
    },
    {
      id: "room-6",
      name: "下班后的热汤",
      hostName: "小满",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=xiaoman",
      nickname: "小满",
      age: 29,
      gender: "神秘",
      region: "南京",
      interests: ["美食", "电影", "书籍"],
      type: "语音房",
      vibe: "家常菜、周记、慢节奏",
      x: 18,
      y: 64,
      color: "#ef9f70",
      mapX: -525,
      mapY: 124,
      similarity: 45,
    },
    {
      id: "room-7",
      name: "月台漫画社",
      hostName: "青禾",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=qinghe",
      nickname: "青禾",
      age: 22,
      gender: "男",
      region: "武汉",
      interests: ["书籍", "游戏", "音乐"],
      type: "语音房",
      vibe: "漫画、轻小说、角色分享",
      x: 50,
      y: 88,
      color: "#6ccfc0",
      mapX: -18,
      mapY: 376,
      similarity: 61,
    },
    {
      id: "room-8",
      name: "周三灵感交换",
      hostName: "Eli",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=eli",
      nickname: "Eli",
      age: 28,
      gender: "神秘",
      region: "北京",
      interests: ["书籍", "电影", "旅行"],
      type: "打字房",
      vibe: "设计、灵感板、产品碎片",
      x: 74,
      y: 78,
      color: "#d18cff",
      mapX: 448,
      mapY: 286,
      similarity: 42,
    },
    {
      id: "room-9",
      name: "雨声白噪音",
      hostName: "川川",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=chuanchuan",
      nickname: "川川",
      age: 26,
      gender: "女",
      region: "厦门",
      interests: ["音乐", "旅行", "美食"],
      type: "语音房",
      vibe: "白噪音、冥想、睡前陪伴",
      x: 39,
      y: 18,
      color: "#8fbf72",
      mapX: -112,
      mapY: -348,
      similarity: 63,
    },
    {
      id: "room-10",
      name: "电影片尾字幕",
      hostName: "森野",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=senye",
      nickname: "森野",
      age: 30,
      gender: "男",
      region: "重庆",
      interests: ["电影", "书籍", "音乐"],
      type: "打字房",
      vibe: "老电影、影评、片尾曲",
      x: 92,
      y: 54,
      color: "#ffb257",
      mapX: 650,
      mapY: 28,
      similarity: 38,
    },
    {
      id: "room-11",
      name: "旧书摊慢聊",
      hostName: "唐梨",
      hostAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=tangli",
      nickname: "唐梨",
      age: 27,
      gender: "女",
      region: "西安",
      interests: ["书籍", "电影", "旅行"],
      type: "语音房",
      vibe: "旧书、散文、城市角落",
      x: 9,
      y: 28,
      color: "#e58bb4",
      mapX: -642,
      mapY: -286,
      similarity: 36,
    },
  ];
}

const conversationQuestionPool = [
  {
    id: "values-family-public",
    text: "家人在公开场合发表了一个你认为明显错误、也可能伤害在场的人的观点。你会：",
    a: "当场表达不同意见，避免沉默被理解为认同",
    b: "当时不让家人难堪，之后私下沟通",
  },
  {
    id: "values-public-event",
    text: "你非常认同一场合法、和平的公共活动，但家人强烈反对你参加。你会：",
    a: "仍然参加，因为最终应由自己决定相信和支持什么",
    b: "暂时不参加，先考虑这件事会给家庭关系带来的影响",
  },
  {
    id: "values-city-care",
    text: "你获得了去理想城市发展的机会，但家里有人正处在人生中很需要陪伴的阶段。你会：",
    a: "接受机会，并寻找远程支持家人的方式",
    b: "暂时留下，机会以后还可能出现",
  },
  {
    id: "values-career-risk",
    text: "家人为你准备了一条稳定、风险低的职业道路，但你真正想做的方向不稳定、收入也不确定。你会：",
    a: "选择自己的方向，承担选择带来的风险",
    b: "先走稳定道路，在有保障的情况下再尝试喜欢的事",
  },
  {
    id: "values-late-assignment",
    text: "一名平时很认真的学生因为严重的家庭问题迟交作业，但规定写明迟交不得评分。你认为老师应该：",
    a: "破例接受，因为公平也应考虑不同处境",
    b: "执行统一规定，但通过其他方式提供帮助",
  },
  {
    id: "values-queue-friend",
    text: "朋友赶时间，希望加入你已经排了很久的队伍。你会：",
    a: "让 TA 进来，偶尔帮助具体的人并不过分",
    b: "拒绝，因为这会让后面所有人承担代价",
  },
  {
    id: "values-truth-peace",
    text: "你知道一件事的真相，但告诉当事人不会改变任何结果，只会让 TA 难过。你会：",
    a: "告诉 TA，因为一个人有权知道与自己有关的事实",
    b: "不主动说，因为真相并不总比平静更有价值",
  },
  {
    id: "play-private-room",
    text: "你更愿意拥有：",
    a: "一座私人电影院",
    b: "一座私人游戏厅",
  },
  {
    id: "play-funny-voice",
    text: "你更愿意：",
    a: "每次生气时都用米妮老鼠的声音说话",
    b: "每次大笑时都发出海绵宝宝的笑声",
  },
  {
    id: "play-dreams",
    text: "你更愿意：",
    a: "永远做非常奇怪的梦",
    b: "从此再也不做梦",
  },
  {
    id: "life-clothes-chair",
    text: "房间里有一把专门堆衣服的椅子。你的态度更接近：",
    a: "只要自己知道每件衣服在哪，它就是一个正常系统",
    b: "即使不影响使用，看见它还是会想尽快清空",
  },
  {
    id: "life-message-energy",
    text: "你看到了朋友的消息，但当时没有精力认真回复。你更可能：",
    a: "先发一句“我看到了，晚点认真回你”",
    b: "等状态合适时再完整回复，即使可能隔几个小时",
  },
  {
    id: "life-day-together",
    text: "和很喜欢的人连续相处了一整天，晚上分别后，你更希望：",
    a: "回家以后还可以断断续续继续聊天",
    b: "安静一阵，等自己的注意力重新充满再联系",
  },
  {
    id: "life-weekend-late",
    text: "周末没有任何安排，你自然醒来已经 11 点。你更可能：",
    a: "觉得一天才刚刚开始，慢慢吃点东西再决定做什么",
    b: "有一点“上午已经没了”的感觉，想赶快把一天拉回正轨",
  },
  {
    id: "life-travel-packing",
    text: "准备去旅行。你更容易：",
    a: "提前好几天把行李基本收好",
    b: "出发当天或者前一晚极限整理",
  },
  {
    id: "life-fridge",
    text: "冰箱里的东西。你更容易：",
    a: "快过期之前主动处理",
    b: "发现的时候再说",
  },
  {
    id: "relationship-reply-gap",
    text: "对方平时回复很快，这次半天没有出现。你更可能：",
    a: "发一条轻松的消息，确认对方是不是在忙",
    b: "默认对方有自己的事情，等对方回来再说",
  },
  {
    id: "relationship-awkward-photo",
    text: "对方想看你小时候最尴尬的一张照片，你更接近：",
    a: "可以给 TA 看，但 TA 也必须交换一张",
    b: "关系再熟一点以后也许可以，现在先保留",
  },
  {
    id: "relationship-cold-nothing",
    text: "你察觉对方突然比平时冷淡，但 TA 说“没什么”。你更可能：",
    a: "希望现在稍微说清楚，否则会一直惦记",
    b: "接受 TA 现在不想说，等 TA 准备好再谈",
  },
  {
    id: "relationship-hard-accept",
    text: "比起一次明显的争吵，你更难接受：",
    a: "很多小事一直没有兑现",
    b: "重要的事情一直不愿意推进",
  },
  {
    id: "relationship-care-sign",
    text: "你觉得哪一点更能体现对方真的在乎你：",
    a: "TA 主动腾出时间策划两个人的纪念日",
    b: "TA 记得很多关于你的细节",
  },
  {
    id: "relationship-speed-quality",
    text: "如果有人一直回复很慢，但每次都很认真。你更在意：",
    a: "回复速度",
    b: "回复质量",
  },
  {
    id: "memory-old-photo",
    text: "你偶然翻到一张和已经不再联系的人拍的照片，你更可能：",
    a: "停下来想一会儿，回忆当时为什么会慢慢走散",
    b: "看一眼，觉得那段时间真实存在过就已经很好",
  },
  {
    id: "memory-missed-chance",
    text: "很久以后想起一次错过的机会，你更容易觉得：",
    a: "如果当时勇敢一点，人生可能真的会不一样",
    b: "当时的自己已经用拥有的信息做了能做的选择",
  },
  {
    id: "memory-no-result",
    text: "你曾经认真准备一件事，最后却没有结果。多年后更想把它讲成：",
    a: "一个有点荒唐但很适合拿来自嘲的故事",
    b: "一段虽然失败、却确实改变了自己的经历",
  },
  {
    id: "memory-five-minutes",
    text: "假如可以回到过去五分钟，但不能改变任何事，你会选择：",
    a: "回到一次重要告别，重新看清当时对方的表情",
    b: "回到一个普通但快乐的下午，再感受一次当时的空气",
  },
  {
    id: "memory-unsaid-words",
    text: "如果只能补说一句多年以前没说出口的话，你更想说：",
    a: "一句道歉",
    b: "一句感谢",
  },
];

const shuffleQuestions = (questions) => {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const getRandomQuestions = (count = conversationQuestionPool.length) =>
  shuffleQuestions(conversationQuestionPool).slice(0, count);

export function getRandomOnboardingQuestions(count = 10) {
  return getRandomQuestions(count).map((question) => ({
    id: question.id,
    text: question.text,
    options: [question.a, question.b],
  }));
}

export function getMockQuestions() {
  return getRandomQuestions().map((question, index) => ({
    ...question,
    id: `q-${index + 1}-${question.id}`,
    c: "写下你的答案",
  }));
}

export function getMockFeed() {
  return [
    {
      id: "feed-1",
      user: "柚白",
      avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=youbo",
      badge: "同频 86%",
      status: "杭州 · 今天有一点点松弛",
      text: "把今天的散步路线存成了一张小地图。\n路过三家花店，两只橘色路灯，还有一个突然想认真生活的瞬间。",
      time: "今天 20:18",
      likedBy: "小橘",
      tags: ["散步", "城市观察", "生活碎片"],
      viewerAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=orange",
    },
    {
      id: "feed-2",
      user: "南枝",
      avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=nanzhi",
      badge: "新动态",
      status: "成都 · 正在整理睡前歌单",
      text: "今晚的关键词是：慢一点。\n适合边收拾房间边听，也适合发给一个还不太熟、但想继续认识的人。",
      time: "今天 19:42",
      likedBy: "川川",
      tags: ["音乐", "睡前", "慢节奏"],
      viewerAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=orange",
    },
    {
      id: "feed-3",
      user: "青禾",
      avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=feed-qinghe",
      status: "武汉 · 周末空出半天",
      text: "想找人一起拼一张 1000 片的图。\n不赶进度，只负责把边框先找出来，然后边聊边慢慢完成。",
      time: "今天 17:06",
      likedBy: "阿澈",
      tags: ["拼图", "周末", "轻游戏"],
      viewerAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=orange",
    },
    {
      id: "feed-4",
      user: "森野",
      avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=feed-senye",
      badge: "电影笔记",
      status: "重庆 · 刚看完一部旧片",
      text: "片尾字幕滚动的时候最适合发呆。\n有时候喜欢一部电影，不是因为剧情，而是它让我想起了某个被忘掉的下午。",
      time: "昨天 22:31",
      likedBy: "唐梨",
      tags: ["电影", "片尾曲", "旧时光"],
      viewerAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=orange",
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
      subtitle: "智能 AI agent · 随时为你解答",
      messages: [
        {
          from: "system",
          text: "「同频相遇，互像欢喜」，我是你的智能小助手，有任何问题欢迎直接问我哦！",
        },
      ],
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
    subtitle: room.vibe,
    messages: [
      { from: "system", text: "你们已添加为好友，继续你们的缘分吧！" },
      { from: "them", text: "刚刚那个问题好有画面感。" },
    ],
    decorHint: true,
  };
}
