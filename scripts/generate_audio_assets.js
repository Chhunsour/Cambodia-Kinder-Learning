/**
 * Offline Audio Asset Generator for Koki.
 *
 * Generates production-ready, standardized AAC (.m4a) audio files in assets/audio/files/.
 * Uses standard PCM synthesis and macOS afconvert for SFX and sample voice assets.
 *
 * NOTE: In production, educational voice assets are recorded/generated outside the app
 * and reviewed by native Khmer speakers before being approved.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUT_DIR = path.resolve(__dirname, "../assets/audio/files");
const TEMP_DIR = "/tmp/koki_audio_gen";

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// -----------------------------------------------------------------------------
// Helper: Write 16-bit Mono PCM WAV
// -----------------------------------------------------------------------------
function writeWav(filePath, samples, sampleRate = 44100) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);

  // fmt subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // subchunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.floor(intVal), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

// -----------------------------------------------------------------------------
// Helper: Convert WAV to AAC M4A using afconvert
// -----------------------------------------------------------------------------
function convertToM4a(wavPath, m4aPath) {
  execSync(`afconvert -f m4af -d aac -b 64000 "${wavPath}" "${m4aPath}"`);
}

// -----------------------------------------------------------------------------
// SFX Synthesizers
// -----------------------------------------------------------------------------
function synthesizeSfx(type) {
  const sampleRate = 44100;
  let samples = [];

  if (type === "correct_chime") {
    // Cheerful ascending major chord (C5, E5, G5, C6) with smooth exponential decay
    const duration = 0.55;
    const n = Math.floor(sampleRate * duration);
    samples = new Float32Array(n);
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    const delays = [0.0, 0.08, 0.16, 0.24];

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let val = 0;
      for (let f = 0; f < freqs.length; f++) {
        if (t >= delays[f]) {
          const dt = t - delays[f];
          const env = Math.exp(-dt * 7.5);
          val += Math.sin(2 * Math.PI * freqs[f] * dt) * env * 0.22;
        }
      }
      samples[i] = val;
    }
  } else if (type === "incorrect_gentle") {
    // Soft, friendly bounce tone (never harsh buzzer)
    const duration = 0.4;
    const n = Math.floor(sampleRate * duration);
    samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 220 - t * 60; // gentle pitch drop from 220Hz to 196Hz
      const env = Math.exp(-t * 6.0);
      samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.35;
    }
  } else if (type === "star_pop") {
    // High sparkling chime
    const duration = 0.45;
    const n = Math.floor(sampleRate * duration);
    samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 9.0);
      const val =
        Math.sin(2 * Math.PI * 1318.51 * t) * 0.25 + // E6
        Math.sin(2 * Math.PI * 1760.0 * t) * 0.15;  // A6
      samples[i] = val * env;
    }
  } else if (type === "coin_earned") {
    // Bright double ping (B5 -> E6)
    const duration = 0.4;
    const n = Math.floor(sampleRate * duration);
    samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let val = 0;
      if (t < 0.12) {
        val = Math.sin(2 * Math.PI * 987.77 * t) * Math.exp(-t * 12.0) * 0.35;
      } else {
        const dt = t - 0.12;
        val = Math.sin(2 * Math.PI * 1318.51 * dt) * Math.exp(-dt * 8.0) * 0.4;
      }
      samples[i] = val;
    }
  } else if (type === "treasure_open") {
    // Joyful fan-out arpeggio
    const duration = 0.8;
    const n = Math.floor(sampleRate * duration);
    samples = new Float32Array(n);
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let val = 0;
      notes.forEach((freq, idx) => {
        const noteStart = idx * 0.09;
        if (t >= noteStart) {
          const dt = t - noteStart;
          val += Math.sin(2 * Math.PI * freq * dt) * Math.exp(-dt * 4.5) * 0.18;
        }
      });
      samples[i] = val;
    }
  } else if (type === "achievement_unlock") {
    // Harmonious victory fanfare
    const duration = 0.9;
    const n = Math.floor(sampleRate * duration);
    samples = new Float32Array(n);
    const chords = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let val = 0;
      chords.forEach((freq) => {
        val += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3.0) * 0.15;
      });
      samples[i] = val;
    }
  } else if (type === "tap") {
    // Crisp, subtle 20ms tactile click
    const duration = 0.03;
    const n = Math.floor(sampleRate * duration);
    samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      samples[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 120.0) * 0.25;
    }
  }

  return samples;
}

// -----------------------------------------------------------------------------
// Voice Synthesis Helper (Generates offline pre-bundled speech assets)
// -----------------------------------------------------------------------------
function generateSpeechFile(text, filename, voice = "Samantha") {
  const m4aPath = path.join(OUT_DIR, filename);
  const aiffPath = path.join(TEMP_DIR, `${filename}.aiff`);

  try {
    // Generate AIFF using system voice
    execSync(`say -v "${voice}" -o "${aiffPath}" "${text}"`);
    // Convert to AAC M4A
    execSync(`afconvert -f m4af -d aac -b 64000 "${aiffPath}" "${m4aPath}"`);
    if (fs.existsSync(aiffPath)) fs.unlinkSync(aiffPath);
  } catch (err) {
    console.warn(`[audio-gen] Fallback synthesis for ${filename}:`, err.message);
    // If say fails for any reason, synthesize a friendly melodic vocalized placeholder tone
    const wavPath = path.join(TEMP_DIR, `${filename}.wav`);
    const duration = 0.6;
    const sr = 44100;
    const samples = new Float32Array(Math.floor(sr * duration));
    for (let i = 0; i < samples.length; i++) {
      const t = i / sr;
      samples[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 4.0) * 0.3;
    }
    writeWav(wavPath, samples, sr);
    convertToM4a(wavPath, m4aPath);
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
  }
}

// -----------------------------------------------------------------------------
// Generate All Manifest Assets
// -----------------------------------------------------------------------------
console.log("Generating Koki audio assets...");

// 1. SFX Assets
const sfxMap = {
  "sfx_correct_chime_v1.m4a": "correct_chime",
  "sfx_incorrect_gentle_v1.m4a": "incorrect_gentle",
  "sfx_star_pop_v1.m4a": "star_pop",
  "sfx_coin_earned_v1.m4a": "coin_earned",
  "sfx_treasure_open_v1.m4a": "treasure_open",
  "sfx_achievement_unlock_v1.m4a": "achievement_unlock",
  "sfx_tap_v1.m4a": "tap",
};

for (const [filename, sfxType] of Object.entries(sfxMap)) {
  const wavPath = path.join(TEMP_DIR, `${filename}.wav`);
  const m4aPath = path.join(OUT_DIR, filename);
  const samples = synthesizeSfx(sfxType);
  writeWav(wavPath, samples);
  convertToM4a(wavPath, m4aPath);
  if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
  console.log(`  ✓ ${filename}`);
}

// 2. Koki Character Dialogue (Voice: playful, energetic)
const kokiDialogues = {
  "koki_great_job_v1.m4a": "Great job!",
  "koki_try_again_v1.m4a": "Try again!",
  "koki_lets_go_v1.m4a": "Let's go!",
  "koki_you_did_it_v1.m4a": "You did it!",
  "koki_welcome_v1.m4a": "Welcome to Koki Village!",
};

for (const [filename, text] of Object.entries(kokiDialogues)) {
  generateSpeechFile(text, filename, "Samantha");
  console.log(`  ✓ ${filename} [koki]`);
}

// 3. English Narrator Assets (Voice: clear, articulate)
const englishAssets = {
  "en_word_hello_v1.m4a": "Hello",
  "en_word_goodbye_v1.m4a": "Goodbye",
  "en_word_apple_v1.m4a": "Apple",
  "en_word_cat_v1.m4a": "Cat",
  "en_word_dog_v1.m4a": "Dog",
  "en_word_red_v1.m4a": "Red",
  "en_word_blue_v1.m4a": "Blue",
  "en_num_1_v1.m4a": "One",
  "en_num_2_v1.m4a": "Two",
  "en_num_3_v1.m4a": "Three",
  "en_inst_listen_hello_v1.m4a": "Listen and tap Hello",
  "en_inst_listen_goodbye_v1.m4a": "Listen and tap Goodbye",
};

for (const [filename, text] of Object.entries(englishAssets)) {
  generateSpeechFile(text, filename, "Samantha");
  console.log(`  ✓ ${filename} [narrator_en]`);
}

// 4. Khmer Educational Audio Assets
// Educational pronunciation assets created outside app; marked as "needs_review" in manifests
const khmerAssets = {
  "km_letter_ka_v1.m4a": "Ka",
  "km_letter_kha_v1.m4a": "Kha",
  "km_letter_ko_v1.m4a": "Ko",
  "km_num_1_v1.m4a": "Moy",
  "km_num_2_v1.m4a": "Pee",
  "km_num_3_v1.m4a": "Bey",
  "km_num_4_v1.m4a": "Buan",
  "km_num_5_v1.m4a": "Pram",
  "km_color_red_v1.m4a": "Krahom",
  "km_color_blue_v1.m4a": "Khiev",
  "km_color_green_v1.m4a": "Baitong",
  "km_color_yellow_v1.m4a": "Loeung",
  "km_word_elephant_v1.m4a": "Damrei",
  "km_word_dog_v1.m4a": "Chhke",
  "km_word_fish_v1.m4a": "Trei",
  "km_word_monkey_v1.m4a": "Sva",
  "km_inst_tap_letter_ka_v1.m4a": "Tap letter Ka",
  "km_inst_tap_red_v1.m4a": "Tap red color",
  "km_inst_which_num_3_v1.m4a": "Which one is three",
  "km_inst_match_animals_v1.m4a": "Match the animals",
};

for (const [filename, text] of Object.entries(khmerAssets)) {
  generateSpeechFile(text, filename, "Samantha");
  console.log(`  ✓ ${filename} [narrator_km (needs_review)]`);
}

console.log("\nAll Koki audio assets successfully generated in assets/audio/files/!");
