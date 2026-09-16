export interface AvatarOption {
  id: string;
  emoji: string;
  nameKm: string;
  nameEn: string;
  bgColor: string;
  borderColor: string;
}

export const BUILT_IN_AVATARS: AvatarOption[] = [
  {
    id: "avatar_01",
    emoji: "🐯",
    nameKm: "ខ្លាកូគី",
    nameEn: "Koki Tiger",
    bgColor: "#FFF4E6",
    borderColor: "#FC6E00",
  },
  {
    id: "avatar_02",
    emoji: "🐘",
    nameKm: "ដំរីតូច",
    nameEn: "Little Elephant",
    bgColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  {
    id: "avatar_03",
    emoji: "🐵",
    nameKm: "ស្វាឆ្លាត",
    nameEn: "Clever Monkey",
    bgColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  {
    id: "avatar_04",
    emoji: "🐬",
    nameKm: "ផ្សោតមេគង្គ",
    nameEn: "Mekong Dolphin",
    bgColor: "#E0F2FE",
    borderColor: "#0284C7",
  },
  {
    id: "avatar_05",
    emoji: "🦅",
    nameKm: "ឥន្ទ្រីភ្នំ",
    nameEn: "Mountain Eagle",
    bgColor: "#EDE9FE",
    borderColor: "#8B5CF6",
  },
  {
    id: "avatar_06",
    emoji: "🐢",
    nameKm: "អណ្តើកសំណាង",
    nameEn: "Lucky Turtle",
    bgColor: "#DCFCE7",
    borderColor: "#22C55E",
  },
  {
    id: "avatar_07",
    emoji: "🦜",
    nameKm: "សេកព្រៃ",
    nameEn: "Jungle Parrot",
    bgColor: "#FFE4E6",
    borderColor: "#F43F5E",
  },
  {
    id: "avatar_08",
    emoji: "🦁",
    nameKm: "តោអង់អាច",
    nameEn: "Brave Lion",
    bgColor: "#FFFBEB",
    borderColor: "#D97706",
  },
];
