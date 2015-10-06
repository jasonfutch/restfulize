var $restfulize = require('restfulize');
var $restfulFilters = require('./filters');
var $restfulFormatters = require('./formatters');
var $restfulValidators = require('./validators');
var $restfulRequest = require('./request');
var $restfulRoutines = require('./routines');
var $restfulSqlString = require('./sql-string');
var $sqlString = require('sql-string');
var $sql = require('./postgres');
var $extend = require('extend');
var _ = require('underscore');
var _string = require('underscore.string');
var $q = require('q');
var $async = require('async');

module.exports = function restfulActions(tables, req, res, errorHandler){
    var self = this;
    this.tables = tables;
    this.dataObjects = {};
    this.$restfulFilter = null;
    this.$restfulFormatter = null;
    this.$restfulValidator = null;
    this.onError = function(status, code, msg, field, obj){ return errorHandler.error(status, code, msg, field, obj) };

    this.$init = function(){
        console.time('action.js:$init');
        //self.tables = $extend(true, {}, self.tables);
        self.dataObjects = $extend(true, {}, $restfulize.dataObjects);
        self.$restfulFormatter = new $restfulFormatters(tables, req, res, errorHandler);
        self.$restfulFilter = new $restfulFilters(tables, req, res, errorHandler);
        self.$restfulRoutine = new $restfulRoutines(tables, req, res, errorHandler);
        self.$restfulValidator = new $restfulValidators(tables, req, res, errorHandler);
        console.timeEnd('action.js:$init');
    };

    this.PUT = function(obj, params){
        return self.build('put', obj, params);
    };

    this.POST = function(obj, params){
        return self.build('post', obj, params);
    };

    this.parse = function(obj, params){
        return self.build('', obj, params);
    };

    this.formatResponse = function(obj,data,bolOrgResponse){
        //var lngStructure = obj.structure.length;
        if(_.isArray(data)){
            var lngData = data.length;
            for(var x=0;x<lngData;x++){
                data[x] = self.$formatResponseObj(obj,data[x],bolOrgResponse);
                data[x] = self.$formatResponseStructure(obj,data[x]);
            }
        }else{
            data = self.$formatResponseObj(obj,data,bolOrgResponse);
            data = self.$formatResponseStructure(obj,data);
        }
        return data;
    };

    this.getValidators = function(obj,response){
        if(!response) response = {};

        var objValidators = {};
        var lngColumns = obj.columns.length;
        for(var i=0;i<lngColumns;i++){
            var objValidator = {};
            var column = obj.columns[i];
            var validatorList = column.actions.validator;
            var lngValidatorList = validatorList.length;
            for(var x=0;x<lngValidatorList;x++){
                var validator = self.$getBracketParams({
                    name: validatorList[x],
                    params: []
                });

                var singleValidator = self.$restfulValidator[validator.name];
                if(typeof singleValidator!=='undefined'){
                    if(typeof singleValidator.define!=='undefined'){
                        var singleReturn = singleValidator.define.apply(this, validator.params);
                        objValidator = $extend(true, objValidator, singleReturn);
                    }
                }
            }
            if(column.actions.required && column.actions.editable) objValidator.required = column.actions.required;
            if(column.actions.requiredIfEmpty.length>0 && column.actions.editable) objValidator.requiredIfEmpty = column.actions.requiredIfEmpty;
            if(column.actions.editable===false) objValidator.editable = column.actions.editable;
            if(column.actions.editableOnlyInsert===true) objValidator.editableOnlyInsert = column.actions.editableOnlyInsert;
            if(column.actions.enum.length>0) objValidator.enum = column.actions.enum;
            if(_.isEmpty(objValidator)===false) objValidators[column.field] = objValidator;
        }
        response.validators = objValidators;
        return response;
    };

    this.build = function(type, obj, params){

        return $q.Promise(function(resolve, reject, notify) {
            try {

                /*
                * check for collected errors
                */
                var hasBuildErrors = function(){
                    if (errorHandler.hasErrors()){
                        reject();
                        return true; //return because it is function is "HAS build errors"
                    }
                };


                //if (_.size(obj.body) === 0 && (type==='post' || type==='put')) {
                //    self.onError(400,194,'The passed JSON object is empty.');
                //    reject();
                //}

                var buildComplete = function (orgData) {
                    if (!orgData) orgData = null;

                    var routinesToProcess = [];
                    var checkExistInToProcess = [];
                    var requiredIfEmptyToProcess = [];
                    var table = self.tables[params.table.name];

                    var objBuild = {
                        "body": obj.body,
                        "orgData": orgData,
                        "table": table,
                        "type": type,
                        "params": params,
                        "namespace": table.namespace
                    };

                    obj.fields = [];

                    /*
                     * initialize routines
                     * - prepares all routines for proccessing
                     */
                    self.$restfulRoutine.initialize(objBuild, obj).then(function(){
                        //console.log('initialize');
                        //if any errors found lets reject and exit
                        if (hasBuildErrors()) return false;

                        /*
                         * onBeforeRaw
                         * - processes routines that contain a onBeforeRaw
                         */
                        self.$restfulRoutine.onBeforeRaw(objBuild, obj).then(function(){
                            //console.log('onBeforeRaw');
                            //if any errors found lets reject and exit
                            if (hasBuildErrors()) return false;



                            /*********************************************************************************************
                             * BEGIN - 'RESERVED AREA FOR FUTURE WHATEVER.. IF NEEDED'
                             */

                            /*
                             * END - 'RESERVED AREA FOR FUTURE WHATEVER.. IF NEEDED'
                             *********************************************************************************************/

                            /*
                             * onRaw
                             * - processes routines that contain a onRaw
                             */
                            self.$restfulRoutine.onRaw(objBuild, obj).then(function() {
                                //console.log('onRaw');
                                //if any errors found lets reject and exit
                                if (hasBuildErrors()) return false;

                                /*********************************************************************************************
                                 * BEGIN 'THIS BLOCK NEEDS RELOCATING'
                                 * - this should be moved to separate onRaw Routines
                                 * */

                                // This should be moved to an onRaw Routine
                                var forceItems = obj._force;
                                for (var item in forceItems) {
                                    if (forceItems.hasOwnProperty(item)) {
                                        objBuild.body[item] = forceItems[item];
                                    }
                                }

                                // This should be moved to an onRaw Routine
                                var useAsItems = obj._useAs;
                                for (var item in useAsItems) {
                                    if (useAsItems.hasOwnProperty(item)) {
                                        if (typeof objBuild.body[useAsItems[item]] !== 'undefined') {
                                            objBuild.body[item] = objBuild.body[useAsItems[item]];
                                        } else {
                                            if (typeof objBuild.body[item] !== 'undefined') {
                                                delete objBuild.body[item];
                                            } else {
                                                var aryItem = item.split('.');
                                                if (aryItem.length === 1) {
                                                    if (typeof objBuild.body[objBuild.namespace + '.' + item] !== 'undefined') {
                                                        delete objBuild.body[objBuild.namespace + '.' + item];
                                                    }
                                                } else {
                                                    if (typeof objBuild.body[aryItem[1]] !== 'undefined') {
                                                        delete objBuild.body[aryItem[1]];
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                /*
                                 * END 'THIS BLOCK NEEDS RELOCATING'
                                 *********************************************************************************************/


                                /*
                                 * Force namespaces, if the application is using them
                                 */
                                if (typeof objBuild.namespace !== 'undefined' && objBuild.namespace !== ''){

                                    //for sent body
                                    for (var item in objBuild.body) {
                                        var aryItem = item.split('.');
                                        if (aryItem.length === 1) {
                                            if(typeof objBuild.body[objBuild.namespace + '.' + item]==='undefined'){
                                                objBuild.body[objBuild.namespace + '.' + item] = objBuild.body[item];
                                            }
                                            delete objBuild.body[item];
                                        }
                                    }

                                    //for original data
                                    if (objBuild.orgData !== null) {
                                        for (var item in objBuild.orgData) {
                                            var aryItem = item.split('.');
                                            if (aryItem.length === 1) {
                                                objBuild.orgData[objBuild.namespace + '.' + item] = objBuild.orgData[item];
                                                delete objBuild.orgData[item];
                                            }
                                        }
                                    }
                                }

                                /*
                                 * onAfterRaw
                                 * - processes routines that contain a onAfterRaw
                                 */
                                self.$restfulRoutine.onAfterRaw(objBuild, obj).then(function(){
                                    //console.log('onAfterRaw');
                                    //if any errors found lets reject and exit
                                    if (hasBuildErrors()) return false;



                                    /*********************************************************************************************
                                     * BEGIN - 'RESERVED AREA FOR FUTURE WHATEVER.. IF NEEDED'
                                     */

                                    /*
                                     * END - 'RESERVED AREA FOR FUTURE WHATEVER.. IF NEEDED'
                                     *********************************************************************************************/


                                    /*
                                     * onBeforeActions
                                     * - processes routines that contain a onBeforeActions
                                     */
                                    self.$restfulRoutine.onBeforeActions(objBuild, obj).then(function(){
                                        //console.log('onBeforeActions');
                                        //if any errors found lets reject and exit
                                        if (hasBuildErrors()) return false;

                                        $async.forEachOfSeries(objBuild.body, function(v,item,callback) {
                                            //console.log('eachSeries: '+item);
                                            var column = objBuild.table.fields[item];
                                            if (typeof column !== 'undefined') {
                                                var field = column.field;

                                                //extend jsonb data types with originalData for supporting updates to partial data.
                                                if (column.define.type === 'jsonb') {
                                                    if (column.actions.propertyToDynamicObject && _.isObject(objBuild.body[item]) === false) {

                                                        var lngDynamicChildrenObject = column.actions.dynamicChildrenObject.length;

                                                        var funcDynamicChildrenObject = function (param, value, idxArray) {
                                                            var objChild = column.actions.dynamicChildrenObject[idxArray];
                                                            var thisParam = self.$getReqVariable(objChild.default);
                                                            var lockedToDefault = self.$getReqVariable(objChild.lockedToDefault);

                                                            if (objChild.queryParam !== '' && typeof req.query[objChild.queryParam] !== 'undefined' && lockedToDefault === false) {
                                                                var queryParam = req.query[objChild.queryParam];
                                                                var list = self.$getReqVariable(objChild.list);
                                                                if (list.indexOf(queryParam) > -1) {
                                                                    thisParam = queryParam;
                                                                }
                                                            }
                                                            if (lngDynamicChildrenObject > idxArray + 1) {
                                                                if (typeof param[thisParam] === 'undefined') param[thisParam] = {};
                                                                param[thisParam] = funcDynamicChildrenObject(param[thisParam], value, idxArray + 1)
                                                            } else {
                                                                if (typeof param[thisParam] === 'undefined') param[thisParam] = value;
                                                            }

                                                            return param;
                                                        };
                                                        objBuild.body[item] = funcDynamicChildrenObject({}, objBuild.body[item], 0);
                                                    }

                                                    if (objBuild.orgData !== null) {
                                                        if(typeof column.actions.objectArray!=='undefined' && column.actions.objectArray!=='') {
                                                            //do not extend because it is an array and should be replaced
                                                        }else{
                                                            objBuild.body[item] = $extend(true, objBuild.orgData[item], objBuild.body[item]);
                                                        }
                                                    }
                                                }


                                                var value = self.$processFields(objBuild.table,column, objBuild.body[item], item, obj.strict, type, obj._force);
                                                if (value === false) {
                                                    delete objBuild.body[item];
                                                    callback();
                                                } else {
                                                    objBuild.body[item] = value;

                                                    /*
                                                     * onFieldAction
                                                     * - processes routines that contain a onFieldAction
                                                     */
                                                    self.$restfulRoutine.onFieldAction(objBuild, obj, item).then(function(){
                                                        //console.log('onFieldAction (eachSeries): '+item);

                                                        /*********************************************************************************************
                                                         * BEGIN 'THIS BLOCK NEEDS RELOCATING'
                                                         * - this should be moved to separate onFieldAction Routines
                                                         * */

                                                        /*
                                                         * checkExistIn
                                                         * */
                                                        if (column.actions.checkExistIn.length > 0) {
                                                            checkExistInToProcess.push({
                                                                field: item,
                                                                column: column
                                                            });
                                                        }

                                                        /*
                                                         * requiredIfEmpty
                                                         * */
                                                        if (column.actions.requiredIfEmpty.length > 0) {
                                                            requiredIfEmptyToProcess.push({
                                                                field: item,
                                                                column: column
                                                            });
                                                        }
                                                        /*
                                                         * END 'THIS BLOCK NEEDS RELOCATING'
                                                         *********************************************************************************************/

                                                        obj.fields.push({
                                                            alias: item,
                                                            field: field,
                                                            value: objBuild.body[item]
                                                        });
                                                        callback();
                                                    });
                                                }
                                            } else{
                                                if (_.isObject(objBuild.body[item]) === false && _.isArray(objBuild.body[item]) === false && obj.strict) {
                                                    self.onError(400, 100, item + ' is not recognized.');
                                                    reject();
                                                    callback(true);
                                                }else{
                                                    callback();
                                                }
                                            }
                                        },function(err){
                                            if(err){
                                                reject();
                                                return false;
                                            }
                                            /*
                                             * onInitialActions
                                             * - processes routines that contain a onInitialActions
                                             */
                                            self.$restfulRoutine.onInitialActions(objBuild, obj).then(function(){
                                                //console.log('onInitialActions');
                                                //if any errors found lets reject and exit
                                                if (hasBuildErrors()) return false;

                                                //save point
                                                obj.body = objBuild.body;

                                                var lngFields = obj.columns.length;
                                                for (var i = 0; i < lngFields; i++) {
                                                    var column = obj.columns[i];
                                                    var field = column.field;

                                                    /*
                                                     * If timestamp available then add it.
                                                     * */
                                                    if (column.actions.timestamp === true) {
                                                        objBuild.body[field] = self.$processFields(objBuild.table,objBuild.table.fields[field], "now()", field, obj.strict, type, obj._force, true);
                                                        obj.fields.push({
                                                            alias: field,
                                                            field: objBuild.table.fields[field].field,
                                                            value: "now()"
                                                        });
                                                    }


                                                    /*
                                                     * Make sure all required fields are present
                                                     * */
                                                    if (type === 'post') {
                                                        if (column.actions.required === true) {
                                                            if (column.actions.editable === false || column.actions.allowGenerated === true) {
                                                                if (_.isUndefined(objBuild.body[field])) {
                                                                    try {
                                                                        objBuild.body[field] = self.$processFields(objBuild.table,objBuild.table.fields[field], "", field, obj.strict, type, obj._force, true);
                                                                        obj.fields.push({
                                                                            alias: field,
                                                                            field: objBuild.table.fields[field].field,
                                                                            value: objBuild.body[field]
                                                                        });
                                                                    } catch (e) {
                                                                        console.error(e);
                                                                    }

                                                                }
                                                            } else {
                                                                if (_.isUndefined(objBuild.body[field])){
                                                                    self.onError(400, 100, 'Required field.', self.$removeNameSpace(field,objBuild.namespace));
                                                                }
                                                            }
                                                        }
                                                    }


                                                    /*
                                                     * make sure all uniqueDataFields are required
                                                     * */
                                                    //if(column.actions.uniqueDataField.length>0){
                                                    //    strUniqueDataField = self.$processUniqueDataFields(field,column,obj,strUniqueDataField);
                                                    //}
                                                }

                                                /*
                                                 * onActions
                                                 * - processes routines that contain a onActions
                                                 */
                                                self.$restfulRoutine.onActions(objBuild, obj).then(function(){
                                                    //console.log('onActions');

                                                    //if any errors found lets reject and exit
                                                    if (hasBuildErrors()) return false;

                                                    /*********************************************************************************************
                                                     * BEGIN - 'RESERVED AREA FOR FUTURE WHATEVER.. IF NEEDED'
                                                     */

                                                    /*
                                                     * END - 'RESERVED AREA FOR FUTURE WHATEVER.. IF NEEDED'
                                                     *********************************************************************************************/

                                                    /*
                                                     * onAfterActions
                                                     * - processes routines that contain a onAfterActions
                                                     */
                                                    self.$restfulRoutine.onAfterActions(objBuild, obj).then(function(){
                                                        //console.log('onAfterActions');

                                                        //if any errors found lets reject and exit
                                                        if (hasBuildErrors()) return false;

                                                        //save point
                                                        obj.body = objBuild.body;


                                                        self.$restfulRoutine.onComplete(objBuild, obj).then(function(){
                                                            //console.log('onComplete');

                                                            //if any errors found lets reject and exit
                                                            if (hasBuildErrors()) return false;

                                                            //save point
                                                            obj.body = objBuild.body;

                                                            //if any errors found lets reject and exit
                                                            if (hasBuildErrors()) return false;

                                                            //save point
                                                            obj.body = objBuild.body;

                                                            var cntRequiredIfEmpty = requiredIfEmptyToProcess.length;

                                                            if (cntRequiredIfEmpty > 0) {
                                                                var objTemp = $extend(true, {}, obj);
                                                                if (objBuild.orgData != null) {
                                                                    objTemp.body = $extend(true, objBuild.orgData, objTemp.body);
                                                                }
                                                            }


                                                            /*
                                                             * Check for requiredIfEmpty data if required
                                                             * */
                                                            if (cntRequiredIfEmpty > 0) {
                                                                for (i = 0; i < cntRequiredIfEmpty; i++) {
                                                                    var requiredIfEmpty = requiredIfEmptyToProcess[i];
                                                                    self.$runRequiredIfEmpty(requiredIfEmpty.field, requiredIfEmpty.column, objTemp);
                                                                }
                                                            }

                                                            //if any errors found lets reject and exit
                                                            if (errorHandler.hasErrors()){
                                                                reject();
                                                                return false;
                                                            }


                                                            var cntCheckExistIn = checkExistInToProcess.length;
                                                            if (cntCheckExistIn > 0) {
                                                                self.$runCheckExistIn(checkExistInToProcess, obj).then(function () {
                                                                    resolve(obj);
                                                                }, function () {
                                                                    reject();
                                                                });
                                                            } else {
                                                                resolve(obj);
                                                            }

                                                        },
                                                        function(){
                                                            reject();
                                                        });
                                                    },
                                                    function(){
                                                        reject();
                                                    });
                                                },
                                                function(){
                                                    reject();
                                                });
                                            },
                                            function(){
                                                reject();
                                            });
                                        });
                                    },
                                    function(){
                                        reject();
                                    })
                                },
                                function(){
                                    reject();
                                });
                            },
                            function(){
                                reject();
                            });
                        },
                        function(){
                            reject();
                        });
                    },
                    function(){
                        reject();
                    });
                };

                /*
                 * Grab original data for comparing if updating
                 * */
                 if (type === 'put') {
                    self.$getOrginalData(obj).then(function (orgData) {
                        buildComplete(orgData);
                    }).fail(function () {
                        reject();
                    });
                } else {
                    buildComplete();
                }
            }catch(e){
                console.error(e);
            }
        });
    };

    this.$getOrginalData = function(obj){
        var restfulRequest = new $restfulRequest(tables, req, res, errorHandler);

        var deferred = $q.defer();

        if(obj._skipExistCheck){
            deferred.resolve(undefined)
        }else {
            var objTemp = restfulRequest.emptyObject();
            objTemp.table = obj.table;
            objTemp.filters = obj.filters;
            objTemp._filters = obj._filters;
            objTemp.limit = 1;

            var restfulSqlString = new $restfulSqlString();
            var strSQL = restfulSqlString.select(obj);
            //console.log(strSQL)
            $sql.connect().then(function (connection) {
                connection.execute(strSQL).then(function (rows) {
                    if (rows.length > 0) {
                        connection.release();
                        deferred.resolve(self.formatResponse(obj,rows[0],true));
                    } else {
                        //clone and remove auth filter to check if exists
                        var objTemp = $extend(true, {}, obj);
                        delete objTemp._auth;
                        var strSQL = restfulSqlString.exist(objTemp);
                        connection.execute(strSQL).then(function (rows) {
                            connection.release();
                            if (rows.length > 0) {
                                self.onError(403, 100, 'This record is forbidden.');
                            } else {
                                self.onError(404, 100, 'Record was not found.');
                            }
                            deferred.reject();
                        }, function (err) {
                            connection.release();
                            res.send(err);
                        });
                    }
                }, function (err) {
                    connection.release();
                    res.send(err);
                });
            });
        }
        return deferred.promise;
    };

    this.$runCheckExistIn = function(ary,obj){
        var restfulRequest = new $restfulRequest(tables, req, res, errorHandler);
        var deferred = $q.defer();

        $async.eachSeries(ary, function(o, callback) {
            if ((obj.body[o.field] === '' || obj.body[o.field] === 'null' || obj.body[o.field] === null) && o.column.define.null===true) {
                //console.log('set to null');
                callback();
            }else{
                var objCheck = o.column.actions.checkExistIn[0];
                var tableDef = self.tables[objCheck.table];
                var table = restfulRequest.$dbToName(tableDef.name, obj);
                var filters = restfulRequest.buildFilter(objCheck.filter, tableDef.fields, [{
                    regex: /\{field_value\}/g,
                    value: obj.body[o.field] + ""
                }]);
                var objTemp = restfulRequest.emptyObject();
                objTemp.table = table;
                objTemp.filters = filters;
                objTemp.limit = 1;

                var restfulSqlString = new $restfulSqlString();

                var strSQL = restfulSqlString.exist(objTemp);
                //console.log(strSQL);

                $sql.connect().then(function (connection) {
                    connection.execute(strSQL).then(function (rows) {
                        connection.release();
                        if (rows.length > 0) {
                            callback();
                        } else {
                            self.onError(409, 165, "Can not find corresponding record in table '" + objCheck.table + "' with " + o.field + "='" + obj.body[o.field] + "'.");
                            deferred.reject();
                        }
                    },function(err){
                        connection.release();
                        res.send(err);
                    });
                });
            }
        }, function(err) {
            if (err) console.error(err);
            deferred.resolve();
        });

        return deferred.promise;
    };

    this.$runRequiredIfEmpty = function(field,column,obj){
        var cntRequiredIfEmpty = column.actions.requiredIfEmpty.length;
        if(obj.body[field]===''){
            var isEmpty = true;
            for (var i = 0; i < cntRequiredIfEmpty; i++) {
                var requiredIfEmpty = column.actions.requiredIfEmpty[i];
                if(obj.body[requiredIfEmpty]!=='') isEmpty = false
            }
            if(isEmpty) self.onError(400,100, 'Required when '+column.actions.requiredIfEmpty.toString()+' is blank',field);
        }
    };

    this.$formatResponseObj = function(obj,data,bolOrgResponse){
        if(!bolOrgResponse) bolOrgResponse = false;
        var lngColumns = obj.columns.length;
        for(var i=0;i<lngColumns;i++){
            var col = obj.columns[i];
            if(col.formatter.outbound.length>0){
                if(typeof data[col.field]!=='undefined'){
                    data[col.field] = self.$restfulFormatter.$processFormatters(col.field,data[col.field],col.formatter.outbound);
                }else{
                    var aryField = col.field.split('.');
                    if(aryField.length>1){
                        data[aryField[1]] = self.$restfulFormatter.$processFormatters(col.field,data[aryField[1]],col.formatter.outbound);
                    }
                }
            }

            if(col.actions.propertyToDynamicObject && bolOrgResponse===false){
                var lngDynamicChildrenObject = col.actions.dynamicChildrenObject.length;
                var target = data[col.field];
                for(var x=0;x<lngDynamicChildrenObject;x++){
                    var objChild = col.actions.dynamicChildrenObject[x];
                    var thisParam = self.$getReqVariable(objChild.default);
                    var lockedToDefault = self.$getReqVariable(objChild.lockedToDefault);

                    if(objChild.queryParam!=='' && typeof req.query[objChild.queryParam]!=='undefined' && lockedToDefault===false) {
                        thisParam = req.query[objChild.queryParam];
                    }

                    if(typeof target[thisParam]!=='undefined'){
                        target = target[thisParam];
                    }else{
                        target = "";
                        break;
                    }
                }

                data[col.field] = target;
            }

            if(data[col.field]===null || data[col.field]==="null") data[col.field] = "";
        }
        var useAsItems = obj._useAs;
        for (var item in useAsItems) {
            if (useAsItems.hasOwnProperty(item)) {
                if(typeof data[useAsItems[item]]!=='undefined'){
                    data[item] = data[useAsItems[item]];
                    delete data[useAsItems[item]];
                }
            }
        }
        return data;
    };

    //this.$formatResponseStructure = function(obj,data){
    //    var objStructure = obj.structure;
    //    var lngStructure = objStructure.length;
    //
    //    if(lngStructure>0) {
    //        /*build data holder*/
    //        var holder = {};
    //        for(var i=0; i<lngStructure;i++) {
    //            var arySection = objStructure[i].arySection;
    //            var folder_holder = holder;
    //            var lngSection = arySection.length;
    //            for(var ii=0;ii<lngSection;ii++){
    //                if(folder_holder[arySection[ii]]===undefined) folder_holder[arySection[ii]] = {};
    //                folder_holder = folder_holder[arySection[ii]];
    //            }
    //        }
    //        var newObj = {};
    //        for (param in data) {
    //            if (data.hasOwnProperty(param)) {
    //                var bolParam = false;
    //                for(var x=0; x<lngStructure;x++) {
    //                    var structure = objStructure[x];
    //                    if(param.substring(0, structure.param.length) === structure.param){
    //                        arySection = objStructure[x].arySection;
    //                        folder_holder = holder;
    //                        lngSection = arySection.length;
    //                        for(var xx=0;xx<lngSection;xx++){
    //                           folder_holder = folder_holder[arySection[xx]];
    //                           if(xx===arySection.length-1) folder_holder[param] = data[param];
    //                        }
    //                        bolParam = true;
    //                        break;
    //                    }
    //                }
    //                if(bolParam===false) newObj[param] = data[param];
    //            }
    //        }
    //
    //        newObj = $extend(true, newObj, holder);
    //        return newObj;
    //    }else{
    //        return data;
    //    }
    //};

    this.$formatResponseStructure = function(obj,data){
        var newObj = {};
        for (var param in data) {
            if (data.hasOwnProperty(param)) {
                var arrayParam = param.split('.');
                if(arrayParam.length>1){
                    if(obj.namespace===arrayParam[0]){
                        newObj[arrayParam[1]] = data[param];
                    }else{
                        if(typeof newObj[arrayParam[0]]==='undefined') newObj[arrayParam[0]] = {};
                        newObj[arrayParam[0]][arrayParam[1]] = data[param];
                    }
                }else{
                    newObj[param] = data[param];
                }
            }
        }

        return newObj;
    };

    this.$processFields = function(table, column, value, field, bolStrict, type, force, bolPrivate, objName){ //bolPrivate means the data is coming from internal and assumed safe
        var temp;
        if(!bolPrivate) bolPrivate = false;
        if(!objName) objName = '';

        //setting value to string
        if(_.isObject(value)===false) value = value+'';

        if(typeof column === 'undefined') return false;

        if(column.actions.preDefault!=='' && value===''){
            value = column.actions.preDefault+'';
        }

        if((column.actions.editable===false && bolPrivate===false && column.actions.editableOnlyInsert===false) || (column.actions.editable===false && bolPrivate===false && column.actions.editableOnlyInsert===true && type.toLowerCase()==="put")){
            if(typeof force[field]==='undefined'){
                if(bolStrict){
                    return self.onError(400,100, 'Can not be edited.',self.$removeNameSpace(field,table.namespace,objName));
                }else{
                    return false;
                }
            }
        }

        //onRawData
        temp = column.actions.onRawData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onRawData',self.$removeNameSpace(field,table.namespace,objName));
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }

        //filter
        value = self.$processFilters(field, value, column.actions.filter);

        //onFilteredData
        temp = column.actions.onFilteredData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onFilteredData',self.$removeNameSpace(field,table.namespace,objName));
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }

        //validator
        self.$processValidators(field, value, column.actions.validator);

        //onValidatedData
        temp = column.actions.onValidatedData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onValidatedData',self.$removeNameSpace(field,table.namespace,objName));
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }

        //array of objects
        if(column.actions.dynamicChildrenObject.length>0) {
            var lngDynamicChildrenObject = column.actions.dynamicChildrenObject.length;

            var funcDynamicChildrenObject = function(param,idxArray){
                var objChild = column.actions.dynamicChildrenObject[idxArray];
                    switch(objChild.type){
                        case 'force':
                            var list = self.$getReqVariable(objChild.list);
                            var lngList = list.length;
                            for(var x=0;x<lngList;x++){
                                if(lngDynamicChildrenObject > idxArray+1){
                                    if(typeof param[list[x]]==='undefined') param[list[x]] = {};
                                    param[list[x]] = funcDynamicChildrenObject(param[list[x]],idxArray+1)
                                }else{
                                    if(typeof param[list[x]]==='undefined') param[list[x]] = "";
                                }
                            }
                            break;
                    }

                return param;
            };
            value = funcDynamicChildrenObject(value,0);
        }

        //object
        if(column.actions.object!==''){
            value = self.$processObject(table, field, value, column.actions.object, bolStrict, type, force, bolPrivate,self.$removeNameSpace(field,table.namespace,objName)+'');
        }

        //array of objects
        if(column.actions.objectArray!==''){
            value = self.$processObjectArray(table, field, value, column.actions.objectArray, bolStrict, type, force, bolPrivate,self.$removeNameSpace(field,table.namespace,objName));
        }

        //postFilter
        value = self.$processFilters(field, value, column.actions.postFilter);

        //onData
        temp = column.actions.onData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onData',self.$removeNameSpace(field,table.namespace,objName));
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }

        if((column.actions.required===true && value==='') || (column.actions.required===true && value==='{}' && column.actions.allowedEmptyObject===false) || (column.actions.required===true && value==='[]' && column.actions.allowedEmptyArray===false)){
            if(column.actions.default===''){
                if(column.actions.required===true && value==='[]' && column.actions.allowedEmptyArray===false){
                    return self.onError(400,100, 'Array can not be empty',self.$removeNameSpace(field,table.namespace,objName));
                }
                if(column.actions.required===true && value==='{}' && column.actions.allowedEmptyObject===false){
                    return self.onError(400,100, 'Object can not be empty',self.$removeNameSpace(field,table.namespace,objName));
                }
                return self.onError(400,100, 'Required field.',self.$removeNameSpace(field,table.namespace,objName));
            }else{
                value = column.actions.default;
            }
        }

        //enum
        value = self.$processEnum(self.$removeNameSpace(field,table.namespace,objName), value, column.actions.enum);

        if(column.actions.blankToNull===true) value = null;

        return value;
    };

    this.$removeNameSpace = function(field,namespace,parent){
        var tempField;
        if(_string.startsWith(field,namespace+'.')){
            var aryField = field.split('.');
            tempField = aryField[1];
        }else{
            tempField = field+'';
        }
        if(parent!=='' && typeof parent!=='undefined'){
            return parent+'.'+tempField;
        }else{
            return tempField;
        }
    };

    this.$getReqVariable = function(variable){
        var isBooleanSwitch = false;
        if(variable.charAt(0)==='!'){
            isBooleanSwitch = true;
            variable = variable.substr(1);
        }
        var aryVariable = variable.split('.');
        var lngVariable = aryVariable.length;
        var target = req;
        for(var i=0;i<lngVariable;i++){
            if(typeof target[aryVariable[i]]!=='undefined'){
                target = target[aryVariable[i]]
            }else{
                console.error('Can\'t find ['+aryVariable[i]+'] in '+aryVariable[i-1]);
                return undefined;
            }
        };
        if(isBooleanSwitch) target=!target;
        return target
    };

    this.$processObject = function(table, field, value, object, bolStrict, type, force, bolPrivate, objName){
        var dataObject = self.dataObjects[object];
        if(typeof dataObject!=='undefined'){
            var fields = dataObject.fields;
            for (var field in dataObject.fields) {
                if (fields.hasOwnProperty(field)) {
                    if(typeof value[field]==='undefined'){
                        value[field] = '';
                    }
                }
            }

            for (var field in value) {
                if (value.hasOwnProperty(field)) {
                    if(typeof fields[field] === 'undefined'){
                        delete value[field];
                    }else{
                        value[field] = self.$processFields(table,fields[field], value[field], field, bolStrict, type, force, bolPrivate, objName);

                        /*
                         * If timestamp available then add it.
                         * */
                        if (fields[field].actions.timestamp === true) {
                            value[field] = (new Date).getTime();
                        }
                    }
                }
            }
        }else{
            self.onError(400,100,'Data Object:'+object+' could not be found',field);
        }
        return value;
    };

    this.$processObjectArray = function(table, field, ary, object, bolStrict, type, force, bolPrivate, objName){
        if(_.isArray(ary)===true){
            var dataObject = self.dataObjects[object];
            if(typeof dataObject!=='undefined'){
                var aryLength = ary.length;
                for(var i=0;i<aryLength;i++){
                    ary[i] = self.$processObject(table, field, ary[i], object, bolStrict, type, force, bolPrivate, objName);
                }
            }else{
                self.onError(400,100,'Data Object:'+object+' could not be found',field);
            }
            return ary;
        }else{
            return self.onError(400,100, 'Must be a valid an Array.',field);
        }
    };

    this.$processEnum = function(field, value, ary){
        var foundEnum = false;
        var lngAry = ary.length;
        for(var i=0;i<lngAry;i++){
           if((ary[i]+'').toLowerCase()===(value+'').toLowerCase()){
               foundEnum = true;
               value = ary[i];
               break;
           }
        }
        if(foundEnum===false && lngAry>0) self.onError(400,100,'Must be a value from the enum list.',field,{"enum":ary});
        return value;
    };

    this.$processFilters = function(field, value, filters){
        var lngFilters = filters.length;
        for(var i=0;i<lngFilters;i++){
            var filter = filters[i];
            if(typeof self.$restfulFilter[filter]!=='undefined'){
                value = self.$restfulFilter[filter](value);
            }else{
                self.onError(400,100,'Filter:'+filter+' could not be found',field);
            }
        }
        return value;
    };

    this.$processValidators = function(field, value, validators){
        var lngValidators = validators.length;
        for(var i=0;i<lngValidators;i++){
            var validator = self.$getBracketParams({
                name: validators[i],
                params: [field, value]
            });

            var singleValidator = self.$restfulValidator[validator.name];
            if(typeof singleValidator!=='undefined'){
                singleValidator.validate.apply(this, validator.params);
            }else{
                self.onError(400,100,'Validator:'+validator.name+' could not be found',field);
            }
        }
        return true;
    };

    this.$getBracketParams = function(obj){
        if(typeof obj==='undefined') obj = {};
        if(typeof obj.name==='undefined') obj.name = "";
        if(typeof obj.params==='undefined') obj.params = [];

        var name = obj.name;
        var bracketAt = name.indexOf("[");
        if(bracketAt>-1){
            var strParams = name.replace(/.*\[|\]/gi,'');
            var aryParams = strParams.split(',');
            obj.params = obj.params.concat(aryParams);
            obj.name = name.substr(0,bracketAt);
        }
        return obj;
    };

    this.$init(); //initializer
};
