const MODERN_FORM_PREFIX = "__CPD_FORM_V2__";

function splitRpName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(" ");
  if (parts.length === 1) return { firstName: parts[0].slice(0, 40), lastName: "" };
  return {
    firstName: parts[0].slice(0, 40),
    lastName: parts.slice(1).join(" ").slice(0, 40)
  };
}

function parseBirthDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || "").trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (date.getTime() > Date.now()) return null;
  return date;
}

function ageFromBirthDate(value, now = new Date()) {
  const date = parseBirthDate(value);
  if (!date) return null;
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const month = now.getUTCMonth() - date.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1;
  return age;
}

function encodeModernFormData(data) {
  const payload = {
    version: 2,
    rpName: String(data?.rpName || "").trim(),
    gender: String(data?.gender || "").trim(),
    birthDate: String(data?.birthDate || "").trim(),
    nationality: String(data?.nationality || "").trim(),
    discordId: String(data?.discordId || "").trim()
  };
  return `${MODERN_FORM_PREFIX}${JSON.stringify(payload)}`;
}

function decodeModernFormData(value) {
  if (typeof value !== "string" || !value.startsWith(MODERN_FORM_PREFIX)) return null;
  try {
    const data = JSON.parse(value.slice(MODERN_FORM_PREFIX.length));
    if (!data || data.version !== 2) return null;
    return {
      version: 2,
      rpName: String(data.rpName || ""),
      gender: String(data.gender || ""),
      birthDate: String(data.birthDate || ""),
      nationality: String(data.nationality || ""),
      discordId: String(data.discordId || "")
    };
  } catch {
    return null;
  }
}

module.exports = {
  MODERN_FORM_PREFIX,
  splitRpName,
  parseBirthDate,
  ageFromBirthDate,
  encodeModernFormData,
  decodeModernFormData
};
