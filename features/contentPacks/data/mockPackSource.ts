import { ContentPackManifest } from "../types";
import { computeSha256Sync } from "../services/sha256";

export const MOCK_TINY_AUDIO_CONTENT = "AAC_DUMMY_AUDIO_DATA_FOR_TINY_TEST_PACK_M4A";
export const MOCK_TINY_IMAGE_CONTENT = "PNG_DUMMY_IMAGE_DATA_FOR_TINY_TEST_PACK_PNG";

export const MOCK_CURRICULUM_V1 = {
  world: {
    worldId: "world-tiny-test",
    worldNumber: 2,
    nameKm: "ដំណើរផ្សងព្រេងតូច",
    nameEn: "Tiny Test Adventure",
    theme: "angkor_jungle" as const,
    nodes: [
      {
        id: "node-tiny-1",
        order: 1,
        type: "lesson" as const,
        levelNumber: 1,
        lessonId: "tiny_001",
        titleKm: "ស្វាគមន៍តេស្ត",
        titleEn: "Tiny Hello",
        unlockRequirement: { type: "always_unlocked" as const },
      },
      {
        id: "node-tiny-2",
        order: 2,
        type: "lesson" as const,
        levelNumber: 2,
        lessonId: "tiny_002",
        titleKm: "រាប់ផ្កាយ",
        titleEn: "Counting Stars",
        unlockRequirement: { type: "complete_level" as const, levelNumber: 1 },
      },
    ],
  },
  lessons: {
    tiny_001: {
      id: "tiny_001",
      worldId: "world-tiny-test",
      levelNumber: 1,
      title: "Tiny Hello",
      titleKm: "ស្វាគមន៍តេស្ត",
      description: "Introductory tiny downloaded lesson",
      durationMinutes: 2,
      activities: [
        {
          id: "act_tiny_01",
          type: "listening" as const,
          instructionKm: "ស្តាប់ និងជ្រើសរើសផ្កាយ",
          instructionEn: "Listen and choose the star",
          audioKey: "audio_tiny_prompt",
          options: [
            { id: "opt_1", label: "Star", labelKm: "ផ្កាយ", isCorrect: true, imageKey: "img_tiny_star" },
            { id: "opt_2", label: "Moon", labelKm: "ព្រះច័ន្ទ", isCorrect: false },
          ],
        },
      ],
    },
    tiny_002: {
      id: "tiny_002",
      worldId: "world-tiny-test",
      levelNumber: 2,
      title: "Counting Stars",
      titleKm: "រាប់ផ្កាយ",
      description: "Count the downloaded stars",
      durationMinutes: 2,
      activities: [
        {
          id: "act_tiny_02",
          type: "tap_choice" as const,
          instructionKm: "តើមានផ្កាយប៉ុន្មាន?",
          instructionEn: "How many stars?",
          options: [
            { id: "opt_1", label: "1", isCorrect: true },
            { id: "opt_2", label: "2", isCorrect: false },
          ],
        },
      ],
    },
  },
};

export const MOCK_CURRICULUM_V2 = {
  world: {
    worldId: "world-tiny-test",
    worldNumber: 2,
    nameKm: "ដំណើរផ្សងព្រេងតូច (កំណែ ២)",
    nameEn: "Tiny Test Adventure v2",
    theme: "angkor_jungle" as const,
    nodes: [
      {
        id: "node-tiny-1",
        order: 1,
        type: "lesson" as const,
        levelNumber: 1,
        lessonId: "tiny_001",
        titleKm: "ស្វាគមន៍តេស្ត",
        titleEn: "Tiny Hello",
        unlockRequirement: { type: "always_unlocked" as const },
      },
      {
        id: "node-tiny-2",
        order: 2,
        type: "lesson" as const,
        levelNumber: 2,
        lessonId: "tiny_002",
        titleKm: "រាប់ផ្កាយ",
        titleEn: "Counting Stars",
        unlockRequirement: { type: "complete_level" as const, levelNumber: 1 },
      },
      {
        id: "node-tiny-3",
        order: 3,
        type: "lesson" as const,
        levelNumber: 3,
        lessonId: "tiny_003",
        titleKm: "ព្រៃវេទមន្ត",
        titleEn: "Magic Forest",
        unlockRequirement: { type: "complete_level" as const, levelNumber: 2 },
      },
    ],
  },
  lessons: {
    ...MOCK_CURRICULUM_V1.lessons,
    tiny_003: {
      id: "tiny_003",
      worldId: "world-tiny-test",
      levelNumber: 3,
      title: "Magic Forest",
      titleKm: "ព្រៃវេទមន្ត",
      description: "Explore the new forest level in v2",
      durationMinutes: 2,
      activities: [
        {
          id: "act_tiny_03",
          type: "tap_choice" as const,
          instructionKm: "ជ្រើសរើសផ្កាយវេទមន្ត",
          instructionEn: "Choose the magic star",
          options: [
            { id: "opt_1", label: "Magic Star", isCorrect: true, imageKey: "img_tiny_star" },
            { id: "opt_2", label: "Rock", isCorrect: false },
          ],
        },
      ],
    },
  },
};

export const MOCK_CURRICULUM_V1_STRING = JSON.stringify(MOCK_CURRICULUM_V1, null, 2);
export const MOCK_CURRICULUM_V2_STRING = JSON.stringify(MOCK_CURRICULUM_V2, null, 2);

export const HASH_TINY_AUDIO = computeSha256Sync(MOCK_TINY_AUDIO_CONTENT);
export const HASH_TINY_IMAGE = computeSha256Sync(MOCK_TINY_IMAGE_CONTENT);
export const HASH_CURRICULUM_V1 = computeSha256Sync(MOCK_CURRICULUM_V1_STRING);
export const HASH_CURRICULUM_V2 = computeSha256Sync(MOCK_CURRICULUM_V2_STRING);

function getByteLength(str: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).length;
  }
  return str.length;
}

export const MOCK_TINY_TEST_MANIFEST_V1: ContentPackManifest = {
  id: "tiny-test-adventure",
  version: 1,
  contentVersion: 1,
  title: {
    km: "ដំណើរផ្សងព្រេងតូច",
    en: "Tiny Test Adventure",
  },
  description: {
    km: "ដំណើរផ្សងព្រេងសាកល្បងជាមួយមេរៀនសប្បាយៗ!",
    en: "A tiny adventure testing downloadable content packs!",
  },
  worldId: "world-tiny-test",
  trackId: "track-tiny-test",
  theme: "angkor_jungle",
  ageBands: ["explorer", "adventurer", "champion"],
  estimatedSizeBytes: 2801,
  curriculumFile: {
    path: "curriculum.json",
    sizeBytes: getByteLength(MOCK_CURRICULUM_V1_STRING),
    checksum: HASH_CURRICULUM_V1,
  },
  assets: [
    {
      key: "audio_tiny_prompt",
      type: "audio",
      path: "audio/tiny_prompt.m4a",
      sizeBytes: getByteLength(MOCK_TINY_AUDIO_CONTENT),
      checksum: HASH_TINY_AUDIO,
      required: true,
    },
    {
      key: "img_tiny_star",
      type: "image",
      path: "images/tiny_star.png",
      sizeBytes: getByteLength(MOCK_TINY_IMAGE_CONTENT),
      checksum: HASH_TINY_IMAGE,
      required: true,
    },
  ],
  checksum: computeSha256Sync(
    `tiny-test-adventure-v1-${HASH_CURRICULUM_V1}-${HASH_TINY_AUDIO}-${HASH_TINY_IMAGE}`
  ),
  requiredAppVersion: "1.0.0",
};

export const MOCK_TINY_TEST_MANIFEST_V2: ContentPackManifest = {
  ...MOCK_TINY_TEST_MANIFEST_V1,
  version: 2,
  contentVersion: 2,
  title: {
    km: "ដំណើរផ្សងព្រេងតូច (កំណែ ២)",
    en: "Tiny Test Adventure v2",
  },
  curriculumFile: {
    path: "curriculum.json",
    sizeBytes: getByteLength(MOCK_CURRICULUM_V2_STRING),
    checksum: HASH_CURRICULUM_V2,
  },
  checksum: computeSha256Sync(
    `tiny-test-adventure-v2-${HASH_CURRICULUM_V2}-${HASH_TINY_AUDIO}-${HASH_TINY_IMAGE}`
  ),
};

export interface IPackSource {
  listAvailablePacks(): Promise<ContentPackManifest[]>;
  getPackManifest(packId: string): Promise<ContentPackManifest | null>;
  fetchPackFile(packId: string, relativePath: string, version?: number): Promise<string>;
}

export class MockPackSource implements IPackSource {
  private activeVersion: number = 1;
  private networkLatencyMs: number = 10;
  private networkFailure: boolean = false;
  private shouldCorruptNextFile: boolean = false;

  public setVersion(v: number) {
    this.activeVersion = v;
  }

  public setNetworkLatency(ms: number) {
    this.networkLatencyMs = ms;
  }

  public setNetworkFailure(fail: boolean) {
    this.networkFailure = fail;
  }

  public corruptNextFile(corrupt: boolean) {
    this.shouldCorruptNextFile = corrupt;
  }

  async listAvailablePacks(): Promise<ContentPackManifest[]> {
    if (this.networkFailure) throw new Error("Network request failed");
    return [
      this.activeVersion === 2
        ? MOCK_TINY_TEST_MANIFEST_V2
        : MOCK_TINY_TEST_MANIFEST_V1,
    ];
  }

  async getPackManifest(packId: string): Promise<ContentPackManifest | null> {
    if (this.networkFailure) throw new Error("Network request failed");
    if (packId === "tiny-test-adventure") {
      return this.activeVersion === 2
        ? MOCK_TINY_TEST_MANIFEST_V2
        : MOCK_TINY_TEST_MANIFEST_V1;
    }
    return null;
  }

  async fetchPackFile(
    packId: string,
    relativePath: string,
    version?: number
  ): Promise<string> {
    if (this.networkFailure) throw new Error("Network request failed");
    if (this.networkLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.networkLatencyMs));
    }

    if (this.shouldCorruptNextFile) {
      this.shouldCorruptNextFile = false;
      return "CORRUPTED_DATA_INTENTIONALLY_INJECTED_FOR_INTEGRITY_CHECK";
    }

    const v = version ?? this.activeVersion;

    if (relativePath === "curriculum.json") {
      return v === 2 ? MOCK_CURRICULUM_V2_STRING : MOCK_CURRICULUM_V1_STRING;
    }
    if (relativePath === "audio/tiny_prompt.m4a") {
      return MOCK_TINY_AUDIO_CONTENT;
    }
    if (relativePath === "images/tiny_star.png") {
      return MOCK_TINY_IMAGE_CONTENT;
    }

    throw new Error(`404 Not Found: ${relativePath} in pack ${packId}`);
  }
}

export const defaultMockPackSource = new MockPackSource();
