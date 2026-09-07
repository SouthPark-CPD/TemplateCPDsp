const test = require("node:test");
const assert = require("node:assert/strict");
const { parseImagePayload, MEDIA_ID, MAX_IMAGE_BYTES } = require("../server/police-media");

test("accepte une petite capture PNG valide", () => {
  const source = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const result = parseImagePayload({ name: "capture.png", type: "image/png", data: `data:image/png;base64,${source.toString("base64")}` });
  assert.equal(result.ok, true);
  assert.equal(result.buffer.length, source.length);
  assert.equal(result.name, "capture.png");
});

test("refuse un contenu qui n'est pas une image autorisée", () => {
  assert.deepEqual(parseImagePayload({ name: "test.svg", type: "image/svg+xml", data: "data:image/svg+xml;base64,PHN2Zz4=" }), { ok: false, code: "invalid_image" });
});

test("refuse une capture au-delà de la limite", () => {
  const source = Buffer.alloc(MAX_IMAGE_BYTES + 1, 1);
  assert.deepEqual(parseImagePayload({ name: "large.png", type: "image/png", data: `data:image/png;base64,${source.toString("base64")}` }), { ok: false, code: "image_too_large" });
});

test("valide uniquement les identifiants UUID v4 des médias", () => {
  assert.equal(MEDIA_ID.test("7c4c82b2-f9c8-4b7d-81e7-7d7147874f2b"), true);
  assert.equal(MEDIA_ID.test("../../secret"), false);
});
