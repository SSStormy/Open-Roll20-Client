import {Campaign, ChatMessage, Character} from "./index";

const dotenv = require("dotenv");
const fs = require("fs");

const cfg = dotenv.parse(fs.readFileSync(".env.gntkn"));
for (const key in cfg) {
    process.env[key] = cfg[key];
}

const asyncCtx = async () => {

    const campaign = new Campaign(
        "campaign-3681941-o8feH7cdthipn745_0UaEA",
        <string>process.env.ROLL20_GNTKN,
        "-LMscFSR9rEZsn74c22H");

    campaign.ready().on(async () => {
        console.log("ready.");
    });

    campaign.chat().added().on(async (msg: ChatMessage) => {
        console.log(msg.getLowLevel());

        // @ts-ignore
        // TODO: chat buttons !attackroll &#64;{target|token_id} &#91;[1d6+&#63;{Bonus|0}]&#93;
        console.log(`Chat: [${msg.getSpeakingAs()} (${msg.getPlayer().getDisplayName()})] ${msg.getContent()}`)

        const content = msg.getContent();
        if (content.startsWith("!ping")) {
            campaign.say(`pong ${content.substring("!ping".length)}`);
        }

    });


    campaign.characters().added().on(async (char: Character) => {
        campaign.say("new character added");
    });

    campaign.characters().changed().on(async (char: Character) => {
        campaign.say("character changed.");

    });

    campaign.characters().removed().on(async (char: Character) => {
        campaign.say("character removed.");
    });
};

asyncCtx().catch(console.error);