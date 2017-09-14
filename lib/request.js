var $extend = require('extend');
var $restfulize = require('../index');
var $restfulData = require('./data-tables');
var $restfulFormatters = require('./formatters');
var _ = require('underscore');

module.exports = function restfulQuery(tables, req, res, errorHandler){
    var self = this;

    var objBlank = {
        type:'', //PRIVATE - hold transaction type
        show_columns: false, //shows & hide column info
        list_controls: true, //shows & hide list controls (offset,totals,etc.)
        strict: false, //displays additional minor errors
        validators: false, //show field validators
        table: '', //name on main table being used
        namespace: '', //name on main table being used
        joins: [], //joins other tables to main table
        structure: [], //restructures a flat response into sections
        fields: [], //fields to add/minus or display
        sorts: [], //fields to sort by
        columns: [], //list of column info
        filters: {}, //search params
        groups: [], //group
        aggregates: [], //aggregate are used with groups
        limit: "", //number of items returned
        offset: "", //record starting point
        q_fields: [], //the fields used for keyword search
        q_type: "", //the type of keyword search
        q: { //keyword
            words: [],
            phrase: ""
        },
        _customExpression:"", //PRIVATE - custom expression
        _force: [], //PRIVATE - list of ignores
        _useAs: {}, //PRIVATE - allows you to use one field as another
        _auth: {}, //PRIVATE - auth search params
        _db: "", //PRIVATE - client db
        _filters: {}, //PRIVATE - search params
        _joins: [], //PRIVATE - joins other tables to main table
        _section: "", //PRIVATE - current section
        _sections: {}, //PRIVATE - available sub sections
        _skipExistCheck: false, //PRIVATE - skips Exist Check
        _skipCheckExistIn: [], //PRIVATE - list of fields to skip exist check
        _runExistChecks: [], //PRIVATE - additional Exist Checks
        _routines: [], //PRIVATE - additional routines
        _compareKey: [], //PRIVATE - additional Exist Checks,
        _transaction: [], //PRIVATE - holds transactional SQL
        _pretransaction: [] //PRIVATE - holds pretransactional SQL
    };


    this.tables = tables;
    this.params = {};
    this.onError = function(status, code, msg){
        return errorHandler.error(status, code, msg);
    };

    this.$init = function(){
        console.time('request.js:$init');
        //self.tables = $extend(true, {}, self.tables);  //COMMENTED OUT BECAUSE IT IS FIXED
        self.tables = self.tables;
        //self.dataObjects = $extend(true, {}, $restfulize.dataObjects);
        self.dataObjects = $restfulize.dataObjects;
        self.$restfulFormatter = new $restfulFormatters(tables, req, res, errorHandler);
        console.timeEnd('request.js:$init');
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

    this.build = function(type, objOrg){
        console.time('request.js:$build');

        var o = {
            overwrites: {},
            defaults: {}
        };
        o = $extend(true, o, objOrg || {});

        if(typeof o.query==='undefined') o.query = req.query;
        if(typeof o.body==='undefined') o.body = req.body;

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
            namespace: "", //objectName
            table_list: "", //full
            joins: "", //"table2" or "-table2" or "+table2:list"
            structure: "", //newsection:fields
            fields: "", //"-field2a|field2|+field3|field1",
            sections: "", //"section1|-section2" or "-" or "-section1" or "+section2"
            sort: "", //"field1|-field2",
            limit: "", //"50",
            offset: "", //"51",
            filter: "", //field:jason&&(field2:%utch||field2:fut%||field2:!ch||field2:#34||field2:%utc%)
            group: "", //field
            aggregate: "", //aggregate(field):as|aggregate(field):as
            q_fields: "", //"field2a|field2" or "+field2" or "-field2"
            q_type: "", //"words", "phrase"
            q: "" //search terms
        };

        var paramPrivate = {
            _auth: "",
            _db: "",
            _filter: "",
            _joins: "",
            _section: "",
            _sections: "",
            _skipExistCheck: "false",
            _skipCheckExistIn: [],
            _runExistChecks: [],
            _compareKey: ""
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

        //making publicly available;
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

        //validate and set strict mode
        if(self.$validateBoolean(objParams, '_skipExistCheck')===false) return false;
        obj._skipExistCheck = self.$getBoolean(objParams, '_skipExistCheck');

        //validate and set if validators are delivered
        if(self.$validateBoolean(objParams, 'validators')===false) return false;
        obj.validators = self.$getBoolean(objParams, 'validators');

        //validate and set all tables including joins
        if(self.$validateTables(objParams)===false) return false;
        obj.table = self.$getTableName(objParams);
        obj.joins = self.$getJoins(objParams);

        //set namespace
        if(objParams.namespace!==''){
            obj.namespace = objParams.namespace;
        }else{
            obj.namespace = self.$getTableNamespace(objParams);
            objParams.namespace = obj.namespace;
        }

        //validate structure
        if(self.$validateStructure(objParams)===false) return false;
        obj.structure = objParams.structure;

        //grab all fields from tables and joins
        var fields = self.$gatherFields(objParams,true);

        //validate and grab all request fields
        if(self.$validateRequestedFields(objParams, fields)===false) return false;
        var reqFields = self.$getRequestedFields(objParams, fields);
        obj.fields = self.$objToAryFields(objParams,reqFields);

        //set columns
        obj.columns = self.$getColumns(reqFields);

        //validate, convert and set sorts
        if(self.$validateSort(objParams, fields)===false) return false;
        obj.sorts = self.$convertFieldNames(objParams.sorts, fields);

        obj.sort = paramList.sort;

        //validate, convert and set sorts
        if(self.$validateGroup(objParams, fields)===false) return false;
        obj.groups = self.$convertFieldNames(objParams.groups, fields);

        //validate, convert and set sorts
        if(self.$validateAggregate(objParams, fields)===false) return false;
        obj.aggregates = self.$convertFieldNames(objParams.aggregates, fields);

        obj._compareKey = self.$convertFieldNames(objParams._compareKey, fields, true);

        //validate, convert and set q_fields
        if(self.$validateSearchFields(objParams, fields)===false) return false;
        var searchFields = self.$getSearchFields(objParams);
        obj.q_fields = self.$convertFieldNames(searchFields, fields, false, true);

        //validate and set q_type
        if(self.$validateSearchType(objParams)===false) return false;
        obj.q_type = self.$getSearchType(objParams);

        //set q
        obj.q = objParams.q;

        // set _db
        obj._db = objParams._db;

        obj._customExpression = objParams._customExpression;

        //validate, convert and set filters
        if(self.$validateFilters(objParams, fields)===false) return false;
        objParams.filters.fields = self.$convertFieldNames(objParams.filters.fields, fields, false, true);
        obj.filters = objParams.filters;

        //validate, convert and set PRIVATE filters
        if(self.$validateFilters(objParams, fields, "_filters")===false) return false;
        objParams._filters.fields = self.$convertFieldNames(objParams._filters.fields, fields, false, true);
        obj._filters = objParams._filters;

        //validate, convert and set PRIVATE auth filters
        if(self.$validateFilters(objParams, fields, "_auth")===false) return false;
        objParams._auth.fields = self.$convertFieldNames(objParams._auth.fields, fields, false, true);
        obj._auth = objParams._auth;

        //set force
        if(typeof o._force!=='undefined') obj._force = o._force;

        //set _skipCheckExistIn
        if(typeof o._skipCheckExistIn!=='undefined') obj._skipCheckExistIn = o._skipCheckExistIn;

        //set useAs
        if(typeof o._useAs!=='undefined') obj._useAs = o._useAs;

        //set routines
        if(typeof o._routines!=='undefined') obj._routines = o._routines;

        //validate and set limit
        if(self.$validateLimit(objParams)===false) return false;
        obj.limit = self.$getLimit(objParams);

        //validate and set offset
        if(self.$validateOffset(objParams)===false) return false;
        obj.offset = self.$getOffset(objParams);

        /*request type*/
        if(typeof objOrg.type !== 'undefined' || objOrg.type !== ''){
            obj.type = objOrg.type;
        }else{
            switch(type){
                case 'put':
                    obj.type = 'update';
                    break;
                case 'post':
                    obj.type = 'insert';
                    break;
                default:
                    obj.type = type;
            }
        }

        console.timeEnd('request.js:$build');

        return obj;
    };

    this.buildFilter = function(strFilter,fields,aryReplacer){
        if(!aryReplacer) aryReplacer = [];
        var objFilter = {filter:strFilter};
        var obj = self.$stringToObjectFilters('',objFilter,{},'filter');

        var lngReplacers = aryReplacer.length;
        var lngFilterFields = obj.filters.fields.length;

        for(var i=0;i<lngFilterFields;i++){
            var field = obj.filters.fields[i];
            var val = field.value;
            for(var x=0;x<lngReplacers;x++){
                var replacer = aryReplacer[x];
                val = val.replace(replacer.regex,replacer.value+'');
            }
            field.value = val;
        }

        obj.filters.fields = self.$convertFieldNames(obj.filters.fields, fields);

        return obj.filters;
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
            namespace: "",
            joins: [], //{name:"", list:"", pre:""}
            structure: [], //{section:"", param:""}
            fields: [], //{name:"", pre:""}
            sorts: [], //{name:"", dir:""}
            groups: [], //{name:"", pre:""}
            aggregates: [], //{aggregate:"", name:"", as:""}
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
            _customExpression:"",
            _force: {},
            _useAs: {},
            _routines: [],
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
            _joins: [],
            _section: "",
            _sectionExt: "",
            _sections: {},
            _skipExistCheck: "",
            _compareKey: [] //{name:""}
        };

        //To only pass variables being used;
        if(bolOnlySetValues) obj = {};

        var aryFields,lngFields,objField,field,fval,lval;

        //get section
        var _section = p._section;
        if(!_section){
            _section = '';
        }else{
            _section = self.$removeAllSpaces(_section);
        }
        if(_section!==''){
            obj._section = _section;
            _section += '.';
            obj._sectionExt = _section;
        }

        var _sections = p._sections;
        if(!_sections){
            _sections = '';
        }else{
            _sections = self.$removeAllSpaces(_sections);
        }
        if(_sections!==''){
            obj._sections = {};
            var arySections = self.$toArray(_sections);
            var lngSections = arySections.length;
            for(var i=0;i<lngSections;i++) obj._sections[arySections[i]] = "";
        }

        //_db
        var _db = p[_section+'_db'];
        if(!_db){
            _db = '';
        }else{
            _db = self.$removeAllSpaces(_db);
        }
        if(_db!=='') obj._db = _db;

        //show_columns
        var show_columns = p[_section+'show_columns'];
        if(!show_columns){
            show_columns = '';
        }else{
            show_columns = self.$removeAllSpaces(show_columns);
        }
        if(show_columns!=='') obj.show_columns = show_columns;

        //list_controls
        var list_controls = p[_section+'list_controls'];
        if(!list_controls){
            list_controls = '';
        }else{
            list_controls = self.$removeAllSpaces(list_controls);
        }
        if(list_controls!=='') obj.list_controls = list_controls;

        //strict
        var strict = p[_section+'strict'];
        if(!strict){
            strict = '';
        }else{
            strict = self.$removeAllSpaces(strict);
        }
        if(strict!=='') obj.strict = strict;

        //_skipExistCheck
        var _skipExistCheck = p[_section+'_skipExistCheck'];
        if(!_skipExistCheck){
            _skipExistCheck = '';
        }else{
            _skipExistCheck = self.$removeAllSpaces(_skipExistCheck);
        }
        if(_skipExistCheck!=='') obj._skipExistCheck = _skipExistCheck;

        //_customExpression
        var _customExpression = p[_section+'_customExpression'];
        if(!_customExpression){
            _customExpression = '';
        }
        if(_customExpression!=='') obj._customExpression = _customExpression;

        //validators
        var validators = p[_section+'validators'];
        if(!validators){
            validators = '';
        }else{
            validators = self.$removeAllSpaces(validators);
        }
        if(validators!=='') obj.validators = validators;

        //table
        var table = p[_section+'table'];
        if(!table){
            table = '';
        }else{
            table = self.$removeAllSpaces(table);
        }
        if(table!==''){
            obj.table = {name:"",list:""};
            var aryTable = self.$toArray(table,1);
            obj.table.name = aryTable[0];
            if(aryTable.length>1) obj.table.list = aryTable[1];
        }

        //namespace
        var namespace = p[_section+'namespace'];
        if(!namespace){
            namespace = '';
        }else{
            namespace = self.$removeAllSpaces(namespace);
        }
        obj.namespace = namespace;

        //table_list
        var table_list = p[_section+'table_list'];
        if(!table_list){
            table_list = '';
        }else{
            table_list = self.$removeAllSpaces(table_list);
        }
        if(table_list!==''){
            if(typeof obj.table==='undefined') obj.table = {name:"",list:""};
            obj.table.list = table_list;
        }

        //joins
        var join = p[_section+'join'];
        if(!join){
            join = '';
        }else{
            join = self.$removeAllSpaces(join);
        }
        if(join!==''){
            obj.joins = [];
            var aryJoins = self.$toArray(join);
            var lngJoins = aryJoins.length;
            for(var x=0;x<lngJoins;x++){
                var objJoin = {name:"", list:"", pre:"", on:"", as:""};
                var aryJoin = self.$toArray(aryJoins[x],1);
                var tName = aryJoin[0];
                fval = tName.substring(0,1);
                if(fval==='-' || fval==='+'){
                    objJoin.pre = fval;
                    objJoin.name = tName.substring(1);
                }else{
                    objJoin.name = tName;
                }
                if(aryJoin.length>1) objJoin.list = aryJoin[1];
                if(aryJoin.length>2) objJoin.on = aryJoin[2];
                if(aryJoin.length>3) objJoin.as = aryJoin[3];
                obj.joins.push(objJoin);
            }
        }

        //structure
        var structure = p[_section+'structure'];
        if(!structure){
            structure = '';
        }else{
            structure = self.$removeAllSpaces(structure);
        }
        if(structure!==''){
            obj.structure = [];
            var aryStructures = self.$toArray(structure);
            var lngStructures = aryStructures.length;
            var structureBin = {};
            var structureBinLargest = 0;
            for(var y=0;y<lngStructures;y++){
                var objStructure = {section:"", arySection:[], param:""};
                var aryStructure = self.$toArray(aryStructures[y],1);
                objStructure.section = aryStructure[0];
                objStructure.arySection = objStructure.section.split('.');
                if(aryStructure.length>1) objStructure.param = aryStructure[1];

                //sort section order by child depth;
                var binCountString = objStructure.arySection.length+'';
                if(typeof structureBin[binCountString]==='undefined') structureBin[binCountString] = [];
                structureBin[binCountString].push(objStructure);
                if(structureBinLargest<objStructure.arySection.length) structureBinLargest = objStructure.arySection.length;
            }
            for(var z=structureBinLargest;z>=0;z--){
                if(typeof structureBin[z+'']!=='undefined') obj.structure = obj.structure.concat(structureBin[z+'']);
            }
        }

        //_compareKey
        var _compareKey = p[_section+'_compareKey'];
        if(!_compareKey){
            _compareKey = '';
        }else{
            _compareKey = self.$removeAllSpaces(_compareKey);
        }
        if(_compareKey!==''){
            obj._compareKey = [];
            aryCompareKey = self.$toArray(_compareKey);
            lngCompareKey = aryCompareKey.length;
            for(var ii=0;ii<lngCompareKey;ii++){
                objCompareKey = {name:""};
                objCompareKey.name = aryCompareKey[ii];
                obj._compareKey.push(objCompareKey);
            }
        }

        //fields
        var fields = p[_section+'fields'];
        (!fields) ? fields='' : fields = self.$removeAllSpaces(fields);
        if(fields!==''){
            obj.fields = [];
            aryFields = self.$toArray(fields,4);
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
            aryFields = self.$toArray(q_fields,4);
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
            var arySort = self.$toArray(sort,4);
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
            var aryGroups = self.$toArray(group,4);
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

        //aggregate
        var aggregate = p[_section+'aggregate'];
        (!aggregate) ? aggregate='' : aggregate = self.$removeAllSpaces(aggregate);
        if(aggregate!==''){
            obj.aggregates = [];
            var aryAggregates = self.$toArray(aggregate,4);
            var lngAggregates = aryAggregates.length;
            for(var i=0;i<lngAggregates;i++){
                var objAggregate = {aggregate:"", name:"", as:""};
                var aryStatement = self.$toArray(aryAggregates[i],1);
                if(aryStatement.length>1) objAggregate.as = aryStatement[1];
                var aryAggregate = self.$toArray(aryStatement[0],2);
                if(aryAggregate.length===4){
                    objAggregate.aggregate = aryAggregate[0];
                    objAggregate.name = aryAggregate[2];
                }
                obj.aggregates.push(objAggregate);
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
            default:
                strFilter = param+"";
                strFilters = param+"";
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
                            aryArgs.shift();
                            var value = aryArgs.join(':');
                            if(value!==''){
                                var fval = value.substring(0,1);
                                var sval = (value.length>1) ? value.substring(1,2) : "";
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
                                        objArg.sep = "!=";
                                        switch(sval){
                                            case '=':
                                                objArg.value = value.substring(2);
                                                break;
                                            case '^':
                                                objArg.sep = "!^";
                                                objArg.value = '';
                                                break;
                                            default:
                                                objArg.value = value.substring(1);
                                        }

                                        break;
                                    case '^':
                                        objArg.sep = "^^";
                                        objArg.value = '';
                                        break;
                                    case '?':
                                        objArg.sep = "??";
                                        objArg.value = value.substring(1);
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
        if(typeof defaults.table!=='undefined'){
            if(defaults.table.name!=='') obj.table.name = defaults.table.name;
            if(defaults.table.list!=='' && obj.table.list==='') obj.table.list = defaults.table.list;
        }
        if(typeof defaults.fields!=='undefined'){
            if(defaults.fields.length>0){
                if(defaults.fields[0].pre===''){
                    //this will add fields to a blank set so other can be include for client
                    defaults.fields[0].pre = '+';
                    obj.table.list = 'blank';
                    if(typeof defaults.joins!=='undefined'){
                        for(var i=0;i<lngJoins;i++){
                            defaults.joins[i].list = 'blank';
                        }
                    }
                }
            }
            obj.fields = self.$combineDefaultsPre(obj.fields,defaults.fields);
        }

        //defaults.fields must process before joins to reset join lists, if needed.
        if(typeof defaults.joins!=='undefined'){
            obj.joins = self.$combineDefaultsPre(obj.joins,defaults.joins);
        }
        if(typeof defaults.structure!='undefined'){
            if(obj.structure.length===0) obj.structure = defaults.structure;
        }
        if(typeof defaults.sorts!=='undefined'){
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
        if(typeof _section==='undefined' || _section===''){
            return obj;
        }else{
            var objO = {};
            for(var item in obj){
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
        return (str+'').replace(/ /g,'');
    };

    this.$toArray = function(str,type){ //string into array
        if(!type) type = 0;
        switch(type){
            case 0: // |
                return str.match(/(?:[^\|]|\|\|)+/g);
            case 1: // :
                // return str.split(/(?:[^[:]]|:)+/g);
                return str.split(/:/g);
            case 2: // () && ||
                return str.split(/([()]|&&|\|\|)/).filter(function(x){ return x; });
            case 3: //space
                str = self.$removeMultipleSpaces(str);
                return str.split(' ');
            case 4: //comma
                str = self.$removeAllSpaces(str);
                return str.split(',');
            default:
                return [];

        }
    };

    this.$convertFieldNames = function(obj,fields, bolRemoveDotNotation, strict){
        if(!bolRemoveDotNotation) bolRemoveDotNotation = false;
        if(!strict) strict = false;
        var objField;
        var cvtFields = [];
        var lngFields = obj.length;
        var isObject = (typeof obj[0]=="object");

        for(var i=0;i<lngFields;i++){
            if(isObject){
                objField = obj[i];
                var objColumn = fields[objField.name];
                if(typeof objColumn==='undefined') console.log('field: '+objField.name+' could not be found');
                objField.name = objColumn.field;
                objField.caseInsensitive = objColumn.actions.caseInsensitive;
                objField.define = objColumn.define;
                objField.blankToNull = objColumn.actions.blankToNull;
                if(objField.value && objColumn.formatter.inbound.length>0) objField.value = self.$restfulFormatter.$processFormatters(objField.alias,objField.value,objColumn.formatter.inbound,strict)+'';
            }else{
                objField = fields[obj[i]].field;
            }
            if(bolRemoveDotNotation){
                if(typeof objField.name!=='undefined'){
                    var aryField = (objField.name).split('.');
                    objField.name = aryField[aryField.length-1];
                }
            }
            cvtFields.push(objField);
        }

        return cvtFields;
    };

    this.$validateTables = function(obj){ //validates tables, joins & lists
        if(typeof self.tables[obj.table.name]==='undefined') return this.onError(400,100,obj._sectionExt+'table:'+obj.table.name+' not found');
        if(obj.table.list!==''){
            if(typeof self.tables[obj.table.name].lists[obj.table.list]==='undefined') return self.onError(400,100,obj._sectionExt+'list:'+obj.table.list+' not found in table:'+obj.table.name);
        }
        var lngJoins = obj.joins.length;
        for(var i=0;i<lngJoins;i++){
            var join = obj.joins[i];
            if(typeof self.tables[join.name]==='undefined') return this.onError(400,100,obj._sectionExt+'table:'+join.name+' not found');
            //if(typeof self.tables[obj.table.name].joins[join.name]==='undefined' || typeof $restfulData.joins[obj.table.name][join.name]==='undefined') return self.onError(400,100,obj._sectionExt+'table:'+join.name+' is not allowed to join to table:'+obj.table.name+'.');
            if(join.list!==''){
                if(typeof self.tables[join.name].lists[join.list]==='undefined') return self.onError(400,100,obj._sectionExt+'list:'+join.list+' not found in '+obj._sectionExt+'table:'+join.name);
            }
        }
        return true;
    };

    this.$getTableName = function(obj){
        return self.$dbToName(self.tables[obj.table.name].name+'',obj);
    };

    this.$getTableNamespace = function(obj){
        return self.tables[obj.table.name].namespace+'';
    };

    this.$getJoins = function(obj){
        /*
        * Grab smart joins first, then overwrite joins with passed in ones.
        * */

        var lngJoins = obj.joins.length;
        var aryJoins = [];
        //console.log(obj.joins);
        for(var i=0;i<lngJoins;i++){
            var smartJoins = $restfulData.joins[obj.table.name][obj.joins[i].name];
            //console.log(smartJoins);
            if(typeof smartJoins==='undefined' || obj.joins[i].on!=='') {
                if(typeof self.tables[obj.table.name].joins[obj.joins[i].name]!=='undefined') {
                    var join =  {
                        name: self.$dbToName(self.tables[obj.joins[i].name].name, obj) + '',
                        on: self.tables[obj.table.name].joins[obj.joins[i].name].on + '',
                        as:""
                    };
                    if(obj.joins[i].on!=='') join.on = obj.joins[i].on;
                    if(obj.joins[i].as!=='') join.as = obj.joins[i].as;
                    aryJoins.push(join);
                }
            }else{
                var lngSmartJoins = smartJoins.length;
                for(var x=0;x<lngSmartJoins;x++){
                    var join = smartJoins[x];
                    aryJoins.push({
                        name: self.$dbToName(self.tables[join.name].name+'', obj) + '',
                        on: join.on,
                        as:""
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
        if(obj.list==='') obj.list = table.defaults.list+'';
        var tableFields = table.fields;
        var list = table.lists[obj.list];
        var asName = '';
        if(typeof obj.as !== 'undefined' && obj.as !== '') asName = obj.as;
        if(typeof list!=='undefined' && !bolCustom){
            lngList = list.length;
            for(var i=0;i<lngList;i++){
                var field = list[i]+'';
                if(typeof tableFields[field]!=='undefined'){
                    if(asName!==''){
                        fields[self.$replaceNamespace(field,asName)] = self.$asNamespaceReplace($extend(true, {}, tableFields[field]),asName);
                    }else{
                        fields[field] = $extend(true, {}, tableFields[field]);
                    }
                }
            }
        }else{
            var aryTableName = (table.name).split('.');
            var tableName = aryTableName[aryTableName.length-1];

            if(asName!==''){
                tableFields = $extend(true, {}, tableFields);
                var aryFields = Object.keys(tableFields);
                var lngFields = aryFields.length;
                for(var i=0;i<lngFields;i++){
                    fields[self.$replaceNamespace(aryFields[i],asName)] = self.$asNamespaceReplace(tableFields[aryFields[i]],asName);
                }
                fields[self.$replaceNamespace(table.namespace+".*",asName)] = self.$asNamespaceReplace({"field": tableName+".*", "actions":{}, "define":{}},asName);
            }else{
                fields = $extend(true, {}, tableFields);
                fields[table.namespace+".*"] = {
                    "field": tableName+".*",
                    "actions":{},
                    "define":{}
                };
            }
        }
        return fields;
    };

    this.$replaceNamespace = function(name,asName){
        var aryName = name.split('.');
        var newName = '';
        if(aryName.length>1){
            newName =  asName+'.'+aryName[1];
        }else{
            newName =  asName+'.'+name;
        }
        return newName;
    };

    this.$asNamespaceReplace = function(objField,asName){
        objField.field = self.$replaceNamespace(objField.field,asName);
        return objField;
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
            if(typeof smartJoins==='undefined' || (typeof join.as !== 'undefined' && join.as !== '')) {
                fields = $extend(true, fields, self.$getFields(join, bolGetAll));
            }else{
                var lngSmartJoins = smartJoins.length;
                for (var x = 0; x < lngSmartJoins; x++) {
                    var join = $extend(true, {}, smartJoins[x]);
                    var searchJoins = _.where(obj.joins,{"name":join.name});
                    if(searchJoins.length>0) join.list = searchJoins[0].list;
                    fields = $extend(true, fields, self.$getFields(join, bolGetAll));
                }
            }
        }
        return fields;
    };

    this.$objToAryFields = function(obj,fields){
        var aryFields = [];
        for(var field in fields){
            if(fields.hasOwnProperty(field)){
                var objField;
                if(typeof fields[field]==='undefined'){
                    objField = fields[obj.namespace + '.' + field];
                }else{
                    objField = fields[field];
                }
                aryFields.push({field:objField.field, as:field});
            }
        }
        return aryFields;
    };

    this.$getSearchFields = function(obj){
        var q_fields = $extend(true, [], self.tables[obj.table.name].defaults.q.fields);
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
        var lngFields = q_fields.length;
        for(var i=0;i<lngFields;i++){
            q_fields[i] = {name:q_fields[i]}
        }
        return q_fields;
    };

    this.$getSearchType = function(obj){
        if(obj.q_type!==''){
            return obj.q_type
        }else{
            return self.tables[obj.table.name].defaults.q.type+'';
        }
    };

    this.$getBoolean = function(obj,name){
        return (obj[name]==='true');
    };

    this.$getColumns = function(fields){
        var aryColumns = [];
        fields = $extend(true,{},fields);
        for(var field in fields){
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
            var checkField = field;
            var aryField = field.split('.');
            if(typeof fields[checkField]==='undefined' || checkField.indexOf('*')>-1) {
                if(typeof fields[obj.namespace + '.' + field]!=='undefined' && checkField.indexOf('*')===-1){
                    obj.fields[i].name = obj.namespace + '.' + field;
                }else{
                    return self.onError(400,100,obj._sectionExt+'field:\''+field+'\' was not found in the collection');
                }
            }
        }
        return true;
    };

    this.$validateStructure = function(obj){
        var lngStructure = obj.structure.length;
        for(var i=0;i<lngStructure;i++){
            var structure = obj.structure[i];
            if(structure.section==='' || structure.param==='') return self.onError(400,100,obj._sectionExt+'restructure '+structure.section+':'+structure.param+' must be formatted as section:param');
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
                        if(typeof reqFields[field]!=='undefined') delete reqFields[field];
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

    this.$getObject = function(object){
        var dataObject = self.dataObjects[object];
        if(typeof dataObject!=='undefined') {
            var fields = dataObject.fields;
            for (var field in dataObject.fields) {
                if (fields.hasOwnProperty(field)) {
                    if (typeof value[field] === 'undefined') {
                        value[field] = '';
                    }
                }
            }
        }
    };

    this.$validateSort = function (obj,fields){ //validate sort fields
        var lngSort = obj.sorts.length;
        for(var i=0;i<lngSort;i++){
            var sortValid = false;
            var field = obj.sorts[i].name;
            var aryField = field.split('.');
            var lngAryField = aryField.length;
            if(lngAryField>1){
                if(typeof fields[obj.namespace + '.' + aryField[0]] !== 'undefined'){
                    var objColumn = fields[obj.namespace + '.' + aryField[0]];
                    switch(objColumn.define.type){
                        case 'jsonb':
                            var keyName = aryField[1];
                            for(var x=2;x<lngAryField;x++){
                                keyName += ','+aryField[x]
                            }
                            obj.sorts[i].name = obj.namespace + '.' + aryField[0];
                            obj.sorts[i].keyName = keyName;
                            sortValid = true;
                            if(typeof objColumn.actions.object !== 'undefined'){

                            }
                            break;
                        default:
                            //do nothing
                    }
                }else if(typeof fields[field]!=='undefined'){
                    obj.sorts[i].name = field;
                    sortValid = true;
                }
            }else{
                if(typeof fields[obj.namespace + '.' + field]!=='undefined'){
                    obj.sorts[i].name = obj.namespace + '.' + field;
                    sortValid = true;
                }
            }
            if(sortValid===false){
                return self.onError(400,142,obj._sectionExt+'sort field:\''+field+'\' is not a sortable field in the collection');
            }
        }
        return true;
    };

    this.$validateGroup = function (obj,fields){ //validate group field
        var lngGroup = obj.groups.length;
        for(var i=0;i<lngGroup;i++){
            var groupValid = false;
            var field = obj.groups[i].name;
            var aryField = field.split('.');
            var lngAryField = aryField.length;
            if(lngAryField>1){
                console.log('$validateGroup: '+obj.namespace + '.' + aryField[0]);
                if(typeof fields[obj.namespace + '.' + aryField[0]] !== 'undefined'){
                    console.log('$validateGroup2');
                    var objColumn = fields[obj.namespace + '.' + aryField[0]];
                    switch(objColumn.define.type){
                        case 'jsonb':
                            console.log('$validateGroup3');
                            var keyName = aryField[1];
                            for(var x=2;x<lngAryField;x++){
                                keyName += ','+aryField[x]
                            }
                            obj.groups[i].name = obj.namespace + '.' + aryField[0];
                            obj.groups[i].keyName = keyName;
                            groupValid = true;
                            if(typeof objColumn.actions.object !== 'undefined'){

                            }
                            break;
                        default:
                        //do nothing
                    }
                }else if(typeof fields[field]!=='undefined'){
                    obj.groups[i].name = field;
                    groupValid = true;
                }
            }else{
                if(typeof fields[obj.namespace + '.' + field]!=='undefined'){
                    obj.groups[i].name = obj.namespace + '.' + field;
                    groupValid = true;
                }
            }
            if(groupValid===false){
                return self.onError(400,143,obj._sectionExt+'group field:\''+field+'\' was not found in the collection');
            }
        }
        return true;
    };

    //this.$validateGroup = function (obj,fields){ //validate group field
    //    var lngGroup = obj.groups.length;
    //    for(var i=0;i<lngGroup;i++){
    //        var field = obj.groups[i].name;
    //        if(typeof fields[field]==='undefined') return self.onError(400,100,obj._sectionExt+'group field:\''+field+'\' was not found in the collection');
    //    }
    //    return true;
    //};

    this.$validateAggregate = function (obj,fields){ //validate aggregate field
        var lngAggregate = obj.aggregates.length;
        for(var i=0;i<lngAggregate;i++){
            console.log(obj.aggregates[i]);
            if(obj.aggregates[i].name==='') return self.onError(400,100,obj._sectionExt+'aggregate is missing the FIELD parameter. Please make sure you formatted it correctly.. "aggregate(field):as"');
            if(obj.aggregates[i].aggregate==='') return self.onError(400,100,obj._sectionExt+'aggregate is missing AGGREGATE parameter. Please make sure you formatted it correctly.. "aggregate(field):as"');
            if(obj.aggregates[i].as==='') return self.onError(400,100,obj._sectionExt+'aggregate is missing the AS parameter. Please make sure you formatted it correctly.. "aggregate(field):as"');
            var field = obj.aggregates[i].name;
            if(typeof fields[field]==='undefined') return self.onError(400,100,obj._sectionExt+'aggregate field:\''+field+'\' was not found in the collection');
        }
        return true;
    };

    this.$validateLimit = function(obj){ //validate limit
        if(obj.limit!=='' && self.$isNumber(obj.limit)===false) return self.onError(400,100,obj._sectionExt+'limit:'+obj.limit+' is not a valid number');
        return true;
    };

    this.$getLimit = function(obj){ //get limit
        var limit;
        var limitDefaults = self.tables[obj.table.name].defaults.limit;
        if(obj.limit!==''){
            limit = parseInt(obj.limit,10);
            if(limit>limitDefaults.max) limit = limitDefaults.max+0;
        }else{
            limit = limitDefaults.default+0;
        }
        return limit;
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
            if(typeof fields[field]==='undefined'){
                if(typeof fields[obj.namespace+'.'+field]!=='undefined'){
                    obj.q_fields[i].name = obj.namespace+'.'+field;
                }else{
                    return self.onError(400,100,obj._sectionExt+'q_fields:\''+field+'\' was not found in the collection');
                }
            }
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
                        if(!(prevOps=='arg' || prevOps==')')){
                            console.log(obj);
                            return self.onError(400,100,obj._sectionExt+'filters: '+operator+' must follow an argument.');
                        }
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
            var fieldValid = false;
            var field = aryFilters.fields[i].name;
            var aryField = field.split('.');
            var lngAryField = aryField.length;
            if(lngAryField>1){
                var fieldPart = 0;
                if(obj.namespace===aryField[fieldPart]) fieldPart++;
                if(typeof fields[obj.namespace + '.' + aryField[fieldPart]] !== 'undefined'){
                    var objColumn = fields[obj.namespace + '.' + aryField[fieldPart]];
                    switch(objColumn.define.type){
                        case 'jsonb':
                            var keyName = aryField[fieldPart+1];
                            for(var x=fieldPart+2;x<lngAryField;x++){
                                keyName += ','+aryField[x]
                            }
                            aryFilters.fields[i].name = obj.namespace + '.' + aryField[fieldPart];
                            aryFilters.fields[i].keyName = keyName;
                            fieldValid = true;
                            break;
                        default:
                            aryFilters.fields[i].name = field;
                            fieldValid = true;
                    }
                }else if(typeof fields[field]!=='undefined'){
                    aryFilters.fields[i].name = field;
                    fieldValid = true;
                }
            }else {
                if (typeof fields[obj.namespace + '.' + field] !== 'undefined') {
                    aryFilters.fields[i].name = obj.namespace + '.' + field;
                    fieldValid = true;
                }
            }
            if(fieldValid===false) {
                return self.onError(400, 100, obj._sectionExt + 'filters: \'' + field + '\' was not found in the collection');
            }
        }

        return true;
    };

    this.$isNumber = function(n){ //validate numeric value
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    this.$init(); //initializer
};