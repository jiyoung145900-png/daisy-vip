// 아바타 스타일 종류
export const avatarStyles = [
  "adventurer", "avataaars", "big-ears", "bottts", "fun-emoji", 
  "lorelei", "micah", "miniavs", "notionists", "open-peeps"
];

// 아바타 URL 생성 함수
export const getAvatarUrl = (idx, userId) => {
  // 안전장치: idx가 범위 밖이면 0으로 처리
  const safeIdx = (idx >= 0 && idx < avatarStyles.length) ? idx : 0;
  return `https://api.dicebear.com/7.x/${avatarStyles[safeIdx]}/svg?seed=${userId}_${safeIdx}&backgroundColor=2a2a2e`;
};

// 등급 시스템 계산기
export const getTierInfo = (diamond = 0) => {
  if (diamond >= 1000000) return { name: "DIAMOND", color: "#b9f2ff", next: "MAX", per: 100 };
  if (diamond >= 500000) return { name: "PLATINUM", color: "#e5e4e2", next: 1000000, per: (diamond / 1000000) * 100 };
  if (diamond >= 100000) return { name: "GOLD", color: "#D4AF37", next: 500000, per: (diamond / 500000) * 100 };
  return { name: "SILVER", color: "#C0C0C0", next: 100000, per: (diamond / 100000) * 100 };
};