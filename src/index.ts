const dotenv = require("dotenv");
const fs = require("fs");

require("firebase");

{
    const cfg = dotenv.parse(fs.readFileSync(".env.gntkn"));
    for (const key in cfg) {
        process.env[key] = cfg[key];
    }
}

type Firebase_T = any;
type Firebase_Child_T = any;

class Campaign {
    private firebase: Firebase_T;
    private chat: Firebase_Child_T;
    private playerId: string;

    public constructor(campaignIdString: string, gntkn: string, playerId: string) {
        this.firebase = new Firebase(`https://roll20-9.firebaseio.com/${campaignIdString}/`);
        this.firebase.authWithCustomToken(gntkn);
        this.playerId = playerId;

        this.chat = this.firebase.child("/chat/");
    }

    public say(content: string, who: string, type: string = "general") {
        const key = this.chat.push().key();
        this.chat.child(key).setWithPriority({
            content,
            playerid: this.playerId,
            who,
            type,
        }, Firebase.ServerValue.TIMESTAMP);
    }
}

const campaign = new Campaign(
    "campaign-3681941-o8feH7cdthipn745_0UaEA",
    <string>process.env.ROLL20_GNTKN,
    "-LMscFSR9rEZsn74c22H");

campaign.say("hello, world!","not a bot");