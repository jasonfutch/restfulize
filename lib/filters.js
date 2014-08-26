var crypto = require('crypto');
var uuid = require('node-uuid');

/*restful filters*/
module.exports = function restfulFilters(tables, req, res, errorHandler){
    var self = this;
    this.$sanitize = require('validator');
    this.onError = function(status, code, msg){ return errorHandler.error(status, code, msg) };

    this.$init = function(){
//        self.$validator.error = function(msg) {
//            console.log('Fail: '+msg);
//        }
    };

    this.$init(); //initializer

    return {
        trim: function(str){
            return self.$sanitize.trim(str);
        },
        ltrim: function(str){
            return self.$sanitize.ltrim(str);
        },
        rtrim: function(str){
            return self.$sanitize.rtrim(str);
        },
        float: function(str){
            return self.$sanitize.toFloat(str);
        },
        integer: function(str){
            return self.$sanitize.toInt(str);
        },
        boolean: function(str){
            return self.$sanitize.toBoolean(str);
        },
        booleanStrict: function(str){
            return self.$sanitize.toBoolean(str,true);
        },
        escape: function(str){
            return self.$sanitize.escape(str);
        },
        md5: function(str){
            var salt = '198162450afafd4f3b62e5a76f55af52';
            return crypto.createHash("md5").update(str+salt).digest("hex");
        },
        uuid: function(){
            return uuid.v1();
        },
        booleanToNumeric: function(str){
            if(str==='true' || str==='1'){
                return '1';
            }else{
                return '0';
            }
        }
    };
};