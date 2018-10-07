import test from 'ava';
import {Roll20Client, Roll20Client1} from "./src/roll20Client";
import {Character} from "./src/Model/Character";

const dotenv = require("dotenv");
const fs = require("fs");

const nonGmEnv = dotenv.parse(fs.readFileSync(".env.test"));
const gmEnv = dotenv.parse(fs.readFileSync(".env.test.gm"));
const researchEnv = dotenv.parse(fs.readFileSync(".env.research"));


const timeout = (err: (a: any) => void, time = 10000) => {
    setTimeout(() => err(`timed out after ${time}ms`), time);
};

const connectToCampaignWithThese = async (campaign: string, playerId: string, gntkn: string) => {
    const client = new Roll20Client1(campaign);
    await client.login(gntkn);
    return client;
}


const connectToCampaignAsGM = async () => await connectToCampaignWithThese(
    <string>gmEnv.ROLL20_CAMPAIGN_PATH,
    <string>gmEnv.ROLL20_PLAYER_ID,
    <string>gmEnv.ROLL20_GNTKN);

const connectToCampaignAsPlayer = async () => await connectToCampaignWithThese(
    <string>nonGmEnv.ROLL20_CAMPAIGN_PATH,
    <string>nonGmEnv.ROLL20_PLAYER_ID,
    <string>nonGmEnv.ROLL20_GNTKN);

test("two clients on different campaigns", t => new Promise(async (ok, err) => {
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

    const tryFinish = (instance: Roll20Client) => {
        console.log(`can see players: ${instance.players().getAllAsArray().reduce((s, p) => s += p.getDisplayName() + " ", "")}`);
        if (ready1 && ready2) {
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
        } catch (err) {
            caught = true;
        }

        t.true(caught);
        ok();
    });
}));

test("cannot get current player until chars are ready", t => new Promise(async (ok, err) => {
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
        if (!p) {
            t.fail();
            return;
        }

        t.deepEqual(p.getUserAccountId(), gmEnv.ROLL20_PLAYER_ACC_ID);

        ok();
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

        const char: Character = chars[0];

        t.true(char.getClient() === camp);
        t.truthy(char.getFirebase());
        t.truthy(char.getLowLevel());
        t.falsy(char.getPreviousLowLevel());

        t.deepEqual(char.getName(), "test_char_orc");
        t.deepEqual(char.getId(), "-LNFIAb5m0cRbNOUbrB4");
        t.deepEqual(char.getAvatarURL(), "https://s3.amazonaws.com/files.d20.io/images/63496114/APrvcB7hlLkqX8tJWX7jYg/max.png?1537872196");
        t.false(char.isArchived());

        const tags = char.tags();
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

test("rollable table api", t => new Promise(async (ok, err) => {
    const camp = await connectToCampaignAsGM();

    camp.rollableTables().ready().on(async () => {

        t.deepEqual(camp.rollableTables().getAllAsArray(), []);
        const table = await camp.rollableTables().create();
        t.deepEqual(camp.rollableTables().getAllAsArray(), [table]);

        await table.setVisibleByPlayers(true);
        await table.setName("test table");

        t.deepEqual(table.getName(), "test table");
        t.true(table.isVisibleByPlayers());

        t.deepEqual(table.items().getAllAsArray(), []);
        const tableItem = await table.items().create();
        t.deepEqual(table.items().getAllAsArray(), [tableItem]);

        await tableItem.setAvatarURL("test avatar");
        await tableItem.setName("test name");
        await tableItem.setWeight(35);

        t.deepEqual(tableItem.getAvatarURL(), "test avatar");
        t.deepEqual(tableItem.getName(), "test name");
        t.deepEqual(tableItem.getWeight(), 35);

        let addedEvent = false;
        let changedEvent = false;
        let removdEvent = false;
        camp.rollableTables().added().on(async (newTable: RollableTable) => {
            addedEvent = true;
            t.deepEqual(table2.getId(), newTable.getId());
        });

        camp.rollableTables().changed().on(async (changedTable: RollableTable) => {
            changedTable = true;
            t.deepEqual(table2.getId(), changedTable.getId());
            t.deepEqual(changedTable.getName(), "test name 2");
        });

        camp.rollableTables().changed().on(async (changedTable: RollableTable) => {
           removdEvent = true;
        });

        const table2 = await camp.rollableTables().create();

        t.deepEqual(camp.rollableTables().getAllAsArray(), [table, table2]);
        t.true(addedEvent);

        await table2.setName("test name 2");
        t.true(changedEvent);

        let itemAddedEvent = false;
        let itemChangedEvent = false;
        let itemRemovedEvent = false;
        table2.items().added().on(async (addedItem: RollableTableItem) => {
            itemAddedEvent = true;
            t.deepEqual(table2Item.getId(), addedItem.getId());
        });
        table2.items().changed().on(async (changedItem: RollableTableItem) => {
            itemChangedEvent = true;
            t.deepEqual(table2Item.getId(), changedItem.getId());
            t.deepEqual(changedItem.getName(), "test item name 2");
        });
        table2.items().removed().on(async (removedItem: RollableTableItem) => {
            itemRemovedEvent = true;
            t.deepEqual(table2Item.getId(), removedItem.getId());
        });

        const table2Item = await table2.items().create();
        t.true(itemAddedEvent);

        await table2Item.setName("test item name 2");
        t.true(itemChangedEvent);

        await table2Item.destroy();
        t.true(itemRemovedEvent);

        await table2.destroy();
        t.true(removdEvent);

        t.deepEqual(camp.rollableTables().getAllAsArray(), [table]);
        await table.destroy();

        t.deepEqual(camp.rollableTables().getAllAsArray(), []);
    });
}));

test.todo("character token high-level obj + events");
test.todo("character attributes + events");
test.todo("character abilities + events");
test.todo("player macros + events");
