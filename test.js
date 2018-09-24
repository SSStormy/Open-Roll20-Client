import test from 'ava';
import * as R20 from "./src/index";

test('arrays are equal', t => {
    t.deepEqual([1, 2], [1, 2]);
});