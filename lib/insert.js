var $restfulize = require('../index');
var $restfulRequest = require('./request');
var $restfulActions = require('./actions');
var $errors = require('./errors');
var $restfulSqlString = require('./sql-string');
var $sql = require('./postgres');
var $extend = require('extend');

module.exports = function restfulInsert(req, res, errorHandler){
    var self = this;
    this.errorHandler = errorHandler;

    this.$init = function(){
        if(!self.errorHandler) self.errorHandler = new $errors(req, res);
    };

    this.build = function(tables, o, setting, onComplete){
        try{
            if(!onComplete) onComplete = function(resp, obj){ res.send(resp); };

            var s = {
                ignoreQuery: false,
                ignoreBody: false,
                checkExist: false,
                transaction: false
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
            var obj = restfulRequest.POST(o);
            if(obj===false) return self.errorHandler.response();

            /*
             * Processing data
             * */
            var action = restfulActions.POST(obj,restfulRequest.params);
            action.then(function(obj){
                var arySQL = [];
                var restfulSqlString = new $restfulSqlString();

                $restfulize.helpers.sqlifyTransactions('pre',obj,arySQL);

                arySQL.push(restfulSqlString.insert(obj));

                $restfulize.helpers.sqlifyTransactions('post',obj,arySQL);

                var response = {};

                if(s.transaction===true){
                    console.log(arySQL);
                    onComplete(arySQL,obj);
                }else{
                    $sql.connect().then(function(connection){
                        console.log(arySQL);

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
                    });
                }

            },function(){
                self.errorHandler.response();
            });
        }catch(e){
            console.log(e);
        }


        return true;
    };

    this.$init();
};
