var $restfulRequest = require('./request');
var $restfulActions = require('./actions');
var $errors = require('./errors');
var $restfulSqlString = require('./sql-string');
var $sql = require('./postgres');
var $extend = require('extend');

module.exports = function restfulList(req,res,errorHandler){
    var self = this;
    this.errorHandler = errorHandler;

    this.$init = function(){
        if(!self.errorHandler) self.errorHandler = new $errors(req,res);
    };

    this.build = function(tables, o, onComplete){
        console.time('list.initialize');
        if(!onComplete) onComplete = function(resp, obj){ res.send(resp); };

        var restfulRequest = new $restfulRequest(tables, req, res, self.errorHandler);

        var obj = restfulRequest.LIST(o);

        if(obj==false) return self.errorHandler.response();

        var restfulSqlString = new $restfulSqlString();
        var strSQL = restfulSqlString.select(obj);
        var cntSQL = restfulSqlString.select(obj,true);

        var response = {
            q: obj.q.phrase,
            q_type: obj.q_type,
            offset: obj.offset,
            sort: obj.sort,
            limit: obj.limit,
            total: 0,
            columns: obj.columns,
            data: []
        };

        if(obj.show_columns===false){
            delete response.columns;
        }else{
            var lngColumns = response.columns.length;
            for(var i=0;i<lngColumns;i++){
                delete response.columns[i].actions;
                delete response.columns[i].define;
            }
        }

        if(obj.q.phrase===''){
            delete response.q;
            delete response.q_type;
        }
        console.timeEnd('list.initialize');
        console.log(strSQL);
        console.time('list.sql');
        $sql.connect().then(function(connection){
            connection.execute(strSQL).then(function(rows) {
                console.timeEnd('list.sql');
                console.time('list.format');
                var restfulActions = new $restfulActions(tables, req, res, self.errorHandler);
                rows = restfulActions.formatResponse(obj,rows);
                console.timeEnd('list.format');
                if(obj.list_controls){
                    response.data = rows;
                    if(rows.length>0 && rows.length===obj.limit){
                        console.log(cntSQL);
                        console.time('list.sqlCount');
                        connection.execute(cntSQL).then(function(rows) {
                            console.timeEnd('list.sqlCount');
                            response.total = parseInt(rows[0].total);
                            connection.release();
                            onComplete(response,obj);
                        },function(err){
                            connection.release();
                            res.send(err);
                        });
                    }else{
                        response.total = rows.length;
                        connection.release();
                        onComplete(response,obj);
                    }
                }else{
                    response = rows;
                    connection.release();
                    onComplete(response,obj);
                }
            },function(err){
                connection.release();
                self.errorHandler.error(400,err.code,err+'');
                return self.errorHandler.response();
            });
        });

        return true;
    };

    this.$init();
};
