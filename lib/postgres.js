var fs = require("fs");
var $pg = require('pg');
$pg.defaults.parseInt8 = true;
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
            self.pool  = new $pg.Pool(self.dbConfig);
        }
    };

    this.connect = function() {
        var deferred = $q.defer();
        console.time('postgres.js:$connect');
        self.pool.connect(function(err, con, done) {
            console.timeEnd('postgres.js:$connect');
            if (err){
                console.log(err);
                return deferred.reject(err);
            }
            con.release = function(){ done(); };
            con.execute = function(strSQL){
                var deferred = $q.defer();
                con.query(strSQL, function(err, results) {
                    if (err){
                        return deferred.reject(err);
                    }
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
            con.createDbFromSqlFile = function(fileName,dbName){
                console.log('$restfulize.sql.processSqlFile:',fileName);
                return $q.Promise(function(resolve, reject, notify) {
                    fs.readFile(fileName, "utf8", function(err, data) {
                        if (err) reject(err);

                        data = "CREATE SCHEMA IF NOT EXISTS "+dbName+";\r\n" + data.replace(/rp_client_database_schema_name/g, dbName);

                        console.log('RUNNING SQL');

                        con.execute(data).then(function(results) {
                            console.log(results);
                            console.log('SQL EXECUTED');
                            con.commit(function(err){
                                if(err) con.rollback(function(){ reject(err); });
                                console.log('SQL COMMITED');
                                resolve('success!');
                            })
                        }).fail(function(err){
                            con.rollback(function(){
                                console.log('SQL FAILED');
                                reject(err);
                            });
                        });
                    });
                });
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

module.exports = new $postgres();