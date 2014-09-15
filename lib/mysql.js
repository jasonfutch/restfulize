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
            con.execute = function(strSQL,func){
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
            deferred.resolve(con);
        });
        return deferred.promise;
    };

    this.init();
};

module.exports = new $sql();