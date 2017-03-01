
'use strict';

module.exports = function tableDesc2KeyMaps(td) {

    /*
     * Convert a table description into an array of indexes decorated with
     * information that can be used to build keys and projection recoreds for
     * any given key on any given record.
     */

    /* !! The first entry MUST be the PK !! */

    var ret = [{
        type: "PI",
        index: "PRIMARY",
        projection: "ALL",
        projectionAttributes: undefined,
        key: keySchema2KeyMap(td.KeySchema) 
    }];

    if(td.GlobalSecondaryIndexes) {
        for(var i = 0; i < td.GlobalSecondaryIndexes.length; i++) {
            var _gsi = td.GlobalSecondaryIndexes[i];
            ret.push({
                type: "GSI",
                index: _gsi.IndexName,
                projection: _gsi.Projection.ProjectionType,
                projectionAttributes: _gsi.Projection.NonKeyAttributes,
                key: keySchema2KeyMap(_gsi.KeySchema)
            });
        }
    }

    if(td.LocalSecondaryIndexes) {
        for(var i = 0; i < td.LocalSecondaryIndexes.length; i++) {
            var _lsi = td.LocalSecondaryIndexes[i];
            ret.push({
                type: "LSI",
                index: _lsi.IndexName,
                projection: _lsi.Projection.ProjectionType,
                projectionAttributes: _lsi.Projection.NonKeyAttributes,
                key: keySchema2KeyMap(_lsi.KeySchema)
            });
        }
    }

    return ret;
}

function keySchema2KeyMap(ks) {

    var ret = {};
    for(var i = 0; i < ks.length; i++)
        ret[ks[i].KeyType] = ks[i].AttributeName;

    return ret;
}
