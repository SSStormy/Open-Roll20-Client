const roll20auth = require("roll20auth");
const fs = require("fs");
require("dotenv").load();

const asyncCtx = async () => {
    const key = await roll20auth.getSessionKey(process.env.ROLL20_USERNAME, process.env.ROLL20_PASSWORD);
    const data = await roll20auth.getCampaignData(key, process.env.ROLL20_CAMPAIGN_ID);

    fs.writeFile(".env.gntkn", `
ROLL20_GNTKN="${data.getGNTKN()}"
ROLL20_CAMPAIGN_PATH="${data.getCampaignStoragePath()}"
ROLL20_PLAYER_ID="${data.getPlayerId()}"
`, "utf8", console.log);
    console.log("done.");
};

asyncCtx().catch(console.log);