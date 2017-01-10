'use strict';

const assert = require('assert');
const rpcutil = require('../lib');
const uuid = require('uuid');
const moment = require('moment');

describe('Helpers', () => {
    describe('fmtUuid', () => {

        it('is 32 characters long', () => {
            var _uid = rpcutil.helpers.fmtUuid();
            assert.equal(_uid.length, 32, "UUID does not have 32 characters.");
        });

        it('returnes unique values', () => {
            var _uid1 = rpcutil.helpers.fmtUuid();
            var _uid2 = rpcutil.helpers.fmtUuid();
            assert.notEqual(_uid1, _uid2, "Unique values are not unique.");
        });

        it('has only alpha-numeric characters.', () => {
            var _uid = rpcutil.helpers.fmtUuid();
            var _blank = _uid.replace(/[a-zA-Z0-9]\w?/g, "");
            assert.equal(_blank, "", "UUID Contains invalid characters.");
        });

        it('formats arguments as a uuid by removing "-"s', () => {
            var _uid1 = uuid.v4();
            var _uid2 = rpcutil.helpers.fmtUuid(_uid1);
            assert.notEqual(_uid1, _uid2, "The UUID was not formated.");
        });

        it('formats arguments as a uuid but does not change value.', () => {
            var _uid1 = uuid.v4();
            var _uid2 = rpcutil.helpers.fmtUuid(_uid1);
            var _uid3 = rpcutil.helpers.fmtUuid(_uid1);
            assert.equal(_uid2, _uid3, "The UUID was diffrent the second time through.");
        });
    });

    describe("fmtDate", () => {
        it('is ISO8601 Format', () => {
            // 2017-01-10T21:22:16.985Z

            var _date = rpcutil.helpers.fmtDate();
            assert.equal(_date.length, 24, "Date was not 24 chars long.");

            var _dateSplit = _date.split('T');
            assert.equal(_dateSplit.length, 2, "Split on T returned more parts then expected.");

            var _dParts = _dateSplit[0].split('-');
            assert.equal(_dParts.length, 3, "Date section does not have 3 parts.");

            var _tParts = _dateSplit[1].split(':');
            assert.equal(_tParts.length, 3, "Time section does not have 3 parts.");

            var _sParts = _tParts[2].split('.');
            assert.equal(_sParts.length, 2, "Seconds section does not have 2 parts.");

            assert(_sParts[1].endsWith('Z'), "Date does not end with 'Z'");
        });

        it('accepts a date and formats it without changing the value.', () => {
            var _date = moment.utc();
            var _date1 = rpcutil.helpers.fmtDate(_date);
            var _date2 = rpcutil.helpers.fmtDate(_date);
            assert.equal(_date1, _date2, "The value was altered.");
        });

        it('accepts a date string and formats it without changing the value.', () => {
            var _date = "01/01/2017 20:20:20";
            var _date1 = rpcutil.helpers.fmtDate(_date);
            var _date2 = rpcutil.helpers.fmtDate(_date);
            assert.equal(_date1, _date2, "The value was altered.");
        });
    });

    describe('toHex', () => {
        it('is creates consistent padding', () => {
            var _hex = rpcutil.helpers.toHex(1, 8);
            assert.equal(_hex.length, 8, "Result was not padded correctly.");
        });

        it('represents 10 as 0A with padding 2', () => {
            var _tv = 10;
            var _hex = rpcutil.helpers.toHex(_tv, 2);
            assert.equal(_hex, "0A", "Result was not hex value " + _tv);
        });

        it('represents 255 as FF with padding 2', () => {
            var _tv = 255;
            var _hex = rpcutil.helpers.toHex(_tv, 2);
            assert.equal(_hex, "FF", "Result was not hex value " + _tv);
        });

        it('extends padding as needed', () => {
            var _tv = 256, _pad = 2;
            var _hex = rpcutil.helpers.toHex(_tv, _pad);
            assert.equal(_hex.length, _pad + 1, "length was unexpected.");
        });

        it('does not prefix 0x', () => {
            var _tv = 256;
            var _hex = rpcutil.helpers.toHex(_tv, 8);
            assert(!_hex.startsWith('0x'), "toHex added 0x");
        });

        it('Only contains hex chars and uppercase.', () => {
            var _tv = 1311768467463790320;
            var _hex = rpcutil.helpers.toHex(_tv, 8);
            var _blank = _hex.replace(/[A-Z0-9]\w?/g, "");
            assert.equal(_blank, "", "Result has unexpected chars.");
        });
    });
});

