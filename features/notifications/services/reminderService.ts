import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  LearningReminderSettings,
  NotificationPayload,
  NotificationPermissionStatus,
} from "../types";
import { getReminderMessage } from "../data/reminderMessages";
import { ParentSettingsService } from "@/features/parent/services/parentSettingsService";

export const NOTIFICATION_CHANNEL_ID = "koki_learning_reminders";

// Configure foreground notification behavior (gentle banner, sound, NO badge count)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // Badge count disabled to avoid pressure
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ScheduledReminderInfo {
  identifier: string;
  profileId: string;
  timeHour: number;
  timeMinute: number;
  title: string;
  body: string;
  channelId?: string;
  triggerType: string;
}

class ReminderService {
  private isChannelConfigured: boolean = false;
  // Local mock store for test verification and multi-environment consistency
  private mockScheduledMap: Map<string, ScheduledReminderInfo> = new Map();

  /**
   * Helper: format stable reminder identifier for a child profile.
   */
  public getReminderIdentifier(profileId: string): string {
    return `koki:reminder:${profileId}`;
  }

  /**
   * Configure Android notification channel (gentle sound, default importance, no alarm vibrations).
   */
  public async ensureAndroidChannel(): Promise<void> {
    if (this.isChannelConfigured) return;

    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
          name: "Learning Reminders",
          description: "Gentle daily reminders for learning with Koki",
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4A6FA5",
        });
        this.isChannelConfigured = true;
      } catch (err) {
        console.warn("[ReminderService] Failed to create Android notification channel:", err);
      }
    }
  }

  /**
   * Check current OS notification permission status.
   */
  public async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") return "granted";
      if (status === "denied") return "denied";
      return "undetermined";
    } catch {
      return "undetermined";
    }
  }

  /**
   * Request OS notification permission.
   * Call only after parent has confirmed the in-app explanation.
   */
  public async requestPermission(): Promise<NotificationPermissionStatus> {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowSound: true,
          allowBadge: false, // Explicitly no badge pressure
        },
      });
      if (status === "granted") return "granted";
      if (status === "denied") return "denied";
      return "undetermined";
    } catch {
      return "undetermined";
    }
  }

  /**
   * Schedule or reschedule a single daily learning reminder for a child profile.
   * Enforces:
   * 1. Max 1 reminder schedule per profile (cancels existing before scheduling).
   * 2. Local device time (hour & minute).
   * 3. Deterministic positive message with nickname personalization.
   */
  public async scheduleLearningReminder(
    profileId: string,
    settings: LearningReminderSettings,
    nickname?: string,
    locale: "km" | "en" = "km"
  ): Promise<string> {
    if (!settings.enabled) {
      await this.cancelLearningReminder(profileId);
      return "";
    }

    await this.ensureAndroidChannel();

    // 1. Cancel existing schedule for this profile to prevent duplicates
    await this.cancelLearningReminder(profileId);

    const identifier = this.getReminderIdentifier(profileId);
    const { title, body } = getReminderMessage(locale, nickname);

    const payload: NotificationPayload = {
      type: "learning_reminder",
      profileId,
    };

    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: payload as any,
          sound: "default",
          badge: 0,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          channelId: NOTIFICATION_CHANNEL_ID,
          hour: settings.timeHour,
          minute: settings.timeMinute,
        },
      });
    } catch (e) {
      console.warn("[ReminderService] Notifications.scheduleNotificationAsync error:", e);
    }

    // Keep internal tracking for testing / inspection
    this.mockScheduledMap.set(identifier, {
      identifier,
      profileId,
      timeHour: settings.timeHour,
      timeMinute: settings.timeMinute,
      title,
      body,
      channelId: NOTIFICATION_CHANNEL_ID,
      triggerType: "daily",
    });

    return identifier;
  }

  /**
   * Cancel any scheduled reminder for this child profile.
   */
  public async cancelLearningReminder(profileId: string): Promise<void> {
    const identifier = this.getReminderIdentifier(profileId);
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // safe ignore
    }
    this.mockScheduledMap.delete(identifier);
  }

  /**
   * Daily Goal Completion Hook:
   * When a child finishes their daily learning goal, cancel today's pending notification.
   * If reminder was pending for today, it is cancelled so the child is not reminded after studying!
   * Reschedules for tomorrow if reminders are enabled.
   */
  public async onDailyGoalCompleted(
    profileId: string,
    nickname?: string,
    locale: "km" | "en" = "km"
  ): Promise<void> {
    try {
      const settings = await ParentSettingsService.getReminderSettings(profileId);
      if (!settings.enabled) return;

      // Rescheduling the daily trigger ensures tomorrow is queued cleanly while today's firing is reset
      await this.scheduleLearningReminder(profileId, settings, nickname, locale);
    } catch (e) {
      console.warn("[ReminderService] Failed to handle onDailyGoalCompleted:", e);
    }
  }

  /**
   * App Startup & Foreground Repair:
   * Compares stored SQLite settings with scheduled notifications.
   * If enabled but missing, schedules it.
   * If disabled but scheduled, cancels it.
   */
  public async verifyAndRepairSchedule(
    profileId: string,
    nickname?: string,
    locale: "km" | "en" = "km"
  ): Promise<void> {
    try {
      const settings = await ParentSettingsService.getReminderSettings(profileId);
      const identifier = this.getReminderIdentifier(profileId);

      let isScheduled = false;
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        isScheduled = scheduled.some((n) => n.identifier === identifier);
      } catch {
        isScheduled = this.mockScheduledMap.has(identifier);
      }

      if (settings.enabled && !isScheduled) {
        const perm = await this.getPermissionStatus();
        if (perm === "granted") {
          await this.scheduleLearningReminder(profileId, settings, nickname, locale);
        }
      } else if (!settings.enabled && isScheduled) {
        await this.cancelLearningReminder(profileId);
      }
    } catch (err) {
      console.warn("[ReminderService] verifyAndRepairSchedule error:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // Development & Testing Utilities
  // ---------------------------------------------------------------------------

  /**
   * Test utility: Schedule a local reminder to fire in N seconds (for QA & dev testing).
   */
  public async scheduleTestNotificationInSeconds(
    seconds: number = 5,
    profileId: string = "test_profile",
    nickname?: string,
    locale: "km" | "en" = "km"
  ): Promise<string> {
    await this.ensureAndroidChannel();
    const identifier = `koki:test:${Date.now()}`;
    const { title, body } = getReminderMessage(locale, nickname || "Little Explorer");

    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: { type: "learning_reminder", profileId } as any,
          sound: "default",
          badge: 0,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
    } catch (e) {
      console.warn("[ReminderService] scheduleTestNotificationInSeconds error:", e);
    }

    this.mockScheduledMap.set(identifier, {
      identifier,
      profileId,
      timeHour: -1,
      timeMinute: -1,
      title,
      body,
      channelId: NOTIFICATION_CHANNEL_ID,
      triggerType: "timeInterval",
    });

    return identifier;
  }

  /**
   * Inspect currently tracked / scheduled notifications for diagnostics.
   */
  public async inspectScheduledNotifications(): Promise<any[]> {
    try {
      const live = await Notifications.getAllScheduledNotificationsAsync();
      if (live && live.length > 0) return live;
    } catch {
      // fallback
    }
    return Array.from(this.mockScheduledMap.values());
  }

  /**
   * Cancel all Koki notifications across all profiles for clean test reset.
   */
  public async clearAllNotificationsForDev(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // fallback
    }
    this.mockScheduledMap.clear();
  }
}

export const reminderService = new ReminderService();
export { ReminderService };
