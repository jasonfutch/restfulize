/*
* hasFromFields
* */
var $q = require('q');
var $extend = require('extend');
var $restfulize = require('restfulize');
var $restfulFilters = require('./../filters');

module.exports = function(){
    var self = this;

    this.initialized = false;
    this.fields = {};
    this.core = {};
    this.fieldsToProcess = [];

    this.$initialize = function(){
        self.initialized = true;
        self.$restfulFilter = new $restfulFilters(self.core.tables, self.core.req, self.core.res, self.core.errorHandler);
    };


    this.$hasFromFields = function(obj){
        if(!obj.properties.fields) obj.properties.fields = [];

        var newObjForHash = "";
        var lngFields = obj.properties.fields.length;
        for(var i=0;i<lngFields;i++){
            var field = obj.properties.fields[i];
            newObjForHash += (typeof obj.body[field]!=='undefined') ? obj.body[field] : '';
        }

        return self.$restfulFilter.md5(newObjForHash);
    };

    return {
        consolidate: true,
        routineType:{
            field: true
        },
        onInit: function(properties,column,core){
            var deferred = $q.defer();

            if(self.initialized===false){
                self.core = core;
                self.$initialize();
            }
            if(!properties) properties = {};

            self.fieldsToProcess.push({
                "field":column.field,
                "properties":properties,
                "column":column
            });

            deferred.resolve();
            return deferred.promise;
        },
        onActions: function(objBuild,obj){
            var deferred = $q.defer();

            var lngFieldsToProcess = self.fieldsToProcess.length;

            if(lngFieldsToProcess>0){
                var objBody = {};
                if (objBuild.orgData != null) {
                    objBody = $extend(true, objBuild.orgData, obj.body);
                }else{
                    objBody = $extend(true, {}, obj.body);
                }

                var lngDataFields = obj.fields.length;
                for(var i = 0; i < lngFieldsToProcess; i++) {
                    var uniqueField = self.fieldsToProcess[i];
                    var newValue = self.$hasFromFields({
                        column: uniqueField.column,
                        properties: uniqueField.properties,
                        body: objBody
                    });

                    var bolFound =  $restfulize.helpers.updateFieldValue(uniqueField.field,newValue,obj);

                    if(bolFound===false){
                        if(objBody[uniqueField.field]!==newValue){
                            $restfulize.helpers.insertFieldValue(uniqueField.field,newValue,objBuild.table,obj);
                        }
                    }

                    if(typeof obj.body[uniqueField.field]!=='undefined') obj.body[uniqueField.field] = newValue;
                }
            }

            deferred.resolve();
            return deferred.promise;
        },
        onComplete: function(objBuild,obj){
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
        }
    };

};