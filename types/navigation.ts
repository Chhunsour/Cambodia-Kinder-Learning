/**
 * Navigation Type Definitions for Expo Router
 */
export type AppRoute =
  | "/"
  | "/(onboarding)"
  | "/(main)/home"
  | "/(main)/adventure"
  | "/(main)/koki"
  | "/(main)/collection"
  | `/lesson/${string}`
  | `/result/${string}`
  | "/reward"
  | "/parent"
  | "/design-system";

export interface NavigationStateItem {
  name: string;
  key: string;
  path?: string;
}
