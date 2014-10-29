var $extend = require('extend');
var $fs = require('fs');
var $path = require('path');
var _ = require('underscore');

var data = {};
var joins = {};
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
            "checkExistIn": [],
            "enum":[],
            "default": "",
            "required": false,
            "requiredIfEmpty": [],
            "editable": true,
            "editableOnlyInsert": false
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

                    field.formatter = field.formatter || {outbound:[],inbound:[]};
                    field.actions = $extend(true, dA, field.actions);
                    field.define = $extend(true, dD, field.define);
                    field.grid = $extend(true, dG, field.grid);
                    if (field.define.key) tables[fN].key = field.field;

                    /*
                    * SafeGuards
                     */
                    if(field.actions.editableOnlyInsert===true) field.actions.editable = false; //safeguard
                    if(field.actions.requiredIfEmpty.length>0) field.actions.required = false; //safeguard
                }


            } catch (e) {
                console.log(e);
            }
        });
        data = tables;
    }
    buildJoins(data);
    return data;
};

var buildJoins = function(tables){
    /*
     * Smart Join Mapping
     * */
    var joinMapper = function(nm,ary,map,tables,tablesDone){
        if(!ary) ary = [];
        var ary2 = [].concat(ary);
        var table = tables[nm];
        var j = table.joins;
        for(jn in j) {
            if (j.hasOwnProperty(jn)) {
                var ary = [].concat(ary2);
                var join = j[jn];
                join.name = jn;
                if(join.type!='0:*' && join.type!='1:*' && join.type!='0:1') {
                    if (tablesDone[jn] !== true) {
                        tablesDone[jn] = true;
                        ary = ary.concat(join);
                        if(map[jn]!==undefined){
                            if(map[jn].length>ary.length){
                                map[jn] = [].concat(ary);
                            }
                        }else{
                            map[jn] = [].concat(ary);
                        }
                        joinMapper(jn, ary, map, tables, tablesDone);
                    }
                }
            }
        }
    };


    var joinMap = {};
    for (tb in tables) {
        if (tables.hasOwnProperty(tb)) {
            var tablesDone = {};
            tablesDone[tb] = true;
            var map = joinMap[tb] = {};
            var table = tables[tb];
            var j = table.joins;
            for(jn in j) {
                if (j.hasOwnProperty(jn)) {
                    var join = j[jn];
                    join.name = jn;
                    if(join.type!='0:*' && join.type!='1:*' && join.type!='0:1') {
                        var ary = [];
                        ary.push(join);
                        map[jn] = [].concat(ary);
                        joinMapper(jn, ary, map, tables, tablesDone);
                    }
                }
            }
        }
    }
    joins = joinMap;
    exports.joins = joins;
}

exports.joins = joins;
exports.load = $setData;
