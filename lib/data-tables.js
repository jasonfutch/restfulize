var $extend = require('extend');
var $fs = require('fs');
var $path = require('path');
var _ = require('underscore');

var data = {};
var prevDir = '';

var $setData = function(dir,bolForceRun){
    var tables = {};
    if(!dir) dir = $path.join(__dirname, '/../../../data/tables/');
    if(!bolForceRun) bolForceRun = false;

    if(prevDir!==dir || bolForceRun) {
        prevDir = dir;

        var defaultActions = {
            "onRawData": function (value) {
                return value
            },
            "filter": ["trim"],
            "onFilteredData": function (value) {
                return value
            },
            "validator": [],
            "onValidatedData": function (value) {
                return value
            },
            "postFilter": [],
            "onData": function (value) {
                return value
            },
            "uniqueDataField": [],
            "default": "",
            "required": false,
            "editable": true
        };

        var defaultDefine = {
            "type": "text",
            "length": 50,
            "decimal": 0,
            "ext": "",
            "null": false,
            "key": false,
            "autoIncrement": false
        };

        var defaultGrid = {
            "width": 100,
            "min_width": 25,
            "max_width": 200,
            "name": "",
            "sortable": true,
            "hidden": false
        };

        $fs.readdirSync(dir).forEach(function (file) {
            try {
                var fN = file.replace(/\.[^/.]+$/, "");
                tables[fN] = require(dir + fN);

                /*
                 * Setting generic all field list
                 * */
                tables[fN].lists['*'] = _.keys(tables[fN].fields);

                /*
                 * Setting field defaults
                 * */
                var list = tables[fN].lists['*'];
                var lngColumns = list.length;
                for (var i = 0; i < lngColumns; i++) {
                    var field = tables[fN].fields[list[i]];

                    var dA = $extend(true, {}, defaultActions);
                    var dD = $extend(true, {}, defaultDefine);
                    var dG = $extend(true, {}, defaultGrid);

                    field.actions = $extend(true, dA, field.actions);
                    field.define = $extend(true, dD, field.define);
                    field.grid = $extend(true, dG, field.grid);
                    if (field.define.key) tables[fN].key = field.field;
                }


            } catch (e) {
                console.log(e);
            }
        });
        data = tables;
    }
    return data;
};

exports.load = $setData;
