import {Roll20Client, ChatMessage, Character} from "./index";

const dotenv = require("dotenv");
const fs = require("fs");

const cfg = dotenv.parse(fs.readFileSync(".env.research"));
for (const key in cfg) {
    process.env[key] = cfg[key];
}

const asyncCtx = async () => {

    const campaign = new Roll20Client(
        <string>process.env.ROLL20_CAMPAIGN_PATH);

    await campaign.login(<string>process.env.ROLL20_GNTKN);

    campaign.players().ready().on(async () => {
        const p = campaign.getCurrentPlayer();

    });


};

asyncCtx().catch(console.error);
b
