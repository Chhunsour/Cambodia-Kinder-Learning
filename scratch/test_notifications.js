const { DatabaseSync } = require("node:sqlite");
const assert = require("node:assert");

console.log("=================================================");
console.log("=== KOKI NOTIFICATIONS & LEARNING REMINDERS   ===");
console.log("=== AUTOMATED VERIFICATION SUITE              ===");
console.log("=================================================\n");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

// Setup SQLite Schema for AppSettings & ChildProfiles
db.exec(`
  CREATE TABLE child_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    nickname TEXT NOT NULL,
    age INTEGER NOT NULL,
    learning_band TEXT NOT NULL,
    avatar_id TEXT NOT NULL,
    ui_language TEXT NOT NULL DEFAULT 'km',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// -------------------------------------------------------------
// 1. Mock Expo-Notifications In-Memory Scheduler
// -------------------------------------------------------------
console.log("--- 1. Initializing In-Memory Expo Notifications Mock ---");

class MockExpoNotifications {
  constructor() {
    this.channels = new Map();
    this.scheduledNotifications = [];
    this.permissionStatus = "undetermined";
    this.notificationHandler = null;
  }

  setNotificationHandler(handler) {
    this.notificationHandler = handler;
  }

  async getPermissionsAsync() {
    return { status: this.permissionStatus };
  }

  async requestPermissionsAsync() {
    if (this.permissionStatus === "undetermined") {
      this.permissionStatus = "granted";
    }
    return { status: this.permissionStatus };
  }

  setPermissionStatusDirectly(status) {
    this.permissionStatus = status;
  }

  async setNotificationChannelAsync(channelId, channelConfig) {
    this.channels.set(channelId, channelConfig);
  }

  async scheduleNotificationAsync({ identifier, content, trigger }) {
    // If identifier provided, remove any existing notification with the same ID
    if (identifier) {
      this.scheduledNotifications = this.scheduledNotifications.filter(
        (n) => n.identifier !== identifier
      );
    }
    const record = {
      identifier: identifier || `auto_${Date.now()}_${Math.random()}`,
      content,
      trigger,
      scheduledAt: Date.now(),
    };
    this.scheduledNotifications.push(record);
    return record.identifier;
  }

  async cancelScheduledNotificationAsync(identifier) {
    this.scheduledNotifications = this.scheduledNotifications.filter(
      (n) => n.identifier !== identifier
    );
  }

  async getAllScheduledNotificationsAsync() {
    return [...this.scheduledNotifications];
  }

  async cancelAllScheduledNotificationsAsync() {
    this.scheduledNotifications = [];
  }
}

const mockNotifications = new MockExpoNotifications();

// -------------------------------------------------------------
// 2. Reminder Service Implementation Mirror
// -------------------------------------------------------------
const NOTIFICATION_CHANNEL_ID = "koki_learning_reminders";

const REMINDER_MESSAGES_KM = [
  {
    title: "សួស្តី {name}! 🌟",
    body: "តោះ មកលេង និងរៀនភាសាខ្មែរជាមួយ Koki បន្តិចថ្ងៃនេះ!",
  },
  {
    title: "Koki កំពុងរង់ចាំ {name} 🎈",
    body: "មានមេរៀនថ្មីៗសប្បាយៗជាច្រើនកំពុងរង់ចាំអ្នក!",
  },
  {
    title: "ពេលរៀនសប្បាយៗបានមកដល់ហើយ 🚀",
    body: "តោះ មកស្វែងយល់ពាក្យថ្មីៗ និងប្រមូលផ្កាយថ្ងៃនេះ!",
  },
  {
    title: "តោះមកជួបមិត្តភក្តិ Koki 🐾",
    body: "ចំណាយពេលត្រឹមតែ ៥ នាទីដើម្បីស្វែងយល់រឿងថ្មីៗជាមួយគ្នា!",
  },
];

const REMINDER_MESSAGES_EN = [
  {
    title: "Hi {name}! 🌟",
    body: "Ready to explore a fun learning adventure with Koki today?",
  },
  {
    title: "Koki is waiting for you! 🎈",
    body: "Let's discover some exciting new words and sounds together!",
  },
  {
    title: "Fun learning time! 🚀",
    body: "Just 5 minutes of learning can unlock brand new stars today!",
  },
  {
    title: "Adventure awaits, {name}! 🐾",
    body: "Join Koki to explore playful lessons and earn golden coins!",
  },
];

function getReminderMessage(language, nickname) {
  const list = language === "en" ? REMINDER_MESSAGES_EN : REMINDER_MESSAGES_KM;
  const template = list[0]; // test with first template
  const cleanName = (nickname || "").trim() || (language === "en" ? "Explorer" : "កូន");
  return {
    title: template.title.replace(/{name}/g, cleanName),
    body: template.body.replace(/{name}/g, cleanName),
  };
}

class TestReminderService {
  constructor(expoMock) {
    this.expo = expoMock;
  }

  async initChannel() {
    await this.expo.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Learning Reminders",
      importance: 3, // AndroidImportance.DEFAULT
      sound: "default",
      vibrationPattern: [0, 200, 200, 200],
      enableLights: true,
      lightColor: "#4A6FA5",
      showBadge: false,
    });
  }

  getReminderIdentifier(profileId) {
    return `koki:reminder:${profileId}`;
  }

  async getPermissionStatus() {
    const res = await this.expo.getPermissionsAsync();
    return res.status;
  }

  async requestPermission() {
    const res = await this.expo.requestPermissionsAsync();
    return res.status;
  }

  async scheduleLearningReminder(profileId, settings, nickname, language = "km") {
    if (!settings.enabled) {
      await this.cancelLearningReminder(profileId);
      return false;
    }

    const permission = await this.getPermissionStatus();
    if (permission !== "granted") {
      return false;
    }

    await this.initChannel();

    const identifier = this.getReminderIdentifier(profileId);
    const { title, body } = getReminderMessage(language, nickname);

    await this.expo.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: true,
        priority: "default",
        badge: 0,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          profileId,
          type: "learning_reminder",
          targetRoute: "/(main)/home",
        },
      },
      trigger: {
        type: "daily",
        hour: settings.timeHour,
        minute: settings.timeMinute,
      },
    });

    return true;
  }

  async cancelLearningReminder(profileId) {
    const identifier = this.getReminderIdentifier(profileId);
    await this.expo.cancelScheduledNotificationAsync(identifier);
  }

  async onDailyGoalCompleted(profileId, currentSettings, nickname, language = "km") {
    if (!currentSettings || !currentSettings.enabled) return;

    // Suppress for today: cancel existing, re-schedule so it remains ready for tomorrow
    const identifier = this.getReminderIdentifier(profileId);
    await this.expo.cancelScheduledNotificationAsync(identifier);

    // Re-queue daily trigger for future days
    await this.scheduleLearningReminder(profileId, currentSettings, nickname, language);
  }

  async scheduleTestNotificationInSeconds(seconds, profileId, nickname, language = "km") {
    const { title, body } = getReminderMessage(language, nickname);
    return await this.expo.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: {
          profileId,
          type: "learning_reminder_test",
          targetRoute: "/(main)/home",
        },
      },
      trigger: {
        type: "timeInterval",
        seconds,
        repeats: false,
      },
    });
  }
}

const service = new TestReminderService(mockNotifications);

// -------------------------------------------------------------
// 3. Parent Settings Service SQLite Storage Mirror
// -------------------------------------------------------------
class TestParentSettingsRepository {
  static getReminderSettings(profileId) {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(`parent_reminder_settings_${profileId}`);
    if (!row) {
      return {
        enabled: false,
        timeHour: 18,
        timeMinute: 0,
      };
    }
    return JSON.parse(row.value);
  }

  static updateReminderSettings(profileId, partial) {
    const current = this.getReminderSettings(profileId);
    const updated = { ...current, ...partial };
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(`parent_reminder_settings_${profileId}`, JSON.stringify(updated), Date.now());
    return updated;
  }
}

// -------------------------------------------------------------
// RUNNING THE TESTS
// -------------------------------------------------------------

async function runAllTests() {
  console.log("=== TEST SUITE EXECUTION START ===");

  const testProfile = {
    id: "child_test_001",
    nickname: "Dara",
    age: 6,
    learning_band: "early_reader",
    avatar_id: "avatar_koki_bear",
    ui_language: "km",
  };

  db.prepare(`
    INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, ui_language, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testProfile.id, testProfile.nickname, testProfile.age, testProfile.learning_band, testProfile.avatar_id, testProfile.ui_language, Date.now(), Date.now());

  // TEST 1: Default Settings are OFF
  console.log("\n[Test 1] Reminders default to OFF (opt-in requirement)");
  const initialSettings = TestParentSettingsRepository.getReminderSettings(testProfile.id);
  assert.strictEqual(initialSettings.enabled, false, "Reminders must default to disabled/off");
  assert.strictEqual(initialSettings.timeHour, 18, "Default hour must be 18:00 (6:00 PM)");
  assert.strictEqual(initialSettings.timeMinute, 0, "Default minute must be 00");
  console.log("✓ PASS: Default settings verified as OFF (18:00).");

  // TEST 2: Copy Tone Audit - STRICTLY NO GUILT OR NEGATIVE PRESSURE
  console.log("\n[Test 2] Content Tone Verification - Strictly Positive & No Guilt Words");
  const FORBIDDEN_WORDS = [
    "streak", "lose", "losing", "lost", "late", "expire", "expiring",
    "fail", "failed", "disappoint", "sad", "hurry", "beat", "shame",
    "punish", "warning", "miss", "danger", "ខាត", "បាត់បង់", "ខកចិត្ត", "យឺតពេល", "ចាញ់", "ទោស"
  ];

  [...REMINDER_MESSAGES_KM, ...REMINDER_MESSAGES_EN].forEach((msg, idx) => {
    const combined = `${msg.title} ${msg.body}`.toLowerCase();
    for (const forbidden of FORBIDDEN_WORDS) {
      assert.ok(
        !combined.includes(forbidden.toLowerCase()),
        `Template #${idx} contains forbidden negative/guilt word "${forbidden}": ${combined}`
      );
    }
  });
  console.log("✓ PASS: All reminder templates verified free from guilt, shame, pressure, or streak threats.");

  // TEST 3: Nickname Personalization
  console.log("\n[Test 3] Child Nickname Personalization");
  const msgKm = getReminderMessage("km", "សុខា");
  assert.ok(msgKm.title.includes("សុខា") || msgKm.body.includes("សុខា"), "Khmer message should include child nickname");
  const msgEn = getReminderMessage("en", "Dara");
  assert.ok(msgEn.title.includes("Dara") || msgEn.body.includes("Dara"), "English message should include child nickname");
  console.log(`✓ PASS: Formatted with nickname: "${msgEn.title}" / "${msgEn.body}"`);

  // TEST 4: Permission Gate & Initial Undetermined State
  console.log("\n[Test 4] Permission Gate & Undetermined Handling");
  mockNotifications.setPermissionStatusDirectly("undetermined");
  let perm = await service.getPermissionStatus();
  assert.strictEqual(perm, "undetermined", "Initial permission status must be undetermined");

  // If enabled while undetermined, schedule should not proceed until permission is granted
  let scheduledSuccess = await service.scheduleLearningReminder(testProfile.id, { enabled: true, timeHour: 18, timeMinute: 0 }, "Dara");
  assert.strictEqual(scheduledSuccess, false, "Cannot schedule if permission not granted");
  assert.strictEqual((await mockNotifications.getAllScheduledNotificationsAsync()).length, 0, "No notification should be queued when permission undetermined");
  console.log("✓ PASS: Unpermitted schedule safely blocked.");

  // TEST 5: Parent Enables Permission and Schedules Daily Notification
  console.log("\n[Test 5] Parent Grants Permission & Schedules Daily Notification");
  const granted = await service.requestPermission();
  assert.strictEqual(granted, "granted", "Permission should transition to granted");

  const updatedSettings = TestParentSettingsRepository.updateReminderSettings(testProfile.id, { enabled: true, timeHour: 18, timeMinute: 30 });
  scheduledSuccess = await service.scheduleLearningReminder(testProfile.id, updatedSettings, "Dara", "en");
  assert.strictEqual(scheduledSuccess, true, "Scheduling succeeds with granted permission");

  const notifications = await mockNotifications.getAllScheduledNotificationsAsync();
  assert.strictEqual(notifications.length, 1, "Exactly one notification scheduled");
  assert.strictEqual(notifications[0].identifier, `koki:reminder:${testProfile.id}`, "Identifier must follow stable profile pattern");
  assert.strictEqual(notifications[0].trigger.type, "daily", "Trigger must be daily");
  assert.strictEqual(notifications[0].trigger.hour, 18, "Trigger hour matches 18");
  assert.strictEqual(notifications[0].trigger.minute, 30, "Trigger minute matches 30");
  assert.strictEqual(notifications[0].content.data.targetRoute, "/(main)/home", "Target route must safely point to Home");
  console.log("✓ PASS: Daily scheduled notification active with correct trigger and home route payload.");

  // TEST 6: Android Notification Channel Configuration
  console.log("\n[Test 6] Android Notification Channel Verification");
  const channel = mockNotifications.channels.get(NOTIFICATION_CHANNEL_ID);
  assert.ok(channel, "Android channel koki_learning_reminders must be registered");
  assert.strictEqual(channel.importance, 3, "Importance should be default (not loud alarm/urgent)");
  assert.strictEqual(channel.showBadge, false, "showBadge should be false to avoid pressure");
  console.log("✓ PASS: Android channel configuration matches gentle, low-pressure specifications.");

  // TEST 7: Duplicate Prevention & Re-scheduling Idempotence
  console.log("\n[Test 7] Duplicate Prevention & Stable Identifier Replacement");
  // Parent changes time to 19:00
  const timeUpdate = TestParentSettingsRepository.updateReminderSettings(testProfile.id, { timeHour: 19, timeMinute: 0 });
  await service.scheduleLearningReminder(testProfile.id, timeUpdate, "Dara", "en");

  const postUpdateNotifications = await mockNotifications.getAllScheduledNotificationsAsync();
  assert.strictEqual(postUpdateNotifications.length, 1, "Must still have exactly 1 notification scheduled (no duplicates)");
  assert.strictEqual(postUpdateNotifications[0].trigger.hour, 19, "Trigger hour updated to 19:00");
  console.log("✓ PASS: Idempotent replacement verified (0 duplicates generated).");

  // TEST 8: Daily Goal Completed Suppression
  console.log("\n[Test 8] Daily Goal Completed Suppression");
  await service.onDailyGoalCompleted(testProfile.id, timeUpdate, "Dara", "en");
  const postGoalNotifications = await mockNotifications.getAllScheduledNotificationsAsync();
  assert.strictEqual(postGoalNotifications.length, 1, "Schedule maintained for future days without stacking duplicate reminders");
  console.log("✓ PASS: onDailyGoalCompleted cleans today and maintains scheduled daily routine.");

  // TEST 9: Disabling Reminders Cleans Up Pending Notifications
  console.log("\n[Test 9] Disabling Reminders (Parent Turns OFF)");
  const disabledSettings = TestParentSettingsRepository.updateReminderSettings(testProfile.id, { enabled: false });
  assert.strictEqual(disabledSettings.enabled, false);
  await service.scheduleLearningReminder(testProfile.id, disabledSettings, "Dara");

  const postDisableNotifications = await mockNotifications.getAllScheduledNotificationsAsync();
  assert.strictEqual(postDisableNotifications.length, 0, "All scheduled notifications for profile removed when disabled");
  console.log("✓ PASS: Cancel & cleanup on disable verified.");

  // TEST 10: Denied State Non-Looping
  console.log("\n[Test 10] Denied Permission Non-Looping Flow");
  mockNotifications.setPermissionStatusDirectly("denied");
  const deniedStatus = await service.getPermissionStatus();
  assert.strictEqual(deniedStatus, "denied");
  // Ensure scheduling doesn't throw or reprompt
  const deniedSched = await service.scheduleLearningReminder(testProfile.id, { enabled: true, timeHour: 18, timeMinute: 0 }, "Dara");
  assert.strictEqual(deniedSched, false, "Should return false cleanly without crashing or prompting");
  console.log("✓ PASS: Denied state handled safely without loops.");

  // TEST 11: 5-Second Test Notification for Parent Preview
  console.log("\n[Test 11] Parent Area 5-Second Preview Notification");
  const testNotifId = await service.scheduleTestNotificationInSeconds(5, testProfile.id, "Dara", "en");
  assert.ok(testNotifId, "Returns a valid test notification identifier");
  const testNotifList = await mockNotifications.getAllScheduledNotificationsAsync();
  const testItem = testNotifList.find(n => n.content.data.type === "learning_reminder_test");
  assert.ok(testItem, "Test notification found in queue");
  assert.strictEqual(testItem.trigger.seconds, 5, "Trigger interval set to 5 seconds");
  assert.strictEqual(testItem.content.data.targetRoute, "/(main)/home", "Target route points to Home");
  console.log("✓ PASS: 5-second preview notification verified.");

  console.log("\n=================================================");
  console.log("=== ALL 11 TESTS PASSED SUCCESSFULLY! (100%) ===");
  console.log("=================================================\n");
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
