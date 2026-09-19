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

test("territoires et repères peuvent être retirés de la carte vers les archives", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "mdt", "gang-unit.js"), "utf8");
  assert.match(source, /data-map-archive-type="territory"/);
  assert.match(source, /data-map-archive-type="marker"/);
  assert.match(source, /archives Gang Unit du backend admin/);
  assert.match(source, /api\("\/api\/gang-unit\/archive"/);
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

test("les anciennes valeurs de marque enregistrées sont présentées en LAPD", () => {
  const config = sanitizeConfig({
    servers: [{ key: "cpd", label: "Serveur CPD", guildId: "1408092767963451615", enabled: true }],
    ui: {
      siteTitle: "MDT — Chicago Police Department",
      departmentName: "CHICAGO"
    },
    recruitment: { title: "Rejoindre le CPD" }
  });

  assert.equal(config.servers[0].label, "Serveur LAPD");
  assert.equal(config.ui.siteTitle, "MDT — Los Angeles Police Department");
  assert.equal(config.ui.departmentName, "LOS ANGELES");
  assert.equal(config.recruitment.title, "Rejoindre le LAPD");
});
