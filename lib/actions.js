var $restfulFilters = require('./filters');
var $restfulFormatters = require('./formatters');
var $restfulValidators = require('./validators');
var $restfulRequest = require('./request');
var $restfulSqlString = require('./sql-string');
var $sqlString = require('sql-string');
var $sql = require('./mysql');
var $extend = require('extend');
var _ = require('underscore');
var $q = require('q');

module.exports = function restfulActions(tables, req, res, errorHandler){
    var self = this;
    this.tables = tables;
    this.$restfulFilter = null;
    this.$restfulFormatter = null;
    this.$restfulValidator = null;
    this.onError = function(status, code, msg, field){ return errorHandler.error(status, code, msg, field) };

    this.$init = function(){
        self.tables = $extend(true, {}, self.tables);
        self.$restfulFormatter = new $restfulFormatters(tables, req, res, errorHandler);
        self.$restfulFilter = new $restfulFilters(tables, req, res, errorHandler);
        self.$restfulValidator = new $restfulValidators(tables, req, res, errorHandler);
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

    this.formatResponse = function(obj,data){
        var lngStructure = obj.structure.length;
        if(_.isArray(data)){
            var lngData = data.length;
            for(var x=0;x<lngData;x++){
                data[x] = self.$formatResponseObj(obj,data[x]);
                if(lngStructure>0) data[x] = self.$formatResponseStructure(obj,data[x]);
            }
        }else{
            data = self.$formatResponseObj(obj,data);
            if(lngStructure>0) data = self.$formatResponseStructure(obj,data);
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
                if(singleValidator!==undefined){
                    if(singleValidator.define!==undefined){
                        var singleReturn = singleValidator.define.apply(this, validator.params);
                        objValidator = $extend(true, objValidator, singleReturn);
                    }
                }
            }
            if(column.actions.required && column.actions.editable) objValidator.required = column.actions.required;
            if(column.actions.requiredIfEmpty && column.actions.editable) objValidator.requiredIfEmpty = column.actions.requiredIfEmpty;
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

            var body = obj.body;

            if(_.size(body)===0){
                self.onError(400,100,'No values have been passed to update');
                reject();
            }

            var buildComplete = function(orgData){
                if(!orgData) orgData = null;

                var uniqueDataFieldToProcess = [];
                var requiredIfEmptyToProcess = [];
                var table = self.tables[params.table.name];

                obj.fields = [];

                for(item in body){
                    if(body.hasOwnProperty(item)){
                        var column = table.fields[item];
                        if(column!==undefined){
                            var field = column.field;
                            var value = self.$processFields(column.actions, body[item], item, obj.strict, type, obj._force);
                            if(value===false){
                                delete body[item];
                            }else{
                                body[item] = value;
                                obj.fields.push({
                                    field:field,
                                    value:body[item]
                                });


                                /*
                                 * uniqueDataField
                                 * */
                                if(column.actions.uniqueDataField.length>0){
                                    uniqueDataFieldToProcess.push({
                                        field:item,
                                        column:column
                                    });
                                }

                                /*
                                 * requiredIfEmpty
                                 * */
                                if(column.actions.requiredIfEmpty.length>0){
                                    requiredIfEmptyToProcess.push({
                                        field:item,
                                        column:column
                                    });
                                }
                            }
                        }else{
                            self.onError(400,100, item+' is not recongized.');
                            reject();
                        }
                    }
                }

                //save point
                obj.body = body;

                /*
                 * Check for unique data if required
                 * */
                var strUniqueDataField = "";
                var cntUniqueDataFieldToProcess = uniqueDataFieldToProcess.length;
                if(cntUniqueDataFieldToProcess>0){
                    var objTemp = $extend(true, {}, obj);
                    if(orgData != null){
                        objTemp.body = $extend(true, orgData, objTemp.body);
                    }
                    for(i=0;i<cntUniqueDataFieldToProcess;i++){
                        var uniqueField = uniqueDataFieldToProcess[i];
                        strUniqueDataField = self.$processUniqueDataFields(uniqueField.field,uniqueField.column,objTemp,strUniqueDataField);
                    }
                }

                /*
                 * Make sure all required fields are present
                 * */
                if(type==='post'){
                    var lngFields = obj.columns.length;
                    for(var i=0;i<lngFields;i++){
                        var column = obj.columns[i];
                        var field = column.field;
                        if(column.actions.required===true){
                            if(column.actions.editable===false){
                                if(_.isUndefined(body[field])){
                                    body[field] = self.$processFields(table.fields[field].actions, "", field, obj.strict, type, obj._force, true);
                                    obj.fields.push({
                                        field:table.fields[field].field,
                                        value:body[field]
                                    });
                                }
                            }else{
                                if(_.isUndefined(body[field])) self.onError(400,100, 'Required field.',field);
                            }
                        }

                        /*
                         * make sure all uniqueDataFields are required
                         * */
                        //if(column.actions.uniqueDataField.length>0){
                        //    strUniqueDataField = self.$processUniqueDataFields(field,column,obj,strUniqueDataField);
                        //}
                    }
                }

                //save point
                obj.body = body;

                var cntRequiredIfEmpty = requiredIfEmptyToProcess.length;
                if(cntRequiredIfEmpty>0){
                    var objTemp = $extend(true, {}, obj);
                    if(orgData != null){
                        objTemp.body = $extend(true, orgData, objTemp.body);
                    }
                    for(i=0;i<cntRequiredIfEmpty;i++){
                        var requiredIfEmpty = requiredIfEmptyToProcess[i];
                        self.$runRequiredIfEmpty(requiredIfEmpty.field,requiredIfEmpty.column,objTemp);
                    }
                }

                if(errorHandler.hasErrors()) reject();

                if(strUniqueDataField!=''){
                    self.$runUniqueDataFields(table,orgData,strUniqueDataField,obj).then(function(){
                        resolve(obj);
                    }).fail(function(){
                        reject();
                    });
                }else{
                    resolve(obj);
                }
            };

            /*
             * Grab original data for comparing if updating
             * */
            if(type==='put'){
                self.$getOrginalData(obj).then(function(orgData){
                    buildComplete(orgData);
                }).fail(function(){
                    reject();
                });
            }else{
                buildComplete();
            }
        });
    };

    this.$getOrginalData = function(obj){
        var restfulRequest = new $restfulRequest(tables, req, res, errorHandler);

        var objTemp = restfulRequest.emptyObject();
        objTemp.table = obj.table;
        objTemp.filters = obj.filters;
        objTemp._filters = obj._filters;
        objTemp.limit = 1;

        var restfulSqlString = new $restfulSqlString();
        var strSQL = restfulSqlString.select(obj);

        var deferred = $q.defer();
        $sql.connect().then(function(connection){
            connection.execute(strSQL).then(function(rows) {
                if(rows.length>0){
                    connection.release();
                    deferred.resolve(rows[0]);
                }else{
                    //clone and remove auth filter to check if exists
                    var objTemp = $extend(true, {}, obj);
                    delete objTemp._auth;
                    var strSQL = restfulSqlString.exist(objTemp);
                    connection.execute(strSQL).then(function(rows) {
                        connection.release();
                        if(rows.length>0){
                            self.onError(403, 100, 'This record is forbidden.');
                        }else{
                            self.onError(404, 100, 'record was not found.');
                        }
                        deferred.reject();
                    });
                }
            });
        });
        return deferred.promise;
    };

    this.$runUniqueDataFields = function(table,orgData,str,obj){
        var where = str;
        if(_.isObject(orgData)) where = "("+str+" AND "+table.key+"!='"+orgData[table.key]+"')";

        var sqlString = new $sqlString();
        sqlString.limit('1');
        var strSQL = sqlString.select(obj.table,where);

        var deferred = $q.defer();
        $sql.connect().then(function(connection){
            connection.execute(strSQL).then(function(rows) {
                connection.release();
                if(rows.length>0){
                    self.onError(409, 100, 'record is not unique.');
                    deferred.reject();
                }else{
                    deferred.resolve();
                }
            });
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

    this.$formatResponseObj = function(obj,data){
        var lngColumns = obj.columns.length;
        for(var i=0;i<lngColumns;i++){
            var col = obj.columns[i];
            if(col.formatter.outbound.length>0) data[col.field] = self.$restfulFormatter.$processFormatters(col.field,data[col.field],col.formatter.outbound);
            if(data[col.field]===null || data[col.field]==="null") data[col.field] = "";
        }
        return data;
    };

    this.$formatResponseStructure = function(obj,data){
        var objStructure = obj.structure;
        var lngStructure = objStructure.length;
        if(lngStructure>0) {
            /*build data holder*/
            var holder = {};
            for(var i=0; i<lngStructure;i++) {
                var arySection = objStructure[i].arySection;
                var folder_holder = holder;
                var lngSection = arySection.length;
                for(var ii=0;ii<lngSection;ii++){
                    if(folder_holder[arySection[ii]]===undefined) folder_holder[arySection[ii]] = {};
                    folder_holder = folder_holder[arySection[ii]];
                }
            }

            var newObj = {};
            for (param in data) {
                if (data.hasOwnProperty(param)) {
                    var bolParam = false;
                    for(var x=0; x<lngStructure;x++) {
                        var structure = objStructure[x];
                        if(param.substring(0, structure.param.length) === structure.param){
                            arySection = objStructure[x].arySection;
                            folder_holder = holder;
                            lngSection = arySection.length;
                            for(var xx=0;xx<lngSection;xx++){
                               folder_holder = folder_holder[arySection[xx]];
                               if(xx===arySection.length-1) folder_holder[param] = data[param];
                            }
                            bolParam = true;
                            break;
                        }
                    }
                    if(bolParam===false) newObj[param] = data[param];
                }
            }

            newObj = $extend(true, newObj, holder);
            return newObj;
        }else{
            return data;
        }
    };

    this.$processUniqueDataFields = function(field,column,obj,str){
        var cntUniqueDataField = column.actions.uniqueDataField.length;
        var strArgument = "";
        for(var i=0;i<cntUniqueDataField;i++){
            var uniqueField = column.actions.uniqueDataField[i];
            if(uniqueField=='this') uniqueField = field;
            if(strArgument!='') strArgument += " AND ";
            strArgument += column.field+"='"+obj.body[uniqueField]+"'";
        }
        if(str!="") str += " OR ";
        str += "("+strArgument+")";
        return str;
    };

    this.$processFields = function(action, value, field, bolStrict, type, force, bolPrivate){ //bolPrivate means the data is coming from internal and assumed safe
        var temp;
        if(!bolPrivate) bolPrivate = false;

        //seting value to string
        value = value+'';

        if((action.editable===false && bolPrivate===false && action.editableOnlyInsert===false) || (action.editable===false && bolPrivate===false && action.editableOnlyInsert===true && type.toLowerCase()==="put")){
            if(_.contains(force, field)===false){
                if(bolStrict){
                    return self.onError(400,100, 'Can not be edited.',field);
                }else{
                    return false;
                }
            }
        }

        //onRawData
        temp = action.onRawData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onRawData',field);
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }


        //filter
        value = self.$processFilters(field, value, action.filter);

        //onFilteredData
        temp = action.onFilteredData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onFilteredData',field);
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }

        //validator
        self.$processValidators(field, value, action.validator);

        //onValidatedData
        temp = action.onValidatedData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onValidatedData',field);
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }

        //postFilter
        value = self.$processFilters(field, value, action.postFilter);

        //onData
        temp = action.onData(value);
        if(_.isUndefined(temp)) return self.onError(400,100,'Missing return on actions.onData',field);
        if(_.isBoolean(temp)){
            if(temp===false) return value;
        }else{
            value = temp;
        }

        if(action.required===true && value===''){
            if(action.default===''){
                return self.onError(400,100, 'Required field.',field);
            }else{
                value = action.default;
            }
        }

        //enum
        value = self.$processEnum(field, value, action.enum);

        return value;
    };

    this.$processEnum = function(field, value, ary){
        var foundEnum = false;
        var lngAry = ary.length;
        for(var i=0;i<lngAry;i++){
           if((ary[i]).toLowerCase()===(value).toLowerCase()){
               foundEnum = true;
               value = ary[i];
               break;
           }
        }
        if(foundEnum===false && lngAry>0) self.onError(400,100,'Must be a value from the enum list.',field);
        return value;
    };

    this.$processFilters = function(field, value, filters){
        var lngFilters = filters.length;
        for(var i=0;i<lngFilters;i++){
            var filter = filters[i];
            if(self.$restfulFilter[filter]!==undefined){
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
            if(singleValidator!==undefined){
                singleValidator.validate.apply(this, validator.params);
            }else{
                self.onError(400,100,'Validator:'+validator.name+' could not be found',field);
            }
        }
        return true;
    };

    this.$getBracketParams = function(obj){
        if(obj===undefined) obj = {};
        if(obj.name===undefined) obj.name = "";
        if(obj.params===undefined) obj.params = [];

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
