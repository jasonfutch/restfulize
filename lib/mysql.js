var $mysql = require('mysql');
var $extend = require('extend');
var $q = require('q');

var $sql = function(){
    var self = this;
    this.pool = null;
    this.dbConfig = null;

    this.init = function(dbConfig){
        if(!dbConfig) dbConfig = self.dbConfig;
        if(dbConfig!==null){
            self.dbConfig = dbConfig;
            self.pool  = $mysql.createPool(self.dbConfig);
        }
    };

    this.connect = function() {
        var deferred = $q.defer();
        self.pool.getConnection(function(err, con) {
            if (err) deferred.reject(err);
            con.execute = function(strSQL){
                var deferred = $q.defer();
                con.query(strSQL, function(err, rows, fields) {
                    if (err){
                        console.log(err);
                        deferred.reject(err);
                    }
                    deferred.resolve(rows);
                });
                return deferred.promise;
            };
            con.transaction = function(arySQL){
                return $q.Promise(function(resolve, reject, notify) {
                    var lngSQL = arySQL.length;

                    if(lngSQL>0){
                        var currentPosition = 0;

                        var runQuery = function(){
                            if(lngSQL===currentPosition){
                                con.commit(function(err){
                                    if(err) con.rollback(function(){ reject(err); });
                                    resolve('success!');
                                })
                            }else{
                                con.execute(arySQL[currentPosition]).then(function(rows) {
                                    currentPosition++;
                                    runQuery();
                                }).fail(function(err){
                                    con.rollback(function(){
                                        reject(err);
                                    });
                                });
                            }
                        };

                        con.beginTransaction(function(err){
                            if(err) reject(err);
                            runQuery();
                        });
                    }else{
                        reject('Nothing to change or add.');
                    }
                });
            };
            deferred.resolve(con);
        });
        return deferred.promise;
    };

    this.init();
};

module.exports = new $sql();