// Utilitaires pour la gestion des badges

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export interface UserStats {
  totalPrayers: number;
  currentStreak: number;
  longestStreak: number;
  totalDhikr: number;
  totalTasbih: number;
}

export const getBadges = async (): Promise<Badge[]> => {
  // Simulation des badges
  return [
    {
      id: "prayer_streak",
      name: "Série de prières",
      description: "Priez 7 jours de suite",
      icon: "prayer",
      unlocked: false,
      progress: 5,
      maxProgress: 7,
    },
    {
      id: "dhikr_master",
      name: "Maître du Dhikr",
      description: "Complétez 100 dhikr",
      icon: "dhikr",
      unlocked: true,
      progress: 100,
      maxProgress: 100,
    },
  ];
};

export const unlockBadge = async (badgeId: string): Promise<boolean> => {
  // Simulation du déblocage d'un badge
  return true;
};

export const getBadgeProgress = async (badgeId: string): Promise<number> => {
  // Simulation de la progression d'un badge
  return 50;
};
