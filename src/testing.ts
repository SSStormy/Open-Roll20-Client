import {Roll20Client} from "./Roll20Client";
import {ChatMessage} from "./Model/ChatMessage";
import {IChatMessageData, IInlineRoll, IInlineRollResults} from "./Interface/IChatMessageData";
import {LowLevelNoId} from "./Utils/LowLevelNoId";

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

    campaign.chat().added().on(async (msg: ChatMessage) => {
        const ll = msg.getLowLevel();
        console.log(msg.getLowLevel());

        // @ts-ignore
        console.log(ll.inlinerolls[0].results);
        // @ts-ignore
        console.log(ll.inlinerolls[0].results.rolls[0].results);
    });

    campaign.chat().ready().on(async () => {

        const result1: IInlineRollResults = {
            resultType: "sum",
            total: 20,
            type: "V",
            rolls: [
                {
                    dice: 1,
                    results: [{v: 20}],
                    sides: 20,
                    type: "R"
                },
            ]
        };

        const inlineRoll: IInlineRoll = {
            expression: "1d20",
            results: result1,
            rollid: "-LOcFRjtAY8q9NndCgoj",
            signature: "376ba31eace575f8883870b056e611ab831a184c84d6637819f5790929fc8532630b8e2ab7a9bd85ab422213dc8d7899528dd1ea05b460b1be44c8a277003ff2"
        };

        const msg: LowLevelNoId<IChatMessageData> = {
            avatar: "/users/avatar/1460146/30",
            content: "fake $[[0]]",
            inlinerolls: [inlineRoll],
            playerid: "-LLDzVWKvJl7qGUiF0m5",
            type: "general",
            who: "real person",
        };

        await campaign.chat().create(msg);
        console.log("created");
    });
};

asyncCtx().catch(console.error);
