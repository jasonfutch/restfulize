var $sqlString = require('sql-string');
var _ = require('underscore');

module.exports = function restfulSqlString(){
    var self = this;

    this.$init = function(){
        this.sqlString = new $sqlString();
    };

    this.insert = function(obj){
        var sqlString = self.sqlString;

        sqlString.clearFields();

        var lngFields = obj.fields.length;
        for(var i=0;i<lngFields;i++){
            var aryField = (obj.fields[i].field).split('.');
            var field = aryField[aryField.length-1];
            sqlString.field(field,obj.fields[i].value+'');
        }

        return sqlString.insert(obj.table);
    };

    this.update = function(obj){
        var sqlString = self.sqlString;

        sqlString.clearFields();

        var lngFields = obj.fields.length;
        for(var i=0;i<lngFields;i++){
            sqlString.field(obj.fields[i].field,obj.fields[i].value+'');
        }

        var where = '';

        //add filter to where string
        where = self.$filter(obj,where);

        //add private filter to where string
        where = self.$filter(obj,where,'_filters');

        //add private auth to where string
        where = self.$filter(obj,where,'_auth');

        return sqlString.update(obj.table,where);
    };

    this.exist = function(obj){
        var sqlString = self.sqlString;

        sqlString.clearFields();

        sqlString.field('1');

        //set JOINS
        var lngJoins = obj.joins.length;
        for(var i=0;i<lngJoins;i++){
            sqlString.join('LEFT',obj.joins[i].name,obj.joins[i].on);
        }

        var where = '';

        //add filter to where string
        where = self.$filter(obj,where);

        //add private filter to where string
        where = self.$filter(obj,where,'_filters');

        //add private auth to where string
        where = self.$filter(obj,where,'_auth');

        //add search to where string
        var lngQFields = obj.q_fields.length;
        var lngQWords = obj.q.words.length;
        if((obj.q.phrase!=='' || lngQWords>0) && lngQFields>0 && obj.q_type!==''){
            var strTemp = '';
            var strWords = '';
            switch(obj.q_type){
                case 'words':
                    for(var i=0;i<lngQWords;i++){
                        strWords = "(";
                        for(var x=0;x<lngQFields;x++){
                            if(x>0) strWords += "OR ";
                            strWords += obj.q_fields[x]+" LIKE '%"+sqlString.clean(obj.q.words[i])+"%' ";
                        }
                        strWords += ") ";
                        if(i>0) strTemp += "AND ";
                        strTemp += strWords;
                    }
                    break;
                case 'phrase':
                    strWords = "";
                    for(var x=0;x<lngQFields;x++){
                        if(x>0) strWords += "OR ";
                        strWords += obj.q_fields[x]+" LIKE '%"+sqlString.clean(obj.q.phrase)+"%' ";
                    }
                    strTemp += strWords;
                    break;
            }
            if(strTemp!==''){
                (where!=='') ? where += " AND ("+strTemp+")" : where = strTemp;
            }
        }

        sqlString.limit('1');

        return sqlString.select(obj.table,where);
    };

    this.select = function(obj,isCountString){
        if(!isCountString) isCountString = false;
        var sqlString = self.sqlString;

        sqlString.clearFields();

        //set FIELDS
        if(isCountString){
            sqlString.field('COUNT(*) AS total');
        }else{
            var lngFields = obj.fields.length;
            for(var i=0;i<lngFields;i++){
                if(obj.fields[i].field!==obj.fields[i].as){
                    sqlString.field('('+obj.fields[i].field+') AS '+obj.fields[i].as);
                }else{
                    sqlString.field(obj.fields[i].field);
                }
            }

            var lngAggregates = obj.aggregates.length;
            if(lngAggregates>0){
                for(var i=0;i<lngAggregates;i++) {
                    sqlString.field(obj.aggregates[i].aggregate + '(' + obj.aggregates[i].name + ') AS ' + obj.aggregates[i].as);
                }
            }
        }

        //set JOINS
        var lngJoins = obj.joins.length;
        for(var i=0;i<lngJoins;i++){
            sqlString.join('LEFT',obj.joins[i].name,obj.joins[i].on);
        }

        var where = '';

        //add filter to where string
        where = self.$filter(obj,where);

        //add private filter to where string
        where = self.$filter(obj,where,'_filters');

        //add private auth to where string
        where = self.$filter(obj,where,'_auth');

        //add search to where string
        var lngQFields = obj.q_fields.length;
        var lngQWords = obj.q.words.length;
        if((obj.q.phrase!=='' || lngQWords>0) && lngQFields>0 && obj.q_type!==''){
            var strTemp = '';
            var strWords = '';
            switch(obj.q_type){
                case 'words':
                    for(var i=0;i<lngQWords;i++){
                        strWords = "(";
                        for(var x=0;x<lngQFields;x++){
                            if(x>0) strWords += "OR ";
                            strWords += obj.q_fields[x]+" LIKE '%"+sqlString.clean(obj.q.words[i])+"%' ";
                        }
                        strWords += ") ";
                        if(i>0) strTemp += "AND ";
                        strTemp += strWords;
                    }
                    break;
                case 'phrase':
                    strWords = "";
                    for(var x=0;x<lngQFields;x++){
                        if(x>0) strWords += "OR ";
                        strWords += obj.q_fields[x]+" LIKE '%"+sqlString.clean(obj.q.phrase)+"%' ";
                    }
                    strTemp += strWords;
                    break;
            }
            if(strTemp!==''){
                (where!=='') ? where += " AND ("+strTemp+")" : where = strTemp;
            }
        }

        //set LIMIT and OFFSET
        if(!isCountString) sqlString.limit(obj.limit,obj.offset);

        //set ORDERBY
        var lngSort = obj.sorts.length;
        if(lngSort>0 && !isCountString){
            var strOrderBy = '';
            for(var i=0;i<lngSort;i++){
                var sort = obj.sorts[i];
                if(i>0) strOrderBy += ",";
                strOrderBy += sort.name+" "+sort.dir;
            }
            sqlString.orderBy(strOrderBy);
        }

        //set GROUPBY
        var lngGroup = obj.groups.length;
        if(lngGroup>0){
            var strGroupBy = '';
            for(var i=0;i<lngGroup;i++){
                var group = obj.groups[i];
                if(i>0) strGroupBy += ",";
                strGroupBy += group.name;
            }
            sqlString.groupBy(strGroupBy);
        }

        return sqlString.select(obj.table,where);
    };

    this.$filter = function(obj,where,param){
        if(!param) param = 'filters';
        var aryFilters = obj[param];

        if(_.isUndefined(aryFilters) || _.isEmpty(aryFilters)) return where;

        var str = '';
        var sqlString = self.sqlString;
        //add filter to where string
        var lngFilters = aryFilters.structure.length;
        if(lngFilters>0){
            var cntArg = 0;
            for(var i=0;i<lngFilters;i++){
                var filter = aryFilters.structure[i];
                if(filter==="arg"){
                    var objArg = aryFilters.fields[cntArg];
                    var strArg = "";
                    switch(objArg.sep){
                        case '=#':
                            strArg = objArg.name+"="+sqlString.clean(objArg.value)+" ";
                            break;
                        case '>>':
                            strArg = objArg.name+">'"+sqlString.clean(objArg.value)+"' ";
                            break;
                        case '<<':
                            strArg = objArg.name+"<'"+sqlString.clean(objArg.value)+"' ";
                            break;
                        case '>=':
                            strArg = objArg.name+">='"+sqlString.clean(objArg.value)+"' ";
                            break;
                        case '<=':
                            strArg = objArg.name+"<='"+sqlString.clean(objArg.value)+"' ";
                            break;
                        case '==':
                            strArg = objArg.name+"='"+sqlString.clean(objArg.value)+"' ";
                            break;
                        case '!=':
                            strArg = objArg.name+"!='"+sqlString.clean(objArg.value)+"' ";
                            break;
                        case '%%':
                            strArg = objArg.name+" LIKE '%"+sqlString.clean(objArg.value)+"%' ";
                            break;
                        case '%a':
                            strArg = objArg.name+" LIKE '%%"+sqlString.clean(objArg.value)+"' ";
                            break;
                        case 'a%':
                            strArg = objArg.name+" LIKE '"+sqlString.clean(objArg.value)+"%%' ";
                            break;
                    }
                    str += strArg;
                    cntArg++;
                }else{
                    var strOp = "";
                    switch(filter){
                        case '&&':
                            strOp = "AND ";
                            break;
                        case '||':
                            strOp = "OR ";
                            break;
                        default:
                            strOp = filter;
                            break;
                    }
                    str += strOp;
                }
            }
            if(str!==''){
                if(where!=='') where += ' AND ';
                where += '('+str+')';
            }
        }
        return where;
    };

    this.$init(); //initializer
};
