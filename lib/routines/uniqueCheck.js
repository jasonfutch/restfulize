/*
* uniqueCheck
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
    this.strUniqueDataField = "";

    this.$processUniqueDataFields = function(obj){
        if(typeof obj.properties.filter==='undefined'){
            obj.properties.filter = obj.field+":{{"+obj.field+"}}"
        }

        var strFilter = $restfulize.helpers.parseString(obj.properties.filter,obj.body);

        if(obj.str!="") obj.str += "||";
        obj.str += "("+strFilter+")";
        return obj.str;
    };

    this.$runUniqueDataFields = function(table,orgData,strFilter,obj){
        var deferred = $q.defer();

        var restfulRequest = new $restfulRequest(self.core.tables, self.core.req, self.core.res, self.core.errorHandler);
        var restfulSqlString = new $restfulSqlString();

        if(_.isObject(orgData)) strFilter = "(("+strFilter+")&&"+table.key+":!"+orgData[table.key]+")";

        var tableName = restfulRequest.$dbToName(table.name, obj);
        var filters = restfulRequest.buildFilter(strFilter, table.fields, []);
        var objTemp = restfulRequest.emptyObject();
        objTemp.table = tableName;
        objTemp.filters = filters;
        objTemp.limit = 1;

        var strSQL = restfulSqlString.select(objTemp);
        console.log('$runUniqueDataFields: ',strSQL);

        $sql.connect().then(function(connection){
            connection.execute(strSQL).then(function(rows) {
                connection.release();
                if(rows.length>0){
                    var aryTable = tableName.split('.');
                    var strTable = aryTable[0];
                    if(aryTable.length>1) strTable = aryTable[1];
                    var uniqueFields = [];
                    var lngFieldsToProcess = self.fieldsToProcess.length;
                    for(var i = 0; i < lngFieldsToProcess; i++) {
                        var aryField = (self.fieldsToProcess[i].field).split('.');
                        var field = aryField[0];
                        if(aryField.length>1) field = aryField[1];
                        uniqueFields.push(field);
                    };

                    self.core.errorHandler.error(409, 160, 'The following fields must be unique in '+strTable+': '+uniqueFields+ '.');
                    deferred.reject();
                }else{
                    console.log('$runUniqueDataFields: PASSED');
                    deferred.resolve();
                }
            }, function (err) {
                connection.release();
                console.log(err);
                res.send(err);
            });
        });

        return deferred.promise;
    };

    return {
        consolidate: true,
        routineType:{
            field: true
        },
        onInit: function(properties,column,core){
            console.log('onInit');
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

            deferred.resolve();
            return deferred.promise;
        },
        onComplete: function(objBuild,obj){
            var lngFieldsToProcess = self.fieldsToProcess.length;
            if(lngFieldsToProcess>0){
                var objBody = {};
                if (objBuild.orgData != null) {
                    objBody = $extend(true, objBuild.orgData, obj.body);
                }else{
                    objBody = $extend(true, {}, obj.body);
                }

                for(var i = 0; i < lngFieldsToProcess; i++) {
                    var uniqueField = self.fieldsToProcess[i];
                    self.strUniqueDataField = self.$processUniqueDataFields({
                        field: uniqueField.field,
                        column: uniqueField.column,
                        properties: uniqueField.properties,
                        body: objBody,
                        str: self.strUniqueDataField
                    });
                }
            }

            if(self.strUniqueDataField!==''){
                return self.$runUniqueDataFields(objBuild.table, objBuild.orgData, self.strUniqueDataField, obj);
            }else{
                var deferred = $q.defer();
                deferred.resolve();
                return deferred.promise;
            }
        }
    };

};