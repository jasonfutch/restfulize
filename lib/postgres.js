var $pg = require('pg');
var $extend = require('extend');
var $q = require('q');

var $postgres = function(){
    var self = this;
    this.pool = null;
    this.dbConfig = null;

    this.init = function(dbConfig){
        if(!dbConfig) dbConfig = self.dbConfig;
        if(dbConfig!==null){
            self.dbConfig = dbConfig;
            self.pool  = $pg;
        }
    };

    this.connect = function() {
        var deferred = $q.defer();
        self.pool.connect(self.dbConfig, function(err, con, done) {
            if (err){
                console.log(err);
                return deferred.reject(err);
            }
            con.release = function(){ done(); };
            con.execute = function(strSQL){
                var deferred = $q.defer();
                con.query(strSQL, function(err, results) {
                    if (err){
                        console.log(err);
                        return deferred.reject(err);
                    }
                    console.log(results);
                    deferred.resolve(results.rows);
                });
                return deferred.promise;
            };
            con.rollback = function(callback){
                con.query('ROLLBACK', function(err) {
                    return callback(err);
                });
            };
            con.commit = function(callback){
                con.query('COMMIT', function(err) {
                    return callback(err);
                });
            };
            con.beginTransaction = function(callback){
                con.query('BEGIN', function(err) {
                    return callback(err);
                });
            };
            con.transaction = function(arySQL){
                console.log('transaction');
                return $q.Promise(function(resolve, reject, notify) {
                    var lngSQL = arySQL.length;
                    console.log('transaction length: '+lngSQL);
                    if(lngSQL>0){
                        var currentPosition = 0;

                        var runQuery = function(){
                            if(lngSQL===currentPosition){
                                con.commit(function(err){
                                    if(err) con.rollback(function(){ reject(err); });
                                    resolve('success!');
                                })
                            }else{
                                con.execute(arySQL[currentPosition]).then(function(results) {
                                    currentPosition++;
                                    runQuery();
                                }).fail(function(err){
                                    con.rollback(function(){
                                        reject(err);
                                    });
                                });
                            }
                        };

                        console.log('call beginTransaction');
                        con.beginTransaction(function(err){
                            console.log('finshed beginTransaction');
                            if(err) reject(err);
                            console.log('err free beginTransaction');
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

module.exports = new $postgres();