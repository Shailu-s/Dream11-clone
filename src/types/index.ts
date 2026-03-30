export interface PlayerSelection {
  playerId: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface PrizeDistribution {
  rank: number;
  percentage: number;
}

export interface TeamValidation {
  valid: boolean;
  errors: string[];
}

export interface PlayerWithSelection {
  id: string;
  name: string;
  team: string;
  role: string;
  creditPrice: number;
  imageUrl?: string;
  selected: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}
