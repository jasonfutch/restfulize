var $extend = require('extend');
var $fs = require('fs');
var $path = require('path');
var _ = require('underscore');

var data = {};
var dataObjects = {};
var joins = {};
var prevDir = '';

var $setData = function(dirName,aryDataFiles,bolForceRun){
    var tables = {};
    var objects = {};
    if(!aryDataFiles) aryDataFiles = {};
    if(!aryDataFiles.schemas) aryDataFiles.schemas = [];
    if(!aryDataFiles.objects) aryDataFiles.objects = [];
    if(!aryDataFiles.routines) aryDataFiles.routines = [];
    if(!aryDataFiles.helpers) aryDataFiles.helpers = [];
    if(!dirName) dirName = __dirname;
    var dir = $path.join(dirName, './data/schemas/');
    var dirObject = $path.join(dirName, './data/objects/');
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
            "calculated":false,
            "blankToNull": false,
            "uniqueDataField": [],
            "checkExistIn": [],
            "routines":[],
            "enum":[],
            "default": "",
            "preDefault":"",
            "object":"",
            "objectArray":"",
            "allowUpdatingWithPartialObject": true,
            "dynamicChildrenObject":[],
            "allowedEmptyObject":true,
            "allowedEmptyArray":true,
            "allowGenerated":false,
            "caseInsensitive":false,
            "propertyToDynamicObject": false,
            "timestamp": false,
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

        var dirSchemas;
        try {
            var dirLocalSchemas = $fs.readdirSync(dir);
            var localSchema = [];
            dirSchemas.forEach(function (file) {
                localSchema.push(dir + file.replace(/\.[^/.]+$/, ""));
            });

            dirSchemas = aryDataFiles.schemas.concat(localSchema);
        }catch(e){
            dirSchemas = aryDataFiles.schemas;
            if(dirSchemas.length === 0){
                console.error('ERROR: No schemas found');
            }
        }
        dirSchemas.forEach(function (file) {
            try {
                var aryFileName = file.split('/');
                var fN = aryFileName[aryFileName.length-1];
                tables[fN] = require(file);

                /*
                 * Setting generic all field list
                 * */
                tables[fN].lists['*'] = _.keys(tables[fN].fields);

                /*
                 * Adding a field to pull all
                 * */
                var namespace = "";
                var tableName = "";
                if(typeof tables[fN].namespace !== 'undefined' && tables[fN].namespace!==''){
                    namespace = tables[fN].namespace+'.';
                    var aryTableName = (tables[fN].name).split('.');
                    tableName = aryTableName[aryTableName.length-1]+'.';
                }

                tables[fN].fields[namespace+"*"] = {
                    "field": tableName+"*",
                    "actions":{},
                    "define":{}
                };


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
                    if(typeof field.formatter.outbound==='undefined')  field.formatter.outbound = [];
                    if(typeof field.formatter.inbound==='undefined')  field.formatter.inbound = [];
                    field.actions = $extend(true, dA, field.actions);
                    field.define = $extend(true, dD, field.define);
                    //field.grid = $extend(true, dG, field.grid);
                    if (field.define.key) tables[fN].key = list[i];

                    /*
                    * SafeGuards
                     */
                    if(field.actions.calculated===true) field.actions.editable = false; //safeguard
                    if(field.actions.editableOnlyInsert===true) field.actions.editable = false; //safeguard
                    if(field.actions.requiredIfEmpty.length>0) field.actions.required = false; //safeguard
                }


            } catch (e) {
                console.log(e);
            }
        });
        data = tables;
        exports.tables = tables;

        var dirObjects;
        try {
            var dirlocalObjects = $fs.readdirSync(dirObject);

            var localObjects = [];
            dirlocalObjects.forEach(function (file) {
                localObjects.push(dir + file.replace(/\.[^/.]+$/, ""));
            });

            dirObjects = aryDataFiles.objects.concat(localObjects);
        }catch(e){
            dirObjects = aryDataFiles.objects;
        }
        dirObjects.forEach(function (file) {
            try {
                var aryFileName = file.split('/');
                var fN = aryFileName[aryFileName.length-1];
                objects[fN] = require(file);

                /*
                 * Setting field defaults
                 * */
                var list = _.keys(objects[fN].fields);
                var lngColumns = list.length;
                for (var i = 0; i < lngColumns; i++) {
                    var field = objects[fN].fields[list[i]];

                    var dA = $extend(true, {}, defaultActions);
                    var dD = $extend(true, {}, defaultDefine);
                    var dG = $extend(true, {}, defaultGrid);

                    field.formatter = field.formatter || {outbound:[],inbound:[]};
                    if(typeof field.formatter.outbound==='undefined')  field.formatter.outbound = [];
                    if(typeof field.formatter.inbound==='undefined')  field.formatter.inbound = [];
                    field.actions = $extend(true, dA, field.actions);
                    field.define = $extend(true, dD, field.define);

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
        dataObjects = objects;

        exports.dataObjects = dataObjects;
    }
    buildJoins(data);
    buildRoutines(dirName,aryDataFiles);
    buildHelpers(dirName,aryDataFiles);
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
        for(var jn in j) {
            if (j.hasOwnProperty(jn)) {
                var ary = [].concat(ary2);
                var join = j[jn];
                join.name = jn;
                if(join.type!='0:*' && join.type!='1:*' && join.type!='0:1') {
                    if (tablesDone[jn] !== true) {
                        tablesDone[jn] = true;
                        ary = ary.concat(join);
                        if(typeof map[jn]!=='undefined'){
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
    for (var tb in tables) {
        if (tables.hasOwnProperty(tb)) {
            var tablesDone = {};
            tablesDone[tb] = true;
            var map = joinMap[tb] = {};
            var table = tables[tb];
            var j = table.joins;
            for(var jn in j) {
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
};

var buildHelpers = function(dirName,aryDataFiles){
    var objHelpers = {};
    $fs.readdirSync($path.join(__dirname, '/helpers/')).forEach(function(file) {
        var fN = file.replace(/\.[^/.]+$/, "");
        if(fN!=='index'){
            objHelpers[fN]  = require("./helpers/" + fN);
        }
    });

    //Add external routines
    var dirHelpers;
    try {
        var dirlocalHelpers = $fs.readdirSync($path.join(dirName, './data/helpers/'));

        var localHelpers = [];
        dirlocalHelpers.forEach(function (file) {
            localHelpers.push(dir + file.replace(/\.[^/.]+$/, ""));
        });

        dirHelpers = aryDataFiles.helpers.concat(localHelpers);
    }catch(e){
        dirHelpers = aryDataFiles.helpers;
    }

    dirHelpers.forEach(function(file) {
        var aryFileName = file.split('/');
        var fN = aryFileName[aryFileName.length-1];
        if(fN!=='index'){
            objHelpers[fN]  = require(file);
        }
    });
    
    exports.helpers = objHelpers;
};

var buildRoutines = function(dirName,aryDataFiles){
    var objRoutine = {};
    $fs.readdirSync($path.join(__dirname, '/routines/')).forEach(function(file) {
        var fN = file.replace(/\.[^/.]+$/, "");
        if(fN!=='index'){
            objRoutine[fN]  = require("./routines/" + fN);
        }
    });
    
    //Add external routines
    var dirRoutines;
    try {
        var dirlocalRoutines = $fs.readdirSync($path.join(dirName, './data/routines/'));

        var localRoutines = [];
        dirlocalRoutines.forEach(function (file) {
            localRoutines.push(dir + file.replace(/\.[^/.]+$/, ""));
        });

        dirRoutines = aryDataFiles.routines.concat(localRoutines);
    }catch(e){
        dirRoutines = aryDataFiles.routines;
    }
    
    dirRoutines.forEach(function(file) {
        var aryFileName = file.split('/');
        var fN = aryFileName[aryFileName.length-1];
        if(fN!=='index'){
            objRoutine[fN]  = require(file);
        }
    });

    exports.routineDefinitions = objRoutine;
};

exports.joins = joins;
exports.load = $setData;
