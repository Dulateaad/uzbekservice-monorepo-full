export type FlowSubsection = 'popular' | 'paradox' | 'philosophy' | 'absurd' | 'fast' | 'gaming';
export type ChampionMode = 'elimination' | 'round-robin' | 'league';
export type KnowYourselfSubsection = 'love' | 'family' | 'character' | 'money' | 'lifestyle';

export type CardCategory = FlowSubsection | KnowYourselfSubsection | 'champion';

export interface VerdictCard {
  id: string;
  optionA: string;
  optionB: string;
  imageA?: string;
  imageB?: string;
  category: CardCategory;
  votesA: number;
  votesB: number;
  totalVotes: number;
  createdAt: number;
}

export interface VoteResult {
  choice: 'A' | 'B';
  percentA: number;
  percentB: number;
  totalVotes: number;
}
