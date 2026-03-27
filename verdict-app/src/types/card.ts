export type FlowSubsection =
  | 'popular'
  | 'people'
  | 'askPeople'
  | 'paradox'
  | 'philosophy'
  | 'absurd'
  | 'fast'
  | 'gaming';
export type ChampionMode = 'elimination' | 'round-robin' | 'league';
export type KnowYourselfSubsection = 'love' | 'family' | 'character' | 'money' | 'lifestyle';

export type CardCategory = FlowSubsection | KnowYourselfSubsection | 'champion';

export type CardStatus = 'pending' | 'published' | 'rejected' | 'hit';

export type GeoScope = 'global' | 'country' | 'city';

export interface VerdictCard {
  id: string;
  optionA: string;
  optionB: string;
  /** Ссылки на объекты (источник правды для картинок) */
  objectIdA?: string;
  objectIdB?: string;
  /** Кэш URL с сервера; если нет — подставляется из объектов */
  imageA?: string;
  imageB?: string;
  category: CardCategory;
  votesA: number;
  votesB: number;
  totalVotes: number;
  createdAt: number;
  status?: CardStatus;
  geoScope?: GeoScope;
  country?: string;
  city?: string;
  subcategory?: string;
  tags?: string[];
  qualityScore?: number;
  isBattleOfDay?: boolean;
  duplicateOf?: string;
}

export interface VoteResult {
  choice: 'A' | 'B';
  percentA: number;
  percentB: number;
  totalVotes: number;
}
