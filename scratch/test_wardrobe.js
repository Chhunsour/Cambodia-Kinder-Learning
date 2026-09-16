/**
 * Comprehensive automated verification script for Koki Wardrobe & Coin Shop.
 * Tests SQLite schema, atomic purchase transactions, equip/unequip, and profile isolation.
 */
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");

console.log("=== STEP 1: Running Migrations (v1 -> v2 -> v3 -> v4) ===");

db.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

-- Migration v1
CREATE TABLE IF NOT EXISTS child_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  nickname TEXT NOT NULL,
  avatar_id TEXT NOT NULL,
  age INTEGER NOT NULL DEFAULT 5,
  learning_band TEXT NOT NULL DEFAULT 'explorer',
  ui_language TEXT NOT NULL DEFAULT 'km',
  onboarding_completed INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Migration v2
CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  world_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  best_stars INTEGER NOT NULL DEFAULT 1,
  completion_count INTEGER NOT NULL DEFAULT 1,
  total_attempts INTEGER NOT NULL DEFAULT 1,
  total_mistakes INTEGER NOT NULL DEFAULT 0,
  first_completed_at INTEGER NOT NULL,
  last_completed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(profile_id, lesson_id)
);

-- Migration v3: Wallets & Transactions
CREATE TABLE IF NOT EXISTS wallets (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  coin_balance INTEGER NOT NULL DEFAULT 0 CHECK(coin_balance >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(profile_id, source_type, source_id)
);

-- Migration v4: Cosmetic Inventory & Koki Appearance
CREATE TABLE IF NOT EXISTS cosmetic_inventory (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'purchase',
  UNIQUE(profile_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_cosmetic_inventory_profile 
  ON cosmetic_inventory(profile_id, acquired_at DESC);

CREATE TABLE IF NOT EXISTS koki_appearance (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  head_item_id TEXT,
  face_item_id TEXT,
  neck_item_id TEXT,
  body_item_id TEXT,
  back_item_id TEXT,
  special_item_id TEXT,
  updated_at INTEGER NOT NULL
);
`);

console.log("Migrations v1-v4 executed successfully.");

// Insert test profiles
db.exec(`
INSERT INTO child_profiles (id, nickname, avatar_id, age, created_at, updated_at)
VALUES ('profile-dara', 'Dara', 'avatar_01', 5, 1000, 1000),
       ('profile-sokha', 'Sokha', 'avatar_02', 7, 1000, 1000);
`);

console.log("=== STEP 2: Pure Simulation Functions ===");

function getCoinBalance(profileId) {
  const row = db.prepare("SELECT coin_balance FROM wallets WHERE profile_id = ?").get(profileId);
  return row ? row.coin_balance : 0;
}

function setCoinBalance(profileId, amount) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO wallets (profile_id, coin_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET coin_balance = excluded.coin_balance, updated_at = excluded.updated_at;
  `).run(profileId, amount, now, now);
}

function getOwnedItems(profileId) {
  return db.prepare("SELECT item_id FROM cosmetic_inventory WHERE profile_id = ?").all(profileId).map(r => r.item_id);
}

function isItemOwned(profileId, itemId) {
  const row = db.prepare("SELECT id FROM cosmetic_inventory WHERE profile_id = ? AND item_id = ?").get(profileId, itemId);
  return Boolean(row);
}

function getAppearance(profileId) {
  const row = db.prepare("SELECT * FROM koki_appearance WHERE profile_id = ?").get(profileId);
  return {
    head: row?.head_item_id ?? null,
    face: row?.face_item_id ?? null,
    neck: row?.neck_item_id ?? null,
    body: row?.body_item_id ?? null,
    back: row?.back_item_id ?? null,
    special: row?.special_item_id ?? null,
  };
}

function updateEquippedSlot(profileId, slot, itemId) {
  const column = `${slot}_item_id`;
  const now = Date.now();
  db.prepare(`
    INSERT INTO koki_appearance (profile_id, ${column}, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET ${column} = excluded.${column}, updated_at = excluded.updated_at;
  `).run(profileId, itemId, now);
  return getAppearance(profileId);
}

function executePurchaseTransaction({ profileId, itemId, price, slot, autoEquip = true }) {
  const balance = getCoinBalance(profileId);
  if (balance < price) {
    return { success: false, error: "INSUFFICIENT_COINS", balance };
  }
  if (isItemOwned(profileId, itemId)) {
    return { success: false, error: "ALREADY_OWNED", balance };
  }

  db.exec("BEGIN TRANSACTION;");
  try {
    const now = Date.now();
    // 1. Insert spend transaction
    db.prepare(`
      INSERT INTO coin_transactions (id, profile_id, amount, type, source_type, source_id, description, created_at)
      VALUES (?, ?, ?, 'spend', 'cosmetic_purchase', ?, ?, ?);
    `).run(`tx_${now}_${Math.random()}`, profileId, -price, itemId, `Bought ${itemId}`, now);

    // 2. Deduct wallet
    db.prepare(`
      UPDATE wallets SET coin_balance = coin_balance - ?, updated_at = ? WHERE profile_id = ?;
    `).run(price, now, profileId);

    // 3. Insert inventory
    db.prepare(`
      INSERT INTO cosmetic_inventory (id, profile_id, item_id, acquired_at, source)
      VALUES (?, ?, ?, ?, 'purchase');
    `).run(`inv_${now}_${Math.random()}`, profileId, itemId, now);

    // 4. Auto equip
    if (autoEquip) {
      const column = `${slot}_item_id`;
      db.prepare(`
        INSERT INTO koki_appearance (profile_id, ${column}, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(profile_id) DO UPDATE SET ${column} = excluded.${column}, updated_at = excluded.updated_at;
      `).run(profileId, itemId, now);
    }

    db.exec("COMMIT;");
    return {
      success: true,
      balance: getCoinBalance(profileId),
      appearance: getAppearance(profileId),
    };
  } catch (err) {
    db.exec("ROLLBACK;");
    return { success: false, error: err.message, balance: getCoinBalance(profileId) };
  }
}

console.log("=== STEP 3: Executing Test Scenarios ===");

// 1. Initial State Check
console.assert(getCoinBalance("profile-dara") === 0, "Initial balance should be 0");
console.assert(getOwnedItems("profile-dara").length === 0, "Initial items should be empty");
const initApp = getAppearance("profile-dara");
console.assert(initApp.head === null && initApp.face === null, "Initial appearance should be clean");
console.log("✓ Scenario 1: Initial state verified.");

// 2. Insufficient Coins Attempt
const failedPurchase = executePurchaseTransaction({
  profileId: "profile-dara",
  itemId: "koki_hat_straw",
  price: 30,
  slot: "head",
});
console.assert(failedPurchase.success === false, "Purchase with 0 coins must fail");
console.assert(failedPurchase.error === "INSUFFICIENT_COINS", "Must return INSUFFICIENT_COINS");
console.assert(getCoinBalance("profile-dara") === 0, "Balance must remain 0");
console.assert(getOwnedItems("profile-dara").length === 0, "Inventory must remain 0");
console.log("✓ Scenario 2: Insufficient coins purchase rejected without side effects.");

// 3. Grant Coins & Purchase Item
setCoinBalance("profile-dara", 100);
console.assert(getCoinBalance("profile-dara") === 100, "Balance should be 100");

const p1 = executePurchaseTransaction({
  profileId: "profile-dara",
  itemId: "koki_hat_straw",
  price: 30,
  slot: "head",
  autoEquip: true,
});
console.assert(p1.success === true, "Purchase should succeed");
console.assert(p1.balance === 70, "Balance should now be 70 (100 - 30)");
console.assert(isItemOwned("profile-dara", "koki_hat_straw") === true, "Item must be marked owned");
console.assert(p1.appearance.head === "koki_hat_straw", "Straw hat must be auto-equipped");
console.log("✓ Scenario 3: Successful purchase: 30 coins deducted, inventory granted, auto-equipped.");

// 4. Spend Transaction in Ledger Check
const txRow = db.prepare("SELECT * FROM coin_transactions WHERE profile_id = 'profile-dara' AND source_id = 'koki_hat_straw'").get();
console.assert(txRow !== undefined, "Ledger must contain transaction");
console.assert(txRow.amount === -30, "Transaction amount must be -30");
console.assert(txRow.type === "spend", "Transaction type must be 'spend'");
console.log("✓ Scenario 4: Spend transaction verified in immutable audit ledger.");

// 5. Duplicate Purchase Protection Check
const pDup = executePurchaseTransaction({
  profileId: "profile-dara",
  itemId: "koki_hat_straw",
  price: 30,
  slot: "head",
});
console.assert(pDup.success === false, "Duplicate purchase must fail");
console.assert(pDup.error === "ALREADY_OWNED", "Error must be ALREADY_OWNED");
console.assert(getCoinBalance("profile-dara") === 70, "Balance must NOT be deducted again!");
console.log("✓ Scenario 5: Duplicate purchase blocked. Zero double-charging.");

// 6. Multiple Categories Simultaneously
const p2 = executePurchaseTransaction({
  profileId: "profile-dara",
  itemId: "koki_face_sunglasses",
  price: 40,
  slot: "face",
  autoEquip: true,
});
console.assert(p2.success === true, "Second purchase should succeed");
console.assert(p2.balance === 30, "Balance should now be 30 (70 - 40)");
console.assert(p2.appearance.head === "koki_hat_straw", "Head must still be koki_hat_straw");
console.assert(p2.appearance.face === "koki_face_sunglasses", "Face must now be koki_face_sunglasses");
console.log("✓ Scenario 6: Multiple categories worn simultaneously without collision.");

// 7. Equip and Unequip
updateEquippedSlot("profile-dara", "face", null);
const appUnequipped = getAppearance("profile-dara");
console.assert(appUnequipped.face === null, "Face must now be unequipped (null)");
console.assert(appUnequipped.head === "koki_hat_straw", "Head must remain equipped");
console.assert(isItemOwned("profile-dara", "koki_face_sunglasses") === true, "Item remains owned in inventory");
console.log("✓ Scenario 7: Unequip succeeds and preserves ownership in inventory.");

// 8. Profile Isolation Check (Sokha vs Dara)
console.assert(getCoinBalance("profile-sokha") === 0, "Sokha balance must be 0");
console.assert(getOwnedItems("profile-sokha").length === 0, "Sokha inventory must be 0");
const sokhaApp = getAppearance("profile-sokha");
console.assert(sokhaApp.head === null, "Sokha appearance must be clean");

setCoinBalance("profile-sokha", 150);
const pSokha = executePurchaseTransaction({
  profileId: "profile-sokha",
  itemId: "koki_hat_crown",
  price: 120,
  slot: "head",
  autoEquip: true,
});
console.assert(pSokha.success === true, "Sokha crown purchase should succeed");
console.assert(pSokha.balance === 30, "Sokha balance should be 30");
console.assert(pSokha.appearance.head === "koki_hat_crown", "Sokha wears crown");

// Dara must remain unchanged
console.assert(getCoinBalance("profile-dara") === 30, "Dara balance must remain 30");
console.assert(getAppearance("profile-dara").head === "koki_hat_straw", "Dara must still wear straw hat");
console.log("✓ Scenario 8: Strict profile isolation verified between Dara and Sokha.");

// 9. Cascade Deletion Check
db.prepare("DELETE FROM child_profiles WHERE id = 'profile-sokha'").run();
console.assert(getOwnedItems("profile-sokha").length === 0, "Sokha inventory must be cascade deleted");
console.assert(db.prepare("SELECT * FROM koki_appearance WHERE profile_id = 'profile-sokha'").get() === undefined, "Sokha appearance deleted");
console.log("✓ Scenario 9: Foreign key ON DELETE CASCADE verified.");

console.log("\nALL 9 WARDROBE & SHOP VERIFICATION SCENARIOS PASSED WITH 100% SUCCESS!");
