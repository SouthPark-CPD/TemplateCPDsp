const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { territoryWriteMode } = require("../server/gang-unit");
const { sanitizeConfig } = require("../server/admin-config");

test("un territoire existant reste une mise à jour après déplacement", () => {
  assert.deepEqual(territoryWriteMode({ id: "42", intent: "update" }), { entityId: "42", mode: "update" });
});

test("une mise à jour sans identifiant ne peut pas créer un doublon", () => {
  assert.deepEqual(territoryWriteMode({ intent: "update" }), { entityId: "", mode: "invalid-update" });
});

test("un nouveau tracé sans identifiant reste une création", () => {
  assert.deepEqual(territoryWriteMode({ intent: "create" }), { entityId: "", mode: "create" });
});

test("les anciens clients qui envoient un identifiant restent compatibles", () => {
  assert.deepEqual(territoryWriteMode({ id: 73 }), { entityId: "73", mode: "update" });
});

test("la carte applique immédiatement le territoire renvoyé après sauvegarde", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "mdt", "gang-unit.js"), "utf8");
  assert.match(source, /const territory = saved\.territory;/);
  assert.match(source, /state\.territories\.splice\(index, 1, territory\)/);
});

test("la navigation Gang Unit garde les dossiers fusionnés et écarte les anciennes pages", () => {
  const config = sanitizeConfig({ ui: { gangItems: [
    { key: "gang-archives", label: "Archives", enabled: true },
    { key: "gang-activity", label: "Journal", enabled: true }
  ] } });
  const keys = config.ui.gangItems.map(item => item.key);
  assert.equal(keys.includes("gang-archives"), false);
  assert.equal(keys.includes("gang-activity"), false);
  assert.equal(keys.includes("gang-intel"), false);
  assert.deepEqual(keys, ["gang-dashboard", "gang-map", "gang-gangs", "gang-operations"]);
});
