const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACADEMY_GUILD_ID,
  APPLICATION_CATEGORY_ID,
  CLOSE_TICKET_BUTTON_ID,
  createApplicationTicket
} = require("../server/academy");

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body === undefined ? "" : JSON.stringify(body);
    }
  };
}

test("un nouveau ticket contient le bouton persistant de fermeture", async () => {
  process.env.DISCORD_BOT_TOKEN = "x";
  const requests = [];
  const channelId = "123456789012345678";

  global.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    if (url.endsWith(`/guilds/${ACADEMY_GUILD_ID}/members/987654321`)) {
      return response(200, { user: { id: "987654321" } });
    }
    if (url.endsWith(`/guilds/${ACADEMY_GUILD_ID}/channels`) && !options.method) {
      return response(200, []);
    }
    if (url.endsWith(`/channels/${APPLICATION_CATEGORY_ID}`)) {
      return response(200, {
        id: APPLICATION_CATEGORY_ID,
        guild_id: ACADEMY_GUILD_ID,
        type: 4,
        permission_overwrites: []
      });
    }
    if (url.endsWith(`/guilds/${ACADEMY_GUILD_ID}/channels`) && options.method === "POST") {
      return response(201, { id: channelId });
    }
    if (url.endsWith(`/channels/${channelId}`) && options.method === "PATCH") {
      return response(200, { id: channelId });
    }
    if (url.endsWith(`/channels/${channelId}/messages`) && options.method === "POST") {
      return response(200, { id: "message-id" });
    }

    throw new Error(`Requête inattendue : ${options.method || "GET"} ${url}`);
  };

  const ticket = await createApplicationTicket(
    { id: "987654321", username: "candidate", globalName: "Candidate", avatar: null },
    {
      firstName: "Jane",
      lastName: "Doe",
      age: 25,
      playerId: "42",
      policeExperience: "Non",
      experience: "Une expérience RP suffisamment détaillée pour le test.",
      availability: "Disponible plusieurs soirs dans la semaine.",
      motivation: "Une motivation suffisamment longue pour valider le format de la candidature de test.",
      qualities: "Calme, respect, écoute et capacité à travailler correctement en équipe.",
      accuracy: true
    }
  );

  assert.equal(ticket.channelId, channelId);

  const messageRequest = requests.find(request =>
    request.url.endsWith(`/channels/${channelId}/messages`)
  );
  assert.ok(messageRequest);

  const payload = JSON.parse(messageRequest.options.body);
  const button = payload.components[0].components[0];
  assert.equal(button.type, 2);
  assert.equal(button.style, 4);
  assert.equal(button.label, "Clore le ticket");
  assert.equal(button.custom_id, CLOSE_TICKET_BUTTON_ID);
});
