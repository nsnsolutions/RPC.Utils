'use strict';

module.exports = Person;

function Person(opts) {

    var accessLevels = {};
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

    init();

    return self;

    // ------------------------------------------------------------------------

    function init() {

        for(var i = 0; i < self.roles.length; i++) {

            var access = _splitAuthority(self.roles[i]);
            var lvl = accessLevels[access.group] || 0;

            if(access.level > lvl)
                accessLevels[access.group] = access.level;
        }

    }

    function inRole(name) {
        return self.roles.indexOf(name) >= 0;
    }

    function hasAuthority(min) {

        console.log(min, accessLevels);
        var minAccess = _splitAuthority(min);

        if(accessLevels[minAccess.group] && accessLevels[minAccess.group] >= minAccess.level)
            return true;

        return false;
    }

    function toString() {
        return `<Person(fullName='${self.fullName}' email='${self.email}')>`
    }

    function _splitAuthority(role) {
        var roleParts = role.split(':');
        return {
            group: roleParts[0] || 'NONE',
            level: Number(roleParts[1]) || 0
        }
    }
}
