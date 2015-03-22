var crypto = require('crypto');
var uuid = require('node-uuid');
var dateFormat = require('dateformat');
var _ = require('underscore');

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
        arrayToString: function(ary){
            if(_.isArray(ary)){
                return '{'+ary.join()+'}';
            }else{
                return '{'+ary+'}';
            }
        },
        max: function(str,lng){
            if(!lng) lng = 36;
            if(str.length > lng){
                return str.substring(0, lng);
            }else{
                return str;
            }
        },
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
        lowercase: function(str){
            return (str+'').toLowerCase();
        },
        uppercase: function(str){
            return (str+'').toUpperCase();
        },
        md5: function(str){
            var salt = '198162450afafd4f3b62e5a76f55af52';
            return crypto.createHash("md5").update(str+salt).digest("hex");
        },
        uuid: function(str){
            if(str!==''){
                return str;
            }else{
                return uuid.v1();
            }
        },
        orderNumber: function(){
            function pad(num, size) {
                var s = num+"";
                while (s.length < size) s = "0" + s;
                return s;
            }

            return (new Date).getTime() + pad(Math.floor((Math.random() * 999) + 1),3);
        },
        unixTime: function(){
            return (new Date).getTime();
        },
        dateTime: function(str){
            return dateTime(str)
        },
        dateTimeForce: function(str){
            return dateTime(str,true)
        },
        booleanToboolean: function(str){
            str = (str+'').toLowerCase();
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1'){
                return 'true';
            }else{
                return 'false';
            }
        },
        booleanToBoolean: function(str){
            str = (str+'').toLowerCase();
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1'){
                return 'true';
            }else{
                return 'false';
            }
        },
        booleanToNumeric: function(str){
            str = (str+'').toLowerCase();
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1'){
                return '1';
            }else{
                return '0';
            }
        },
        booleanToPolar: function(str){
            str = (str+'').toLowerCase();
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1'){
                return 'YES';
            }else{
                return 'NO';
            }
        },
        booleanToPolarBlank: function(str){
            str = (str+'').toLowerCase();
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1'){
                return 'yes';
            }else{
                return '';
            }
        }
    };
};

var dateTime = function(str,bol){ //boolean to populate if blank
    var now;
    if(!bol) bol = false;
    if(str==='' && bol===false) return str;
    if (str) {
        if (str === (parseInt(str) + '')) {
            now = new Date(parseInt(str));
        } else {
            now = new Date(str);
        }
        if (now == 'Invalid Date'){
            return str;
        }
    }else{
        now = new Date();
    }
    return dateFormat(now, "yyyy/mm/dd HH:MM:ss");
}