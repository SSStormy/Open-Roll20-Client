import test from 'ava';
import * as R20 from "./dist/index";

const dotenv = require("dotenv");
const fs = require("fs");

const cfg = dotenv.parse(fs.readFileSync(".env.gntkn"));
for (const key in cfg) {
    process.env[key] = cfg[key];
}


test('arrays are equal', t => {
    const campaign = new Campaign()
    t.deepEqual([1, 2], [1, 2]);
});