'use strict';

module.exports = Person;

Person.guest = {
    get isAuthenticated() { return false },
    get fullName() { return "Guest" },
    get username() { return "Guest" },
    get address() { return {} },
    get roles() { return [] },
    inRole: () => { return false; },
    hasAuthority: () => { return false },
    hasAllAuthority: () => { return false },
    hasAnyAuthority: () => { return false },
    toString: () => { return '<Person(GUEST)>' },
}

function Person(opts) {

    var accessLevels = {};
    var self = {

        get isAuthenticated() { return true }, 
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
        get address() {  return {
            get singleLine() { return opts.singleLine },
            get line1() { return opts.line1 },
            get line2() { return opts.line2 },
            get city() { return opts.city },
            get state() { return opts.state },
            get zip() { return opts.zip }
        } },

        get roles() { return opts.roles || [] },

        inRole: inRole,
        hasAuthority: hasAuthority,
        hasAnyAuthority: hasAnyAuthority,
        hasAllAuthority: hasAllAuthority,

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

        var minAccess = _splitAuthority(min);

        if(accessLevels[minAccess.group] && accessLevels[minAccess.group] >= minAccess.level)
            return true;

        return false;
    }

    function hasAnyAuthority(mins) {
        for(var i = 0; i < mins.length; i++)
            if(hasAuthority(mins[i]))
                return true;

        return false;
    }

    function hasAllAuthority(mins) {
        for(var i = 0; i < mins.length; i++)
            if(!hasAuthority(mins[i]))
                return false;

        return true;
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
