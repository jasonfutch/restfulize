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
            var value = obj.fields[i].value+'';
            if(value==='null') value = null;
            sqlString.field(field,value);
        }

        return sqlString.insert(obj.table);
    };

    this.update = function(obj){
        var sqlString = self.sqlString;

        sqlString.clearFields();

        var lngFields = obj.fields.length;
        for(var i=0;i<lngFields;i++){
            var aryField = (obj.fields[i].field).split('.');
            var field = aryField[aryField.length-1];
            var value = obj.fields[i].value+'';
            if(value==='null') value = null;
            sqlString.field(field,value);
        }

        var where = '';

        //add filter to where string
        where = self.$filter(obj,where);

        //add private filter to where string
        where = self.$filter(obj,where,'_filters');

        //add private auth to where string
        where = self.$filter(obj,where,'_auth');

        if(typeof obj.fromClause !== 'undefined' && obj.fromClause!==''){
            sqlString.fromClause(obj.fromClause);
        }

        return sqlString.update(obj.table,where);
    };

    this.exist = function(obj){
        var sqlString = self.sqlString;

        sqlString.clearFields();

        sqlString.field('1');

        //set JOINS
        var lngJoins = obj.joins.length;
        for(var i=0;i<lngJoins;i++){
            sqlString.join('LEFT',obj.joins[i].name,obj.joins[i].on,obj.joins[i].as);
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
                            if(obj.q_fields[x].caseInsensitive){
                                strWords += "lower("+obj.q_fields[x].name+")";
                            }else{
                                strWords += obj.q_fields[x].name
                            }
                            strWords += " LIKE '%"+sqlString.clean(obj.q.words[i])+"%' ";
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
                        if(obj.q_fields[x].caseInsensitive){
                            strWords += "lower("+obj.q_fields[x].name+")";
                        }else{
                            strWords += obj.q_fields[x].name
                        }
                        strWords += " LIKE '%"+sqlString.clean(obj.q.phrase)+"%' ";
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
        var lngGroup = obj.groups.length;
        var lngSort = obj.sorts.length;

        sqlString.clearFields();

        //set FIELDS
        if(isCountString){
            if(lngGroup>0){
                sqlString.field('COUNT(DISTINCT '+obj.groups[0].name+') AS total');
            }else{
                sqlString.field('COUNT(*) AS total');
            }
        }else{
            var lngFields = obj.fields.length;
            for(var i=0;i<lngFields;i++){
                //if((obj.fields[i].field!==obj.fields[i].as) || ((obj.fields[i].field).indexOf(obj.namespace+".")===-1)){
                //if(obj.fields[i].field!==obj.fields[i].as){
                    sqlString.field('('+obj.fields[i].field+') AS "'+obj.fields[i].as+'"');
                //}else{
                //    sqlString.field(obj.fields[i].field);
                //}
            }

            var lngAggregates = obj.aggregates.length;
            if(lngAggregates>0){
                for(var i=0;i<lngAggregates;i++) {
                    sqlString.field(obj.aggregates[i].aggregate + '(' + obj.aggregates[i].name + ') AS "' + obj.aggregates[i].as+'"');
                }
            }

            if(obj._customExpression!==""){
                sqlString.field(obj._customExpression);
            }
        }

        //set JOINS
        var lngJoins = obj.joins.length;
        for(var i=0;i<lngJoins;i++){
            sqlString.join('LEFT',obj.joins[i].name,obj.joins[i].on,obj.joins[i].as);
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
                            if(obj.q_fields[x].caseInsensitive){
                                strWords += "lower("+obj.q_fields[x].name+")";
                            }else{
                                strWords += obj.q_fields[x].name
                            }
                            strWords += " LIKE '%"+sqlString.clean(obj.q.words[i])+"%' ";
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
                        if(obj.q_fields[x].caseInsensitive){
                            strWords += "lower("+obj.q_fields[x].name+")";
                        }else{
                            strWords += obj.q_fields[x].name
                        }
                        strWords += " LIKE '%"+sqlString.clean(obj.q.phrase)+"%' ";
                    }
                    strTemp += strWords;
                    break;
            }
            if(strTemp!==''){
                (where!=='') ? where += " AND ("+strTemp+")" : where = strTemp;
            }
        }


        if(!isCountString){
            //set LIMIT and OFFSET
            sqlString.limit(obj.limit,obj.offset);


            //set ORDERBY
            if(lngSort>0 && !isCountString){
                var strOrderBy = '';
                for(var i=0;i<lngSort;i++){
                    var sort = obj.sorts[i];
                    if(i>0) strOrderBy += ",";
                    if(typeof sort.keyName !== 'undefined'){
                        strOrderBy += sort.name+"#>> '{"+sort.keyName+"}' "+sort.dir;
                    }else{
                        strOrderBy += sort.name+" "+sort.dir;
                    }

                }
                sqlString.orderBy(strOrderBy);
            }

            //set GROUPBY
            if(lngGroup>0){
                var strGroupBy = '';
                for(var i=0;i<lngGroup;i++){
                    var group = obj.groups[i];
                    if(i>0) strGroupBy += ",";

                    if(typeof group.keyName !== 'undefined'){
                        strGroupBy += group.name+"#>> '{"+group.keyName+"}'";
                    }else{
                        strGroupBy += group.name;
                    }
                }
                sqlString.groupBy(strGroupBy);
            }
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
                    var objArgName;
                    var objArg = aryFilters.fields[cntArg];
                    var strArg = "";
                    var objArgValue = sqlString.clean(objArg.value);
                    var bolIsJsonbSearch = false;

                    switch(objArg.define.type){
                        case 'jsonb':
                            switch(objArg.sep){
                                case '??':
                                    objArgName = objArg.name;
                                    break;
                                default:
                                    var strSub = objArgValue.substring(0, 1);
                                    var valueOperator = '#>>';
                                    if(strSub==='{' || strSub==='['){
                                        try{
                                            var objValueTest = JSON.parse(objArgValue);
                                            valueOperator = '#>';
                                            bolIsJsonbSearch = true;
                                            objArg.sep = "@>";
                                        }catch(e){
                                            valueOperator = '#>>';
                                            bolIsJsonbSearch = false;
                                        }
                                    }

                                    if(typeof objArg.keyName !== 'undefined'){
                                        objArgName = objArg.name+valueOperator+" '{"+objArg.keyName+"}'";
                                    }else{
                                        objArgName = objArg.name+valueOperator+" '{}'";
                                    }
                            }

                            break;
                        default:
                            objArgName = objArg.name;
                    }
                    if(objArg.caseInsensitive && !bolIsJsonbSearch){
                        objArgName = "lower("+objArgName+")";
                        objArgValue = objArgValue.toLowerCase();
                    }
                    if(objArg.blankToNull && (objArg.value==='' || (objArg.value).toLowerCase()==='null') && !bolIsJsonbSearch){
                        switch(objArg.sep){
                            case '==':
                                objArg.sep = '^^';
                                break;
                            case '!=':
                                objArg.sep = '!^';
                                break;
                        }
                    }
                    switch(objArg.sep){
                        case '??':
                            strArg = objArgName+" ? '"+objArgValue+"' ";
                            break;
                        case '=#':
                            strArg = objArgName+"="+objArgValue+" ";
                            break;
                        case '>>':
                            strArg = objArgName+">'"+objArgValue+"' ";
                            break;
                        case '<<':
                            strArg = objArgName+"<'"+objArgValue+"' ";
                            break;
                        case '>=':
                            strArg = objArgName+">='"+objArgValue+"' ";
                            break;
                        case '<=':
                            strArg = objArgName+"<='"+objArgValue+"' ";
                            break;
                        case '==':
                            strArg = objArgName+"='"+objArgValue+"' ";
                            break;
                        case '@>':
                            strArg = objArgName+"@>'"+objArgValue+"' ";
                            break;
                        case '!=':
                            strArg = objArgName+"!='"+objArgValue+"' ";
                            break;
                        case '!^':
                            strArg = objArgName+" IS NOT NULL ";
                            break;
                        case '^^':
                            strArg = objArgName+" IS NULL ";
                            break;
                        case '%%':
                            strArg = objArgName+" LIKE '%"+objArgValue+"%' ";
                            break;
                        case '%a':
                            strArg = objArgName+" LIKE '%%"+objArgValue+"' ";
                            break;
                        case 'a%':
                            strArg = objArgName+" LIKE '"+objArgValue+"%%' ";
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
