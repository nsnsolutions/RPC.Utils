'use strict';

const objectPath = require('object-path');

module.exports = function verifiableObject(obj, name) {
    
    var self = Object.create(obj),
        op = objectPath(obj),
        name = name || "context";
    
    self.assertMember = assertMember;
    self.ensureExists = op.ensureExists;
    self.get = op.get;
    self.set = op.set;
    self.has = ensureMember;
    self.raw = obj;

    return self;

    // ------------------------------------------------------------------------

    function ensureMember(path, type) { 
        var result = searchMembers(path, type);
        return result.found && result.type;
    }

    function assertMember(path, type) { 
        var result = searchMembers(path, type);

        if(!result.found)
            throw {
                name: "MemberNotFoundError",
                message: `${path} does not exist in ${name}.`
            };

        else if(!result.type)
            throw {
                name: "UnexpectedTypeError",
                message: `Unexpected value for ${path}. Expected ${typeof type()}`
            };
    }

    function searchMembers(path, type) {
        if(!op.has(path)) {
            return { found: false, type: undefined };
        } else if(typeof type !== 'undefined') {
            var v = op.get(path);
            if(type === Array) {
                return { found: true, type: v === Object(v) && 'splice' in v };
            } else if(type === Object) {
                return { found: true, type: v === Object(v) && !('splice' in v) };
            } else {
                return { found: true, type: (v === type(v)) };
            }
        } else {
            return { found: true, type: true };
        }
    }

};
