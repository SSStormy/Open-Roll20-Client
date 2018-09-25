const roll20auth = require("roll20auth");
const fs = require("fs");
require("dotenv").load();

const dumpDataFor = async (campaignId, filename, user, pass) => {
    const key = await roll20auth.getSessionKey(user, pass);
    const data = await roll20auth.getCampaignData(key, campaignId);

    fs.writeFile(filename, `
ROLL20_GNTKN="${data.getGNTKN()}"
ROLL20_CAMPAIGN_PATH="${data.getCampaignStoragePath()}"
ROLL20_PLAYER_ID="${data.getPlayerId()}"
ROLL20_PLAYER_ACC_ID="${data.getPlayerAccountId()}"
`, "utf8", e => {if(e) console.log(e);});

    console.log(`${filename} done!`);
};

const asyncCtx = async () => {
    await Promise.all([
        dumpDataFor(process.env.ROLL20_RESEARCH_CAMPAIGN_ID, ".env.research", process.env.ROLL20_USERNAME, process.env.ROLL20_PASSWORD),
        dumpDataFor(process.env.ROLL20_TEST_CAMPAIGN_ID, ".env.test.gm", process.env.ROLL20_USERNAME, process.env.ROLL20_PASSWORD),
        dumpDataFor(process.env.ROLL20_TEST_CAMPAIGN_ID, ".env.test", process.env.ROLL20_USERNAME_NOTGM, process.env.ROLL20_PASSWORD_NOTGM)
    ]);
};

asyncCtx().catch(console.log);