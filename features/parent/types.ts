export interface ParentGateChallenge {
  numA: number;
  numB: number;
  operation: "+" | "x";
  expectedAnswer: number;
  promptKm: string;
  promptEn: string;
}

export interface ParentSettings {
  dailyTimeLimitMinutes: number; // 0 = unlimited
  soundEffectsEnabled: boolean;
  voiceoverEnabled: boolean;
  musicEnabled: boolean;
  parentPinHash?: string;
}
