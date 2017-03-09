'use strict';

module.exports = {
    load: require('./load'),
    Person: require('./Person'),

    Authorizers: {
        isAuthenticated() { return (p) => { return p && p.isAuthenticated || false; } },
        withAll: (a) => { return (p) => p.hasAllAuthority(a); },
        withAny: (a) => { return (p) => p.hasAnyAuthority(a); },
        with: (a) => { return (p) => p.hasAuthority(a); },
    }
}
