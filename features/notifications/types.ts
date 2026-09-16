export interface LearningReminderSettings {
  enabled: boolean;
  timeHour: number; // 0-23 (e.g. 18 = 6 PM)
  timeMinute: number; // 0-59 (e.g. 0)
  timezone?: string;
  lastScheduledAt?: string;
}

export interface NotificationPayload {
  type: "learning_reminder";
  profileId?: string;
}

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

export interface ReminderMessageTemplate {
  id: string;
  titleKm: string;
  titleEn: string;
  bodyKm: string;
  bodyEn: string;
}
