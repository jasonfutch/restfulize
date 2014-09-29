var $extend = require('extend');
var $restfulData = require('./data-tables');
var $restfulFormatters = require('./formatters');

module.exports = function restfulQuery(tables, req, res, errorHandler){
    var self = this;

    var objBlank = {
        show_columns: false, //shows & hide column info
        list_controls: true, //shows & hide list controls (offset,totals,etc.)
        strict: false, //displays additional minor errors
        validators: false, //show field validators
        table: '', //name on main table being used
        joins: [], //joins other tables to main table
        fields: {}, //fields to add/minus or display
        sorts: [], //fields to sort by
        columns: [], //list of column info
        filters: {}, //search params
        groups: [], //group
        limit: "", //number of items returned
        offset: "", //record starting point
        q_fields: [], //the fields used for keyword search
        q_type: "", //the type of keyword search
        q: "", //keyword
        _force: [], //PRIVATE - list of ignores
        _auth: {}, //PRIVATE - auth search params
        _db: "", //PRIVATE - client db
        _filters: {}, //PRIVATE - search params
        _section: "", //PRIVATE - current section
        _sections: {} //PRIVATE - available sub sections
    };


    this.tables = tables;
    this.params = {};
    this.onError = function(status, code, msg){ return errorHandler.error(status, code, msg) };

    this.$init = function(){
        self.tables = $extend(true, {}, self.tables);
        self.$restfulFormatter = new $restfulFormatters(tables, req, res, errorHandler);
    };

    this.emptyObject = function(){
        return $extend(true, {}, objBlank);
    };

    this.GET = function(o){
        return self.build('get', o);
    };

    this.LIST = function(o){
        return self.build('list', o);
    };

    this.PUT = function(o){
        return self.build('put', o);
    };

    this.POST = function(o){
        return self.build('post', o);
    };

    this.build = function(type, obj){
        var o = {
            overwrites: {},
            defaults: {}
        };
        o = $extend(true, o, obj || {});

        if(o.query===undefined) o.query = req.query;
        if(o.body===undefined) o.body = req.body;

        var p = o.query;
        var b = o.body;
        var overwrites = o.overwrites;
        var defaults = o.defaults;

        //querystrings list
        var paramList = {
            show_columns: "false",
            list_controls: "true",
            strict:"false",
            validators:"false",
            table: "", //"table1:full"
            table_list: "", //full
            joins: "", //"table2" or "-table2" or "+table2"
            fields: "", //"-field2a|field2|+field3|field1",
            sections: "", //"section1|-section2" or "-" or "-section1" or "+section2"
            sort: "", //"field1|-field2",
            limit: "", //"50",
            offset: "", //"51",
            filter: "", //field:jason&&(field2:%utch||field2:fut%||field2:!ch||field2:#34||field2:%utc%)
            group: "", //field
            q_fields: "", //"field2a|field2" or "+field2" or "-field2"
            q_type: "", //"words", "phrase"
            q: "" //search terms
        };

        var paramPrivate = {
            _auth: "",
            _db: "",
            _filter: "",
            _section: "",
            _sections: ""
        };

        //combine querystring with querystring list
        p = $extend(true, paramList, p || {});

        //private overwrite (makes them true private options)
        p = $extend(true, p, paramPrivate);

        //convert overwrite names to section, if section exist
        overwrites =  self.$convertObjSection(overwrites);
        //combine overwrites with querystring params
        p = $extend(true, p, overwrites || {});

        //object which gets returned
        var obj = self.emptyObject();

        //convert queryString to data object
        var objParams = self.$stringToObject(p);

        //convert and combine data object with defaults
        var objDefaults = self.$stringToObject(defaults, true);
        objParams = self.$combineDefaults(objParams, objDefaults);

        //making publically available;
        self.params = objParams;

        //setting body param
        obj.body = $extend(true, {}, b || {});

        //validate and set show_columns
        if(self.$validateBoolean(objParams, 'show_columns')===false) return false;
        obj.show_columns = self.$getBoolean(objParams, 'show_columns');

        //validate and set list_controls
        if(self.$validateBoolean(objParams, 'list_controls')===false) return false;
        obj.list_controls = self.$getBoolean(objParams, 'list_controls');

        //validate and set strict mode
        if(self.$validateBoolean(objParams, 'strict')===false) return false;
        obj.strict = self.$getBoolean(objParams, 'strict');

        //validate and set if validators are delivered
        if(self.$validateBoolean(objParams, 'validators')===false) return false;
        obj.validators = self.$getBoolean(objParams, 'validators');

        //validate and set all tables including joins
        if(self.$validateTables(objParams)===false) return false;
        obj.table = self.$getTableName(objParams);
        obj.joins = self.$getJoins(objParams);

        //grab all fields from tables and joins
        var fields = self.$gatherFields(objParams,true);

        //validate and grab all request fields
        if(self.$validateRequestedFields(objParams, fields)===false) return false;
        var reqFields = self.$getRequestedFields(objParams, fields);
        obj.fields = self.$objToAryFields(reqFields);

        //set columns
        obj.columns = self.$getColumns(reqFields);

        //validate, convert and set sorts
        if(self.$validateSort(objParams, reqFields)===false) return false;
        obj.sorts = self.$convertFieldNames(objParams.sorts, fields);

        obj.sort = paramList.sort;

        //validate, convert and set sorts
        if(self.$validateGroup(objParams, reqFields)===false) return false;
        obj.groups = self.$convertFieldNames(objParams.groups, fields);

        //validate, convert and set q_fields
        if(self.$validateSearchFields(objParams, fields)===false) return false;
        var searchFields = self.$getSearchFields(objParams);
        obj.q_fields = self.$convertFieldNames(searchFields, fields);

        //validate and set q_type
        if(self.$validateSearchType(objParams)===false) return false;
        obj.q_type = self.$getSearchType(objParams);

        //set q
        obj.q = objParams.q;

        //validate, convert and set filters
        if(self.$validateFilters(objParams, fields)===false) return false;
        objParams.filters.fields = self.$convertFieldNames(objParams.filters.fields, fields);
        obj.filters = objParams.filters;

        //validate, convert and set PRIVATE filters
        if(self.$validateFilters(objParams, fields, "_filters")===false) return false;
        objParams._filters.fields = self.$convertFieldNames(objParams._filters.fields, fields);
        obj._filters = objParams._filters;

        //validate, convert and set PRIVATE auth filters
        if(self.$validateFilters(objParams, fields, "_auth")===false) return false;
        objParams._auth.fields = self.$convertFieldNames(objParams._auth.fields, fields);
        obj._auth = objParams._auth;

        //set force
        obj._force = o._force;

        //validate and set limit
        if(self.$validateLimit(objParams)===false) return false;
        obj.limit = self.$getLimit(objParams);

        //validate and set offset
        if(self.$validateOffset(objParams)===false) return false;
        obj.offset = self.$getOffset(objParams);

        return obj;
    };

    //INTERNAL METHODS
    this.$stringToObject = function(p, bolOnlySetValues){
        var obj = {
            /*LEAVE FOLLOWING COMMENTED FOR REFERENCE*/
            show_columns: "",
            list_controls: "",
            strict: "",
            validators: "",
            table: {name: "",list: ""},
            joins: [], //{name:"", list:"", pre:""}
            fields: [], //{name:"", pre:""}
            sorts: [], //{name:"", dir:""}
            groups: [], //{name:"", pre:""}
            filters: {
                raw: [],
                fields: [], //{name:"", value:"", sep:"=="}
                structure: []
            },
            limit: "",
            offset: "",
            q_type: "",
            q_fields: [], //{name:"", pre:""}
            q: {
                words: [],
                phrase: ""
            },
            _force: {},
            _auth: {
                raw: [],
                fields: [], //{name:"", value "", sep:"=="}
                structure: []
            },
            _db: "",
            _filters: {
                raw: [],
                fields: [], //{name:"", value "", sep:"=="}
                structure: []
            },
            _section: "",
            _sectionExt: "",
            _sections: {}
        };

        //To only pass variables being used;
        if(bolOnlySetValues) obj = {};

        var aryFields,lngFields,objField,field,fval,lval;

        //get section
        var _section = p._section;
        (!_section) ? _section='' : _section = self.$removeAllSpaces(_section);
        if(_section!==''){
            obj._section = _section;
            _section += '.';
            obj._sectionExt = _section;
        }

        var _sections = p._sections;
        (!_sections) ? _sections='' : _sections = self.$removeAllSpaces(_sections);
        if(_sections!==''){
            obj._sections = {};
            var arySections = self.$toArray(_sections);
            var lngSections = arySections.length;
            for(var i=0;i<lngSections;i++) obj._sections[arySections[i]] = "";
        }

        //_db
        var _db = p[_section+'_db'];
        (!_db) ? _db='' : _db = self.$removeAllSpaces(_db);
        if(_db!=='') obj._db = _db;

        //show_columns
        var show_columns = p[_section+'show_columns'];
        (!show_columns) ? show_columns='' : show_columns = self.$removeAllSpaces(show_columns);
        if(show_columns!=='') obj.show_columns = show_columns;

        //list_controls
        var list_controls = p[_section+'list_controls'];
        (!list_controls) ? list_controls='' : list_controls = self.$removeAllSpaces(list_controls);
        if(list_controls!=='') obj.list_controls = list_controls;

        //strict
        var strict = p[_section+'strict'];
        (!strict) ? strict='' : strict = self.$removeAllSpaces(strict);
        if(strict!=='') obj.strict = strict;

        //validators
        var validators = p[_section+'validators'];
        (!validators) ? validators='' : validators = self.$removeAllSpaces(validators);
        if(validators!=='') obj.validators = validators;

        //table
        var table = p[_section+'table'];
        (!table) ? table='' : table = self.$removeAllSpaces(table);
        if(table!==''){
            obj.table = {name:"",list:""};
            var aryTable = self.$toArray(table,1);
            obj.table.name = aryTable[0];
            if(aryTable.length>1) obj.table.list = aryTable[1];
        }

        //table_list
        var table_list = p[_section+'table_list'];
        (!table_list) ? table_list='' : table_list = self.$removeAllSpaces(table_list);
        if(table_list!==''){
            if(obj.table===undefined) obj.table = {name:"",list:""};
            obj.table.list = table_list;
        }

        //joins
        var join = p[_section+'join'];
        (!join) ? join='' : join = self.$removeAllSpaces(join);
        if(join!==''){
            obj.joins = [];
            var aryJoins = self.$toArray(join);
            var lngJoins = aryJoins.length;
            for(var i=0;i<lngJoins;i++){
                var objJoin = {name:"", list:"",pre:""};
                var aryJoin = self.$toArray(aryJoins[i],1);
                var tName = aryJoin[0];
                fval = tName.substring(0,1);
                if(fval==='-' || fval==='+'){
                    objJoin.pre = fval;
                    objJoin.name = tName.substring(1);
                }else{
                    objJoin.name = tName;
                }
                if(aryJoin.length>1) objJoin.list = aryJoin[1];
                obj.joins.push(objJoin);
            }
        }

        //fields
        var fields = p[_section+'fields'];
        (!fields) ? fields='' : fields = self.$removeAllSpaces(fields);
        if(fields!==''){
            obj.fields = [];
            aryFields = self.$toArray(fields);
            lngFields = aryFields.length;
            for(var i=0;i<lngFields;i++){
                objField = {name:"",pre:""};
                field = aryFields[i];
                fval = field.substring(0,1);
                if(fval==='-' || fval==='+'){
                    objField.pre = fval;
                    objField.name = field.substring(1);
                }else{
                    objField.name = field;
                }
                obj.fields.push(objField);
            }
        }

        //q_fields
        var q_fields = p[_section+'q_fields'];
        (!q_fields) ? q_fields='' : q_fields = self.$removeAllSpaces(q_fields);
        if(q_fields!==''){
            obj.q_fields = [];
            aryFields = self.$toArray(q_fields);
            lngFields = aryFields.length;
            for(var i=0;i<lngFields;i++){
                objField = {name:"",pre:""};
                field = aryFields[i];
                fval = field.substring(0,1);
                if(fval==='-' || fval==='+'){
                    objField.pre = fval;
                    objField.name = field.substring(1);
                }else{
                    objField.name = field;
                }
                obj.q_fields.push(objField);
            }
        }

        //q_type
        var q_type = p[_section+'q_type'];
        (!q_type) ? q_type='' : q_type = self.$removeAllSpaces(q_type);
        if(q_type!=='') obj.q_type = q_type;

        //q
        var q = p[_section+'q'];
        (!q) ? q='' : q = self.$removeMultipleSpaces(q);
        if(q!==''){
            obj.q = {words:[],phrase:""};
            var aryWords = self.$toArray(q,3);
            var lngWords = aryWords.length;
            for(var i=0;i<lngWords;i++){
                obj.q.words.push(aryWords[i]);
            }
            obj.q.phrase = p.q;
        }

        //limit
        var limit = p[_section+'limit'];
        (!limit) ? limit='' : limit = self.$removeAllSpaces(limit);
        if(limit!=='') obj.limit = limit;

        //offset
        var offset = p[_section+'offset'];
        (!offset) ? offset='' : offset = self.$removeAllSpaces(offset);
        if(offset!=='') obj.offset = offset;

        //sort
        var sort = p[_section+'sort'];
        (!sort) ? sort='' : sort = self.$removeAllSpaces(sort);
        if(sort!==''){
            obj.sorts = [];
            var arySort = self.$toArray(sort);
            var lngSort = arySort.length;
            for(var i=0;i<lngSort;i++){
                var name = arySort[i];
                if(name.length>1){
                    var o = {name:name, dir:"ASC"};
                    if(name.substring(0,1)=='-'){
                        o.name = name.substring(1);
                        o.dir = "DESC";
                    }
                    obj.sorts.push(o);
                }
            }
        }

        //group
        var group = p[_section+'group'];
        (!group) ? group='' : group = self.$removeAllSpaces(group);
        if(group!==''){
            obj.groups = [];
            var aryGroups = self.$toArray(group);
            var lngGroups = aryGroups.length;
            for(var i=0;i<lngGroups;i++){
                var objGroup = {name:"",pre:""};
                var name = aryGroups[i];
                fval = name.substring(0,1);
                if(fval==='-' || fval==='+'){
                    objGroup.pre = fval;
                    objGroup.name = name.substring(1);
                }else{
                    objGroup.name = name;
                }
                obj.groups.push(objGroup);
            }
        }

        //filters
        obj = self.$stringToObjectFilters(_section,p,obj);

        //_filters
        obj = self.$stringToObjectFilters(_section,p,obj,'_filter');

        //_auth
        obj = self.$stringToObjectFilters(_section,p,obj,'_auth');

        return obj;
    };

    this.$stringToObjectFilters = function(_section,p,obj,param){
        if(!param) param = 'filter';

        var strFilter, strFilters;
        switch(param){
            case 'filter':
                strFilter = "filter";
                strFilters = "filters";
                break;
            case '_filter':
                strFilter = "_filter";
                strFilters = "_filters";
                break;
            case '_auth':
                strFilter = "_auth";
                strFilters = "_auth";
                break;
        }

        //filters
        var filter = p[_section+strFilter];
        if(!filter) filter='';
        if(filter!==''){
            obj[strFilters] = {
                raw:[],
                fields:[],
                structure:[]
            };
            obj[strFilters].raw = self.$toArray(filter,2);
            var lngFilters = obj[strFilters].raw.length;
            for (var i=0;i<lngFilters;i++){
                var filtr = obj[strFilters].raw[i];
                switch(filtr){
                    case '&&':
                    case '||':
                    case '(':
                    case ')':
                        obj[strFilters].structure.push(filtr);
                        break;
                    default:
                        var aryArgs = self.$toArray(filtr,1);
                        var objArg = {alias:aryArgs[0],name:aryArgs[0],value:"",sep:"=="};
                        if(aryArgs.length>1){
                            var value = aryArgs[1];
                            if(value!==''){
                                var fval = value.substring(0,1);
                                var sval = (value.length>1) ? value.substring(1,1) : "";
                                var lval = value.substring(value.length-1);
                                switch(fval){
                                    case '<':
                                        if(sval==='='){
                                            objArg.value = value.substring(2);
                                            objArg.sep = "<=";
                                        }else{
                                            objArg.value = value.substring(1);
                                            objArg.sep = "<<";
                                        }
                                        break;
                                    case '>':
                                        if(sval==='='){
                                            objArg.value = value.substring(2);
                                            objArg.sep = ">=";
                                        }else{
                                            objArg.value = value.substring(1);
                                            objArg.sep = ">>";
                                        }
                                        break;
                                    case '#':
                                        objArg.value = value.substring(1);
                                        objArg.sep = "=#";
                                        break;
                                    case '!':
                                        if(sval==='='){
                                            objArg.value = value.substring(2);
                                        }else{
                                            objArg.value = value.substring(1);
                                        }
                                        objArg.sep = "!=";
                                        break;
                                    case '%':
                                        if(lval==='%' && value.length>1){
                                            objArg.sep = "%%";
                                            objArg.value = value.substring(1,value.length-1);
                                        }else{
                                            objArg.sep = "%a";
                                            objArg.value = value.substring(1);
                                        }
                                        break;
                                    default:
                                        if(lval==='%' && value.length>1){
                                            objArg.sep = "a%";
                                            objArg.value = value.substring(0,value.length-1);
                                        }else{
                                            objArg.sep = "==";
                                            objArg.value = value;
                                        }
                                        break;
                                }
                            }
                        }
                        obj[strFilters].fields.push(objArg);
                        obj[strFilters].structure.push('arg');
                        break;
                }
            }
        }
        return obj;
    };

    this.$combineDefaults = function(obj,defaults){
        if(defaults.table!==undefined){
            if(defaults.table.name!=='') obj.table.name = defaults.table.name;
            if(defaults.table.list!=='' && obj.table.list==='') obj.table.list = defaults.table.list;
        }
        if(defaults.fields!==undefined){
            if(defaults.fields.length>0){
                if(defaults.fields[0].pre===''){
                    //this will add fields to a blank set so other can be include for client
                    defaults.fields[0].pre = '+';
                    obj.table.list = 'blank';
                    if(defaults.joins!==undefined){
                        for(var i=0;i<lngJoins;i++){
                            defaults.joins[i].list = 'blank';
                        }
                    }
                }
            }
            obj.fields = self.$combineDefaultsPre(obj.fields,defaults.fields);
        }

        //defaults.fields must process before joins to reset join lists, if needed.
        if(defaults.joins!==undefined){
            obj.joins = self.$combineDefaultsPre(obj.joins,defaults.joins);
        }
        if(defaults.sorts!==undefined){
            if(obj.sorts.length===0) obj.sorts = defaults.sorts;
        }
        return obj;
    };

    this.$combineDefaultsPre = function(obj,def){ //handle defaults with pre params
        if(def.length>0){
            var lngObj = obj.length;
            if(lngObj>0){
                var prevFVal = obj[0].pre;
                if(prevFVal!==''){
                    var temp = def;
                    if(temp[0].pre!==''){
                        return temp.concat(obj);
                    }else{
                        for(var i=0;i<lngObj;i++){
                            var found = false;
                            var join = obj[i];
                            var pre = join.pre;
                            if(pre!=='') prevFVal = pre;
                            var lngTemp = temp.length;
                            for(var x=0;x<lngTemp;x++){
                                var tempObj = temp[x];
                                if(join.name===tempObj.name){
                                    if(prevFVal==='-') temp = temp.splice(x,1);
                                    found = true;
                                    break;
                                }
                            }
                            if(prevFVal==='+' && found===false) temp.push(join);
                        }
                        return temp.splice();
                    }
                }
            }else{
                return def;
            }
        }
        return obj;
    };

    this.$convertObjSection = function(obj){ //convert overwrite names to section, if section exist
        obj = $extend(true,{},obj || {});
        var _section = obj._section;
        if(_section===undefined || _section===''){
            return obj;
        }else{
            var objO = {};
            for(item in obj){
                if(obj.hasOwnProperty(item)){
                    (item!=='_section') ? objO[_section+'.'+item] = obj[item] : objO[item] = obj[item];
                }
            }
            return objO;
        }
    };

    this.$removeMultipleSpaces = function(str){
        return str.replace(/ +(?= )/g,'');
    };

    this.$removeAllSpaces = function(str){
        return str.replace(/ /g,'');
    };

    this.$toArray = function(str,type){ //string into array
        if(!type) type = 0;
        switch(type){
            case 0: // |
                return str.match(/(?:[^\|]|\|\|)+/g);
            case 1: // :
                return str.split(/(?:[^[:]]|:)+/g);
            case 2: // () && ||
                return str.split(/([()]|&&|\|\|)/).filter(function(x){ return x; });
            case 3: //space
                str = self.$removeMultipleSpaces(str);
                return str.split(' ');
            default:
                return [];

        }
    };

    this.$convertFieldNames = function(obj,fields){
        var objField;
        var cvtFields = [];
        var lngFields = obj.length;
        var isObject = (typeof obj[0]=="object");
        for(var i=0;i<lngFields;i++){
            if(isObject){
                objField = obj[i];
                var objColumn = fields[objField.name];
                objField.name = objColumn.field;
                if(objField.value && objColumn.formatter.inbound.length>0) objField.value = self.$restfulFormatter.$processFormatters(objField.alias,objField.value,objColumn.formatter.inbound)+'';
            }else{
                objField = fields[obj[i]].field;
            }
            cvtFields.push(objField);
        }
        return cvtFields;
    };

    this.$validateTables = function(obj){ //validates tables, joins & lists
        if(self.tables[obj.table.name]===undefined) return this.onError(400,100,obj._sectionExt+'table:'+obj.table.name+' not found');
        if(obj.table.list!==''){
            if(self.tables[obj.table.name].lists[obj.table.list]===undefined) return self.onError(400,100,obj._sectionExt+'list:'+obj.table.list+' not found in table:'+obj.table.name);
        }
        var lngJoins = obj.joins.length;
        for(var i=0;i<lngJoins;i++){
            var join = obj.joins[i];
            if(self.tables[join.name]===undefined) return this.onError(400,100,obj._sectionExt+'table:'+join.name+' not found');
            //if(self.tables[obj.table.name].joins[join.name]===undefined || $restfulData.joins[obj.table.name][join.name]===undefined) return self.onError(400,100,obj._sectionExt+'table:'+join.name+' is not allowed to join to table:'+obj.table.name+'.');
            if(join.list!==''){
                if(self.tables[join.name].lists[join.list]===undefined) return self.onError(400,100,obj._sectionExt+'list:'+join.list+' not found in '+obj._sectionExt+'table:'+join.name);
            }
        }
        return true;
    };

    this.$getTableName = function(obj){
        return self.$dbToName(self.tables[obj.table.name].name,obj);
    };

    this.$getJoins = function(obj){
        /*
        * Grab smart joins first, then overwrite joins with passed in ones.
        * */

        var lngJoins = obj.joins.length;
        var aryJoins = [];
        for(var i=0;i<lngJoins;i++){
            var smartJoins = $restfulData.joins[obj.table.name][obj.joins[i].name];
            if(smartJoins===undefined) {
                if(self.tables[obj.table.name].joins[obj.joins[i].name]!==undefined) {
                    aryJoins.push({
                        name: self.$dbToName(self.tables[obj.joins[i].name].name, obj) + '',
                        on: self.tables[obj.table.name].joins[obj.joins[i].name].on
                    });
                }
            }else{
                var lngSmartJoins = smartJoins.length;
                for(var x=0;x<lngSmartJoins;x++){
                    var join = smartJoins[x];
                    aryJoins.push({
                        name: self.$dbToName(self.tables[join.name].name, obj) + '',
                        on: join.on
                    });
                }
            }
        }
        return aryJoins;
    };

    this.$dbToName = function(str,obj){
        return str.replace(/\{db\}/g,obj._db+'');
    };

    this.$getFields = function(obj,bolCustom){ //get fields from table using list
        var fields = {};
        var table = self.tables[obj.name];
        if(obj.list==='') obj.list = table.defaults.list;
        var tableFields = table.fields;
        var list = table.lists[obj.list];
        if(list!==undefined && !bolCustom){
            lngList = list.length;
            for(var i=0;i<lngList;i++){
                var field = list[i];
                if(tableFields[field]!==undefined) fields[field] = tableFields[field];
            }
        }else{
            fields = $extend(true,{},tableFields);
        }
        return fields;
    };

    this.$gatherFields = function(obj,bolGetAll){ //gather all fields from table and joins
        if(!bolGetAll) bolGetAll = false;
        var fields = self.$getFields(obj.table,bolGetAll);
        var lngJoins = obj.joins.length;
        for(var i=0;i<lngJoins;i++){
            var join = obj.joins[i];
            if(join.list===''){
                join.list = 'blank';
            }
            var smartJoins = $restfulData.joins[obj.table.name][obj.joins[i].name];
            if(smartJoins===undefined) {
                fields = $extend(true, fields, self.$getFields(join, bolGetAll));
            }else{
                var lngSmartJoins = smartJoins.length;
                for (var x = 0; x < lngSmartJoins; x++) {
                    var join = smartJoins[x];
                    fields = $extend(true, fields, self.$getFields(join, bolGetAll));
                }
            }
        }
        //console.log(fields);
        return fields;
    };

    this.$objToAryFields = function(fields){
        var aryFields = [];
        for(field in fields){
            if(fields.hasOwnProperty(field)){
                var objField = fields[field];
                aryFields.push({field:objField.field, as:field});
            }
        }
        return aryFields;
    };

    this.$getSearchFields = function(obj){
        var q_fields = self.tables[obj.table.name].defaults.q.fields;
        var lngFields = obj.q_fields.length;
        if(lngFields>0){
            var fval = obj.q_fields[0].pre;
            if(fval=='-' || fval=='+'){
                var prevFVal = fval;
                for(var i=0;i<lngFields;i++){
                    var q_field = obj.q_fields[i];
                    fval = q_field.pre;
                    if(fval=='-' || fval=='+') prevFVal = fval;
                    if(prevFVal=='+'){
                        q_fields.push(q_field.name);
                    }else{
                        var locField = q_fields.indexOf(q_field.name);
                        if(locField>-1) q_fields.splice(locField,1);
                    }
                }
            }else{
                q_fields = [];
                for(var i=0;i<lngFields;i++){
                    q_fields.push(obj.q_fields[i].name);
                }
            }
        }
        return q_fields;
    };

    this.$getSearchType = function(obj){
        if(obj.q_type!==''){
            return obj.q_type
        }else{
            return self.tables[obj.table.name].defaults.q.type;
        }
    };

    this.$getBoolean = function(obj,name){
        return (obj[name]==='true');
    };

    this.$getColumns = function(fields){
        var aryColumns = [];
        fields = $extend(true,{},fields);
        for(field in fields){
            if(fields.hasOwnProperty(field)){
                var objField = fields[field];
                objField.id = field;
                objField.field = field;
                aryColumns.push(objField);
            }
        }
        return aryColumns;
    };

    this.$validateRequestedFields = function(obj,fields){ //validate requested fields
        var lngFields = obj.fields.length;
        for(var i=0;i<lngFields;i++){
            var field = obj.fields[i].name;
            if(fields[field]===undefined) return self.onError(400,100,obj._sectionExt+'field:'+field+' was not found in the collection');
        }
        return true;
    };

    this.$getRequestedFields = function(obj,fields){ //get only requested fields
        var reqFields = {};
        var lngFields = obj.fields.length;
        var fval = "";
        if(lngFields>0){
            fval = obj.fields[0].pre;
            if(fval=='-' || fval=='+'){
                reqFields = self.$gatherFields(obj,false);

                var prevFVal = fval;
                for(var i=0;i<lngFields;i++){
                    var field = obj.fields[i].name;
                    fval = obj.fields[i].pre;
                    if(fval=='-' || fval=='+') prevFVal = fval;
                    if(prevFVal=='+'){
                        reqFields[field] = fields[field];
                    }else{
                        if(reqFields[field]!==undefined) delete reqFields[field];
                    }
                }
            }else{
                for(var i=0;i<lngFields;i++){
                    var field = obj.fields[i].name;
                    reqFields[field] = fields[field];
                }
            }
        }else{
            reqFields = self.$gatherFields(obj,false);
        }
        return reqFields;
    };

    this.$validateSort = function (obj,fields){ //validate sort fields
        var lngSort = obj.sorts.length;
        for(var i=0;i<lngSort;i++){
            var field = obj.sorts[i].name;
            if(fields[field]===undefined) return self.onError(400,100,obj._sectionExt+'sort field:'+field+' was not found in the collection');
        }
        return true;
    };

    this.$validateGroup = function (obj,fields){ //validate group field
        var lngGroup = obj.groups.length;
        for(var i=0;i<lngGroup;i++){
            var field = obj.groups[i].name;
            if(fields[field]===undefined) return self.onError(400,100,obj._sectionExt+'group field:'+field+' was not found in the collection');
        }
        return true;
    };

    this.$validateLimit = function(obj){ //validate limit
        if(obj.limit!=='' && self.$isNumber(obj.limit)===false) return self.onError(400,100,obj._sectionExt+'limit:'+obj.limit+' is not a valid number');
        return true;
    };

    this.$getLimit = function(obj){ //get limit
        if(obj.limit!==''){
            return parseInt(obj.limit,10);
        }else{
            return self.tables[obj.table.name].defaults.limit.default;
        }
    };

    this.$validateOffset = function(obj){ //validate offset
        if(obj.offset!=='' && self.$isNumber(obj.offset)===false) return self.onError(400,100,obj._sectionExt+'offset:'+obj.offset+' is not a valid number');
        return true;
    };

    this.$getOffset = function(obj){ //get offset
        if(obj.offset!==''){
            return parseInt(obj.offset,10);
        }else{
            return 0;
        }
    };

    this.$validateSearchFields = function(obj,fields){
        var lngFields = obj.q_fields.length;
        for(var i=0;i<lngFields;i++){
            var field = obj.q_fields[i].name;
            if(fields[field]===undefined) return self.onError(400,100,obj._sectionExt+'q_fields:'+field+' was not found in the collection');
        }
        return true;
    };

    this.$validateSearchType = function(obj){
        switch(obj.q_type){
            case 'words': case 'phrase':
            break;
            default:
                if(obj.q_type!=='')  return self.onError(400,100,obj._sectionExt+'q_type:'+obj.q_type+' is not a valid search type');
                break;
        }
        return true;
    };

    this.$validateBoolean = function(obj,name){
        switch(obj[name]){
            case 'false': case 'true':
            break;
            default:
                if(obj.show_columns!=='')  return self.onError(400,100,obj._sectionExt+name+' can only be set to true or false');
                break;
        }
        return true;
    };

    this.$validateFilters = function(obj,fields,param){
        if(!param) param = 'filters';
        var aryFilters = obj[param];
        var aryOps = aryFilters.structure;
        var prevOps,nextOps;
        var lngOps = aryOps.length;
        var strTest = "";
        for (var i=0;i<lngOps;i++){
            var operator = aryOps[i];
            switch(operator){
                case '&&':
                case '||':
                    //can not be end
                    if(lngOps===i+1) return self.onError(400,100,obj._sectionExt+'filters: '+operator+' must be followed by an argument.');

                    //can not be start
                    if(i===0) return self.onError(400,100,obj._sectionExt+'filters: '+operator+' can not lead an argument.');

                    //must follow arg,)
                    if(i>0){
                        prevOps = aryOps[i-1];
                        if(!(prevOps=='arg' || prevOps==')')) return self.onError(400,100,obj._sectionExt+'filters: '+operator+' can not lead an argument.');
                    }

                    //must be followed by arg,(
                    if(lngOps>i+1){
                        nextOps = aryOps[i+1];
                        if(!(nextOps=='arg' || nextOps=='(')) return self.onError(400,100,obj._sectionExt+'filters: '+operator+' must be followed by an argument.');
                    }
                    strTest += "+";
                    break;
                case '(':
                    //can not be end
                    if(lngOps===i+1) return self.onError(400,100,obj._sectionExt+'filters: '+operator+' must be followed by an argument.');

                    //can not follow arg,)
                    if(i>0){
                        prevOps = aryOps[i-1];
                        if(prevOps=='arg' || prevOps==')') return self.onError(400,100,obj._sectionExt+'filters: '+operator+' can only follow an operator.');
                    }
                    strTest += "(";
                    break;
                case ')':
                    //can not be start
                    if(i===0) return self.onError(400,100,obj._sectionExt+'filters: '+operator+' can not lead an argument.');

                    //must follow arg,)
                    if(i>0){
                        prevOps = aryOps[i-1];
                        if(!(prevOps=='arg' || prevOps==')')) return self.onError(400,100,obj._sectionExt+'filters: '+operator+' must follow an argument.');
                    }
                    strTest += ")";
                    break;
                default:
                    //if not end then must be followed by &&,||,)
                    if(lngOps>i+1){
                        nextOps = aryOps[i+1];
                        if(nextOps==='arg' || nextOps==='(') return self.onError(400,100,obj._sectionExt+'filters: arguments can not be followed by arguments.');
                    }
                    strTest += "0";
                    break;
            }
        }

        //validate brackets ()... strTest string built in the for loop above;
        try{
            var strResults = eval(strTest); //controlled eval test.. IT IS SAFE!
        }catch(e){
            return self.onError(400,100,obj._sectionExt+'filters: filter arguments "()" not structured properly.');
        }

        //validate fields
        var lngFields = aryFilters.fields.length;
        for(var i=0;i<lngFields;i++){
            var field = aryFilters.fields[i].name;
            if(fields[field]===undefined) return self.onError(400,100,obj._sectionExt+'filters: '+field+' was not found in the collection');
        }

        return true;
    };

    this.$isNumber = function(n){ //validate numeric value
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    this.$init(); //initializer
};