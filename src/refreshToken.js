const roll20auth = require("roll20auth");
const fs = require("fs");
require("dotenv").load();

roll20auth.getSessionKey(process.env.ROLL20_USERNAME, process.env.ROLL20_PASSWORD)
    .then(key => {
        roll20auth.getGNTKN(key, process.env.ROLL20_CAMPAIGN_ID)
            .then(gntkn => {
                fs.writeFile(".env.gntkn", `ROLL20_GNTKN=${gntkn}`, "utf8", console.log);
                console.log("done.");
            }).catch(console.log)
    }).catch(console.log);