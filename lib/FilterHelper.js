'use strict';

const OPERATORS = {
    "EQ": "=",
    "LT": "<",
    "LE": "<=",
    "GT": ">",
    "GE": ">=",
    "BEGINSWITH": "BEGINSWITH",
    "BETWEEN": "BETWEEN",
    "CONTAINS": "CONTAINS",
    "IN": "IN"
};

var FilterHelper = function FilterHelperConstructor(opts) {
    var aliasFieldIndex = 0,
        aliasValueIndex = 0,
        aliasList = {},
        ean = opts.ExpressionAttributeNames || {},
        eav = opts.ExpressionAttributeValues || {},
        fe = [];

    if(opts.FilterExpression)
        fe.push(opts.FilterExpression);

    return {
        addFilter: addFilter,
        addFilters: addFilters,
        compileQuery: compileQuery
    };

    // --------------------------------------------------------------------

    function addFilter(field, operator, values) {

        var _fieldParts = field.split('.'),
            _eanAliasList = [],
            _eavAliasList = [],
            _eanAlias,
            _operator = OPERATORS.hasOwnProperty(operator)
                ? OPERATORS[operator]
                : operator;

        for(var i = 0; i < _fieldParts.length; i++) {
            var newFieldAlias = _getFieldAlias(_fieldParts[i]);
            _eanAliasList.push(newFieldAlias);
            ean[newFieldAlias] = _fieldParts[i];
        }

        for(var i = 0; i < values.length; i++) {
            var newAlias = _getValueAlias(values[i]);
            _eavAliasList.push(newAlias);
            eav[newAlias] = values[i];
        }

        _eanAlias = _eanAliasList.join('.');

        switch(_operator) {
            case "BETWEEN":
                fe.push(`${_eanAlias} BETWEEN ${_eavAliasList[0]} AND ${_eavAliasList[1]}`);
                break;

            case "BEGINSWITH":
                fe.push(`begins_with(${_eanAlias}, ${_eavAliasList[0]})`);
                break;

            case "CONTAINS":
                fe.push(`contains(${_eanAlias}, ${_eavAliasList[0]})`);
                break;

            case "IN":
                fe.push(`${_eanAlias} IN (${_eavAliasList.join(', ')})`);
                break;

            default:
                fe.push(`${_eanAlias} ${_operator} ${_eavAliasList[0]}`);
        }
    }

    function addFilters(args) {
        for(var i = 0; i < args.length; i++)
            addFilter.apply(this, args[i]);
    }

    function compileQuery() {
        opts.ExpressionAttributeNames = ean;
        opts.ExpressionAttributeValues = eav;
        opts.FilterExpression = fe.join(" AND ");
        return opts;
    }

    function _getFieldAlias(field, group) {
        var _prefix = group || 'F';

        if(aliasList.hasOwnProperty(field))
            return aliasList[field];

        return aliasList[field] = `#${_prefix}${aliasFieldIndex++}`;
    }

    function _getValueAlias(field, group) {
        var _prefix = group || 'V';
        return `:${_prefix}${aliasValueIndex++}`;
    }
};

FilterHelper.parseFilterString = function parseFilterString(str) {
    if(!str || typeof str !== 'string')
        return null;

    var filters = str.split(';'),
        filterParts, argumentParts,
        ret = [];

    try {

        for(var i = 0; i < filters.length; i++) {
            filterParts = filters[i].split(':');
            argumentParts = filterParts[2] && filterParts[2].split(',');

            if(filterParts.length !== 3)
                return null;

            else if(OPERATORS.hasOwnProperty(filterParts[1]) < 0)
                return null;

            else if(filterParts[1] === "BETWEEN" && argumentParts.length !== 2)
                return null;

            filterParts[2] = argumentParts;

            ret.push(filterParts);
        }

        return ret;

    } catch (e) {
        return null;
    }
};

module.exports = FilterHelper;
