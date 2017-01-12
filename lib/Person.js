'use strict';

module.exports = Person;

function Person(opts) {

    var self = {

        get sponsorId() { return opts.sponsorId },
        get sponsorName() { return opts.sponsorName },
        get sponsorKey() { return opts.sponsorKey },

        get clientId() { return opts.clientId },
        get clientName() { return opts.clientName },
        get clientKey() { return opts.clientKey },

        get userId() { return opts.userId },

        get username() { return opts.username },
        get email() { return opts.email },

        get fullName() { return opts.fullName },
        get photoUrl() { return opts.photoUrl },

        get phoneNumber() { return opts.clientPhoneNubmer },
        address: {  get singleLine() { return opts.singleLine },
                    get line1() { return opts.line1 },
                    get line2() { return opts.line2 },
                    get city() { return opts.city },
                    get state() { return opts.state },
                    get zip() { return opts.zip } },

        get roles() { return opts.roles || [] },

        inRole: inRole,
        hasAuthority: hasAuthority,

        toString: toString
    };

    return self;

    // ------------------------------------------------------------------------

    function inRole(name) {
        return self.roles.indexOf(name) >= 0;
    }

    function hasAuthority(min) {

        throw new Error("Not Implemented");

        return false;

        /*
         * I dont know how this works yet.
         * Basicly, the caller provides a minimum access level in a functional
         * group and this function checks if the user has atleast that acces.
         *
         * We should probably pre-process the roles list on init to make a
         * faster lookup map.
         */
    }

    function toString() {
        return `<Person(fullName='${self.fullName}' email='${self.email}')>`
    }
}
