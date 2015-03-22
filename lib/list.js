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

        console.log(strSQL);
        $sql.connect().then(function(connection){
            connection.execute(strSQL).then(function(rows) {
                var restfulActions = new $restfulActions(tables, req, res, self.errorHandler);
                rows = restfulActions.formatResponse(obj,rows);
                if(obj.list_controls){
                    response.data = rows;
                    console.log(cntSQL);
                    connection.execute(cntSQL).then(function(rows) {
                        response.total = parseInt(rows[0].total);
                        connection.release();
                        onComplete(response,obj);
                    });
                }else{
                    response = rows;
                    connection.release();
                    onComplete(response,obj);
                }
            });
        });

        return true;
    };

    this.$init();
};
