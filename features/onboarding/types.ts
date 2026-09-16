export type OnboardingStep = "language_selection" | "child_avatar" | "child_age" | "ready";

export interface OnboardingState {
  currentStep: OnboardingStep;
  selectedLocale?: string;
  selectedAvatar?: string;
  selectedAgeGroup?: string;
  isComplete: boolean;
}
