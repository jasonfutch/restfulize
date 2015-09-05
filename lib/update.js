var $restfulRequest = require('./request');
var $restfulActions = require('./actions');
var $errors = require('./errors');
var $restfulSqlString = require('./sql-string');
var $sql = require('./postgres');
var $extend = require('extend');

module.exports = function restfulUpdate(req, res, errorHandler){
    var self = this;
    this.errorHandler = errorHandler;

    this.$init = function(){
        if(!self.errorHandler) self.errorHandler = new $errors(req, res);
    };

    this.build = function(tables, o, setting, onComplete){
        if(!onComplete) onComplete = function(resp, obj){ res.send(resp); };

        var s = {
            ignoreQuery: false,
            ignoreBody: false,
            checkExist: false
        };
        s = $extend(true, s, setting || {});

        //defining query so it won't be populated by restfulRequest
        if(s.ignoreQuery && typeof o.query==='undefined') o.query = {};

        //defining body so it won't be populated by restfulRequest (mainly for internal updating)
        if(s.ignoreBody && typeof o.body==='undefined') o.body = {};

        if(typeof o.overwrites==='undefined') o.overwrites = {};
        o.overwrites.table_list = "*";

        var restfulRequest = new $restfulRequest(tables, req, res, self.errorHandler);
        var restfulActions = new $restfulActions(tables, req, res, self.errorHandler);

        /*
        * Grabbing data
        * */
        var obj = restfulRequest.PUT(o);
        if(obj===false) return self.errorHandler.response();

        /*
        * Processing data
        * */

        var actions = restfulActions.PUT(obj,restfulRequest.params);
        actions.then(function(obj){
            var arySQL = [];
            var restfulSqlString = new $restfulSqlString();
            var lngTransaction = obj._transaction.length;
            if(obj._transaction.length>0){
                for(var i=0;i<lngTransaction;i++){
                    var transaction = obj._transaction[i];
                    switch(transaction.type){
                        case 'insert':
                            arySQL.push(restfulSqlString.insert(transaction.data));
                            break;
                        case 'update':
                            arySQL.push(restfulSqlString.update(transaction.data));
                            break;
                        case 'delete':
                            arySQL.push(restfulSqlString.delete(transaction.data));
                            break;
                    }
                }
            }
            arySQL.push(restfulSqlString.update(obj));

            var response = {};

            console.log(arySQL);
            if(s.transaction===true){
                onComplete(arySQL,obj);
            }else {
                $sql.connect().then(function(connection){
                    connection.transaction(arySQL).then(function () {
                        connection.release();
                        response = {
                            "status": "success"
                        };
                        onComplete(response,obj);
                    }, function (err) {
                        connection.release();
                        onComplete(err,obj);
                    });
                },function(err){
                    connection.release();
                    onComplete(err[0],obj);
                });
            }

        }).fail(self.errorHandler.response);

        return true;
    };

    this.$init();
};
