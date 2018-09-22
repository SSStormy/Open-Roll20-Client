const roll20auth = require("roll20auth");
const fs = require("fs");
require("dotenv").load();

const asyncCtx = async () => {
    const key = await roll20auth.getSessionKey(process.env.ROLL20_USERNAME, process.env.ROLL20_PASSWORD);
    const gntkn = await roll20auth.getGNTKN(key, process.env.ROLL20_CAMPAIGN_ID);

    fs.writeFile(".env.gntkn", `ROLL20_GNTKN=${gntkn}`, "utf8", console.log);
    console.log("done.");
};

asyncCtx().catch(console.log);