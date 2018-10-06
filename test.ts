import test from 'ava';
import * as R20 from "./src/index";
import {Roll20Client} from "./src/index";

const dotenv = require("dotenv");
const fs = require("fs");

const nonGmEnv = dotenv.parse(fs.readFileSync(".env.test"));
const gmEnv= dotenv.parse(fs.readFileSync(".env.test.gm"));
const researchEnv= dotenv.parse(fs.readFileSync(".env.research"));


const timeout = (err: (a: any) => void, time = 10000) => {
    setTimeout(() => err(`timed out after ${time}ms`), time);
};

const connectToCampaignWithThese = async (campaign: string, playerId: string, gntkn: string) => {
    const client = new R20.Roll20Client(campaign);
    await client.login(gntkn);
    return client;
}


const connectToCampaignAsGM = async () => await connectToCampaignWithThese(
    <string>gmEnv.ROLL20_CAMPAIGN_PATH,
    <string>gmEnv.ROLL20_PLAYER_ID,
    <string>gmEnv.ROLL20_GNTKN);

const connectToCampaignAsPlayer= async () => await connectToCampaignWithThese(
    <string>nonGmEnv.ROLL20_CAMPAIGN_PATH,
    <string>nonGmEnv.ROLL20_PLAYER_ID,
    <string>nonGmEnv.ROLL20_GNTKN);

test("two clients on different campaigns", t => new Promise(async (ok, err)=> {
    timeout(err);

    const test2 = await connectToCampaignWithThese(
        <string>researchEnv.ROLL20_CAMPAIGN_PATH,
        <string>researchEnv.ROLL20_PLAYER_ID,
        <string>researchEnv.ROLL20_GNTKN);


    const test1 = await connectToCampaignWithThese(
        <string>gmEnv.ROLL20_CAMPAIGN_PATH,
        <string>gmEnv.ROLL20_PLAYER_ID,
        <string>gmEnv.ROLL20_GNTKN);

    let ready1 = false;
    let ready2 = false;

    const tryFinish = (instance:  Roll20Client) => {
        console.log(`can see players: ${instance.players().getAllAsArray().reduce((s, p) => s += p.getDisplayName() + " ", "")}`);
        if(ready1 && ready2) {
            t.true(true);
            ok();
        }
    };

    test1.ready().on(async () => {
        ready1 = true;
        tryFinish(test1);
    });

    test2.ready().on(async () => {
        ready2 = true;
        tryFinish(test2);
    });
}));

test("user acc permissions", t => new Promise(async (ok, err) => {
    timeout(err);

    const player = await connectToCampaignAsPlayer();

    player.ready().on(async () => {

        let caught = false;
        try {
            await player.characters().create();
        } catch(err) {
            caught = true;
        }

        t.true(caught);
        ok();
    });
}));

test("cannot get current player until chars are ready", t => new Promise(async (ok, err)=> {
    timeout(err);

    const camp = await connectToCampaignAsGM();
    t.throws(camp.getCurrentPlayer);
    ok();

}));

test("current player has valid data", t => new Promise(async (ok, err) => {
    timeout(err);
    const camp = await connectToCampaignAsGM();

    camp.players().ready().on(async () => {
        const p = camp.getCurrentPlayer();
        if(!p) {
            t.fail();
            return;
        }

        t.deepEqual(p.getUserAccountId(), gmEnv.ROLL20_PLAYER_ACC_ID);

        ok();
    });
}));

test("login with both gm and normal user accs", t => new Promise(async (ok, err) => {
    timeout(err);

    const player = await connectToCampaignAsPlayer();
    const gm = await connectToCampaignAsGM();

    let isGmReady = false;
    let isPlayerReady = false;

    const tryFinish = async () =>  {
        if(isGmReady && isPlayerReady) {

            // try modifying some stuff as player that we dont have perms to
            const gmPlayerInGMGame= gm.getCurrentPlayer();
            t.truthy(gmPlayerInGMGame);
            if(!gmPlayerInGMGame) return; // ts

            t.deepEqual(gmPlayerInGMGame.getUserAccountId(), gmEnv.ROLL20_PLAYER_ACC_ID);

            // @ts-ignore
            const gmPlayerInPlayerGame = player.players().getById(gmPlayerInGMGame.getId());
            t.truthy(gmPlayerInPlayerGame);
            if(!gmPlayerInPlayerGame) return; // ts

            t.deepEqual(gmPlayerInPlayerGame.getUserAccountId(), gmEnv.ROLL20_PLAYER_ACC_ID);

            const playerInPlayerGame = player.getCurrentPlayer();
            t.truthy(playerInPlayerGame);
            if(!playerInPlayerGame) return; // ts

            t.deepEqual(playerInPlayerGame.getUserAccountId(), nonGmEnv.ROLL20_PLAYER_ACC_ID);

            const char = await player.characters().getAllAsArray()[0];
            const bio = await char.getBioBlob();

            // @ts-ignore
            await bio.set("the fuck");

            ok();
        }
    };

    player.ready().on(async () => {
        t.false(isPlayerReady);
        isPlayerReady = true;
        await tryFinish();
    });

    gm.ready().on(async () => {
        t.false(isGmReady);
        isGmReady = true;
        await tryFinish();
    });
}));

test("global ready fired when all resources are ready without awaiting", t => new Promise(async (ok, err) => {
    t.plan(3);
    timeout(err);

    const camp = await connectToCampaignAsGM();
    let playersReady = false;
    let charsReady = false;
    let chatReady = false;

    camp.ready().on(async () => {
        t.true(playersReady);
        t.true(charsReady);
        t.true(chatReady);
        ok();
    });

    camp.chat().ready().on(async () => {
        chatReady = true;
    });
    camp.characters().ready().on(async () => {
        charsReady = true;
    });
    camp.players().ready().on(async () => {
        playersReady = true;
    });
}));

test("characters api", t => new Promise(async (ok, err) => {
    timeout(err);

    const camp = await connectToCampaignAsGM();

    camp.characters().ready().on(async () => {
        const chars = camp.characters().getAllAsArray();
        t.deepEqual(chars.length, 1);

        const char = chars[0];

        t.true(char.getClient() === camp);
        t.truthy(char.getFirebase());
        t.truthy(char.getLowLevel());
        t.falsy(char.getPreviousLowLevel());

        t.deepEqual(char.getName(), "test_char_orc");
        t.deepEqual(char.getId(), "-LNFIAb5m0cRbNOUbrB4");
        t.deepEqual(char.getAvatarURL(), "https://s3.amazonaws.com/files.d20.io/images/63496114/APrvcB7hlLkqX8tJWX7jYg/max.png?1537872196");
        t.false(char.isArchived());

        const tags = char.getTags();
        {
            await tags.clear();
            t.deepEqual(tags.getLocalValues(), []);

            t.true(await tags.add("test_tag1"));
            t.true(await tags.add("test_tag2"));
            t.deepEqual(tags.getLocalValues(), ["test_tag1", "test_tag2"]);

            t.true(await tags.add("test_tag3"));
            t.deepEqual(tags.getLocalValues(), ["test_tag1", "test_tag2", "test_tag3"]);

            t.true(await tags.remove("test_tag1"));
            t.deepEqual(tags.getLocalValues(), ["test_tag2", "test_tag3"]);

            t.true(await tags.add("test_tag1"));
            t.deepEqual(tags.getLocalValues(), ["test_tag2", "test_tag3", "test_tag1"]);

            t.true(await tags.remove("test_tag2"));
            t.true(await tags.remove("test_tag3"));
            t.true(await tags.add("test_tag2"));

            t.deepEqual(tags.getLocalValues(), ["test_tag1", "test_tag2"]);

            await tags.clear();
            t.deepEqual(tags.getLocalValues(), []);
        }

        ok();
    });
}));

test.todo("character token high-level obj");