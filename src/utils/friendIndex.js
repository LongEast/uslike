export const FRIEND_INDEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const PINYIN_BOUNDARIES = [
  ["A", "阿"],
  ["B", "八"],
  ["C", "嚓"],
  ["D", "咑"],
  ["E", "妸"],
  ["F", "发"],
  ["G", "旮"],
  ["H", "铪"],
  ["J", "讥"],
  ["K", "咔"],
  ["L", "垃"],
  ["M", "妈"],
  ["N", "拏"],
  ["O", "噢"],
  ["P", "妑"],
  ["Q", "七"],
  ["R", "呥"],
  ["S", "仨"],
  ["T", "他"],
  ["W", "屲"],
  ["X", "夕"],
  ["Y", "丫"],
  ["Z", "帀"],
];

const pinyinCollator = new Intl.Collator("zh-CN-u-co-pinyin", {
  sensitivity: "base",
  numeric: true,
});

export function getFriendInitial(name, explicitInitial) {
  const providedInitial = explicitInitial?.trim().charAt(0).toUpperCase();
  if (providedInitial && /^[A-Z]$/.test(providedInitial)) return providedInitial;

  const firstCharacter = name?.trim().charAt(0);
  if (!firstCharacter) return "#";
  if (/^[A-Za-z]$/.test(firstCharacter)) return firstCharacter.toUpperCase();
  if (!/^[\u3400-\u9fff]$/u.test(firstCharacter)) return "#";

  let initial = "#";
  for (const [letter, boundary] of PINYIN_BOUNDARIES) {
    if (pinyinCollator.compare(firstCharacter, boundary) < 0) break;
    initial = letter;
  }
  return initial;
}

export function groupFriendsByInitial(friends) {
  const sortedFriends = [...friends].sort((left, right) => {
    const initialDifference =
      getFriendInitial(left.name, left.initial).localeCompare(
        getFriendInitial(right.name, right.initial),
      );
    if (initialDifference) return initialDifference;
    return pinyinCollator.compare(left.name || "", right.name || "");
  });

  const groups = new Map();
  sortedFriends.forEach((friend) => {
    const initial = getFriendInitial(friend.name, friend.initial);
    const group = groups.get(initial) || [];
    group.push(friend);
    groups.set(initial, group);
  });

  return [...groups.entries()];
}
