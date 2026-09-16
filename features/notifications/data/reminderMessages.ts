import { ReminderMessageTemplate } from "../types";

/**
 * Curated, child-friendly library of deterministic reminder messages.
 *
 * Core Philosophy:
 * - 100% Positive & Encouraging
 * - ZERO Guilt, ZERO Shame, ZERO Urgency
 * - No streak countdowns, no competitor comparisons, no "Koki is sad"
 */
export const APPROVED_REMINDER_TEMPLATES: ReminderMessageTemplate[] = [
  {
    id: "adventure_ready",
    titleKm: "កូគីរៀនសប្បាយ 🐯",
    titleEn: "Koki Adventure 🐯",
    bodyKm: "កូគីត្រៀមខ្លួនសម្រាប់ដំណើរផ្សងព្រេងថ្មី!",
    bodyEn: "Koki is ready for another adventure!",
  },
  {
    id: "learning_tree",
    titleKm: "ដើមឈើចំណេះដឹង 🌳",
    titleEn: "Learning Tree 🌳",
    bodyKm: "តោះមកបណ្តុះដើមឈើចំណេះដឹងថ្ងៃនេះទាំងអស់គ្នា!",
    bodyEn: "Ready to grow today's learning tree?",
  },
  {
    id: "little_adventure",
    titleKm: "ដំណើរផ្សងព្រេង 🌟",
    titleEn: "Little Adventure 🌟",
    bodyKm: "ដំណើរផ្សងព្រេងរៀនសូត្រតូចមួយកំពុងរង់ចាំប្អូន!",
    bodyEn: "A little learning adventure is waiting for you!",
  },
  {
    id: "learn_together",
    titleKm: "រៀនសប្បាយជាមួយកូគី 🐯",
    titleEn: "Learn with Koki 🐯",
    bodyKm: "កូគីត្រៀមខ្លួនរៀនជាមួយប្អូនហើយ!",
    bodyEn: "Koki is ready to learn with you!",
  },
  {
    id: "fun_quest",
    titleKm: "ដំណើរស្វែងរកថ្មី ✨",
    titleEn: "Fun Quest ✨",
    bodyKm: "តើប្អូនត្រៀមខ្លួនសម្រាប់ដំណើរផ្សងព្រេងជាមួយកូគីហើយឬនៅ?",
    bodyEn: "Ready for a little adventure with Koki?",
  },
];

/**
 * Formats notification copy with optional child nickname personalization.
 * If nickname is provided, prepends naturally without sounding robotic.
 */
export function formatReminderMessage(
  template: ReminderMessageTemplate,
  locale: "km" | "en" = "km",
  nickname?: string
): { title: string; body: string } {
  const isKm = locale === "km";
  const title = isKm ? template.titleKm : template.titleEn;
  const baseBody = isKm ? template.bodyKm : template.bodyEn;

  const cleanName = nickname?.trim();
  if (!cleanName) {
    return { title, body: baseBody };
  }

  // Khmer personalization: "[ឈ្មោះ], [សារ]"
  // English personalization: "[Name], [message]"
  const personalizedBody = isKm
    ? `${cleanName}, ${baseBody}`
    : `${cleanName}, ${baseBody.charAt(0).toLowerCase()}${baseBody.slice(1)}`;

  return {
    title,
    body: personalizedBody,
  };
}

/**
 * Get a deterministic or pseudo-random approved reminder message.
 */
export function getReminderMessage(
  locale: "km" | "en" = "km",
  nickname?: string,
  templateIndex: number = 0
): { title: string; body: string } {
  const idx = Math.abs(templateIndex) % APPROVED_REMINDER_TEMPLATES.length;
  const template = APPROVED_REMINDER_TEMPLATES[idx];
  return formatReminderMessage(template, locale, nickname);
}
