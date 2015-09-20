/*
* uniqueData
* */
var $q = require('q');
var $async = require('async');
var $extend = require('extend');
var _ = require('underscore');
var $restfulize = require('restfulize');
var $restfulRequest = require('./../request');
var $restfulSqlString = require('./../sql-string');
var $sql = require('./../postgres');

module.exports = function(){
    var self = this;

    this.fields = {};
    this.core = {};
    this.fieldsToProcess = [];

    var setFieldToProcess = function(field){
        if(typeof self.fields[field] !== 'undefined'){
            var lngChecks = self.fields[field].length;
            for(var i=0;i<lngChecks;i++){
                self.fieldsToProcess.push({
                    field: field,
                    column: self.fields[field][i].column,
                    properties: self.fields[field][i].properties
                });
            }
        }
    };

    return {
        consolidate: true,
        deferOnMultiple: true,
        routineType:{
            field: true
        },
        onInit: function(properties,column,core){
            console.log('onInit: onlyOne');
            var deferred = $q.defer();
            self.core = core;
            if(!properties) properties = {};

            if(typeof self.fields[column.field]==='undefined') self.fields[column.field] = [];
            self.fields[column.field].push({
                "properties":properties,
                "column":column
            });

            deferred.resolve();
            return deferred.promise;
        },
        onFieldAction: function(objBuild,obj,field){
            var deferred = $q.defer();

            if(obj.type!=='delete') {
                setFieldToProcess(field);
            }

            deferred.resolve();
            return deferred.promise;
        },
        onActions: function(objBuild,obj){
            var deferred = $q.defer();

            deferred.resolve();
            return deferred.promise;
        },
        onComplete: function(objBuild,obj){
            console.log('onlyOne: onComplete: '+objBuild.type);
            var deferred = $q.defer();

            if(obj.type=='delete'){
                for (var field in self.fields) {
                    if (self.fields.hasOwnProperty(field)) {
                        setFieldToProcess(field);
                    }
                }
            }

            var lngFieldsToProcess = self.fieldsToProcess.length;
            if(lngFieldsToProcess>0){
                var objBody = {};
                if (objBuild.orgData != null) {
                    objBody = $extend(true, objBuild.orgData, obj.body);
                }else{
                    objBody = $extend(true, {}, obj.body);
                }

                var restfulRequest = new $restfulRequest(self.core.tables, self.core.req, self.core.res, self.core.errorHandler);
                var restfulSqlString = new $restfulSqlString();
                $async.forEachOfSeries(self.fieldsToProcess, function(val,item,callback) {
                    var strFilter = $restfulize.helpers.parseString(val.properties.filter, objBody);
                    strFilter = "("+ strFilter + ")&&"+val.field+":"+val.properties.value;

                    if(objBuild.orgData != null) {
                        strFilter = "((" + strFilter + ")&&" + objBuild.table.key + ":!" + objBody[objBuild.table.key] + ")";
                    }

                    var tableName = restfulRequest.$dbToName(objBuild.table.name, obj);
                    var filters = restfulRequest.buildFilter(strFilter, objBuild.table.fields, []);
                    var objTemp = restfulRequest.emptyObject();
                    objTemp.table = tableName;
                    objTemp.filters = filters;
                    objTemp.limit = 1;

                    var strSQL = restfulSqlString.exist(objTemp);
                    console.log('$onlyOne: ',strSQL);

                    $sql.connect().then(function(connection){
                        connection.execute(strSQL).then(function(rows) {
                            connection.release();
                            if(rows.length>0){

                                //console.log('forceSet: ',val.properties.forceSet);
                                //console.log('obj.body[val.field]: ',obj.body[val.field]);
                                //console.log('val.properties.value: ',val.properties.value);
                                if(obj.type!=='delete'){
                                    if(val.properties.forceSet && obj.body[val.field]===val.properties.value){
                                        //console.log('TRUE');
                                        /*
                                         * Add field to new object to reset existing "onlyOne" that will be added to transactions
                                         * */
                                        $restfulize.helpers.insertFieldValue(val.field, val.properties.resetValue, objBuild.table, objTemp);

                                        if(obj.type==='insert'){
                                            $restfulize.helpers.pushTransaction("pre","update", objTemp, obj);
                                        }else{
                                            $restfulize.helpers.pushTransaction("post","update", objTemp, obj);
                                        }

                                        //console.log('obj._transaction: ',obj._transaction.length);
                                    }else{
                                        //console.log('FALSE');
                                        /*
                                         * Value is not forced so resetting it
                                         * */
                                        var bolFound =  $restfulize.helpers.updateFieldValue(val.field,val.properties.resetValue,obj);

                                        if(bolFound===false){
                                            $restfulize.helpers.insertFieldValue(val.field,val.properties.resetValue,objBuild.table,obj);
                                        }
                                    }
                                }

                                callback();
                            }else{
                                if(obj.type!=='delete') {
                                    if (val.properties.required && obj.body[val.field] !== val.properties.value) {
                                        var bolFound = $restfulize.helpers.updateFieldValue(val.field, val.properties.value, obj);

                                        if (bolFound === false) {
                                            $restfulize.helpers.insertFieldValue(val.field, val.properties.value, objBuild.table, obj);
                                        }
                                    }
                                }else{
                                    /*
                                     * Add field to new object to set an "onlyOne" that will be added to transactions
                                     * */

                                    var strFromClauseFilters = $restfulize.helpers.parseString(val.properties.filter, objBody);
                                    if(objBuild.orgData != null) {
                                        strFromClauseFilters = "((" + strFromClauseFilters + ")&&" + objBuild.table.key + ":!" + objBody[objBuild.table.key] + ")";
                                    }
                                    var fromClauseFilters = restfulRequest.buildFilter(strFromClauseFilters, objBuild.table.fields, []);

                                    strFilter = $restfulize.helpers.parseString(val.properties.filter, objBody);
                                    strFilter = "((" + strFilter + ")&&" + objBuild.table.key + ":#a.\"" + objBuild.table.key + "\")";
                                    filters = restfulRequest.buildFilter(strFilter, objBuild.table.fields, []);

                                    var objFromClause = restfulRequest.emptyObject();
                                    objFromClause.table = tableName;
                                    objFromClause.filters = fromClauseFilters;
                                    objFromClause.limit = 1;
                                    $restfulize.helpers.insertFieldValue(objBuild.table.key, '', objBuild.table, objFromClause);

                                    objTemp.filters = filters;
                                    objTemp.fromClause = "(" + (restfulSqlString.select(objFromClause)).replace(';','') + ") as a";

                                    console.log(objTemp.fromClause);

                                    $restfulize.helpers.insertFieldValue(val.field, val.properties.value, objBuild.table, objTemp);

                                    if(obj.type==='insert'){
                                        $restfulize.helpers.pushTransaction("pre","update", objTemp, obj);
                                    }else{
                                        $restfulize.helpers.pushTransaction("post","update", objTemp, obj);
                                    }
                                }

                                console.log('$onlyOne: PASSED');
                                callback();
                            }
                        }, function (err) {
                            connection.release();
                            callback(true);
                        });
                    });
                },function(err){
                    if(err){
                        deferred.reject();
                        return false;
                    }
                    console.log('$onlyOne: DONE');
                    deferred.resolve();
                })
            }else{
                deferred.resolve();
            }
            return deferred.promise;
        }
    };

};