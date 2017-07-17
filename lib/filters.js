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
        enum: function(value,ary,strDefault){
            var foundEnum = false;
            var lngAry = ary.length;
            for(var i=0;i<lngAry;i++){
                if((ary[i]+'').toLowerCase()===(value+'').toLowerCase()){
                    foundEnum = true;
                    value = ary[i];
                    break;
                }
            }
            if(foundEnum===false && lngAry>0) value = strDefault;
            return value;
        },
        tel: function(str){
            return str.replace(/[^0-9]+/g, '');
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
        decimal: function(str,percision){
            if(typeof percision === 'undefined') percision = 2;
            var dec = parseFloat(parseFloat(str).toFixed(percision));
            //if(dec===null) dec = 0;
            return dec;
        },
        float: function(str){
            var dec = self.$sanitize.toFloat(str);
            //if(dec===null) dec = 0;
            return dec;
        },
        integer: function(str){
            var int = self.$sanitize.toInt(str);
            //if(int===null) int = 0;
            return int;
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
            if(typeof str === 'undefined' || str==='') str = uuid.v1();

            var md5Reg = /^[a-f0-9]{32}$/i;
            if(md5Reg.test(str)){
                return str;
            }else{
                return crypto.createHash("md5").update(str).digest("hex");
            }
        },
        md5_salt: function(str){
            var salt = '198162450afafd4f3b62e5a76f55af52';
            if(typeof str === 'undefined' || str==='') str = uuid.v1();

            var md5Reg = /^[a-f0-9]{32}$/i;
            if(md5Reg.test(str)){
                return str;
            }else{
                return crypto.createHash("md5").update(str+salt).digest("hex");
            }
        },
        camelToUnderscore: function(str){
            if(typeof str === 'undefined' && str===''){
                return '';
            }else {
                return str.replace(/([A-Z])/g, function ($1) {
                    return "_" + $1.toLowerCase();
                });
            }
        },
        uuid: function(str){
            if(typeof str !== 'undefined' && str!==''){
                return str;
            }else{
                return uuid.v1();
            }
        },
        jsonb: function(obj){
            if(_.isObject(obj)){
                return obj;
            }else{
                return {};
            }
        },
        array: function(ary){
            if(_.isArray(ary)){
                return ary;
            }else{
                return [];
            }
        },
        stringify: function(obj){
            return JSON.stringify(obj);
        },
        orderNumber: function(){
            function pad(num, size) {
                var s = num+"";
                while (s.length < size) s = "0" + s;
                return s;
            }

            return (new Date).getTime() + pad(Math.floor((Math.random() * 999) + 1),3);
        },
        base36Timestamp: function(str){
            if(str!=='') {
                return str;
            }else{
                var d = new Date();
                var coNum = d.getMilliseconds() +
                    (d.getSeconds()*1000) +
                    (d.getMinutes()*1000*60) +
                    (d.getHours()*1000*60*60) +
                    ((Math.ceil((d - new Date(d.getFullYear(),0,1)) / 86400000))*1000*60*60*24) +
                    (d.getFullYear()*1000*60*60*24*365);
                return coNum.toString(36).toUpperCase();
            }
        },
        unixTime: function(str){
            var now = new Date;
            if (str) {
                if (str === (parseInt(str) + '')) {
                    now = new Date(parseInt(str));
                } else {
                    now = new Date(str);
                }
                if (now == 'Invalid Date'){
                    now = new Date;
                }
            }
            return (now).getTime();
        },
        unixTimeBlank: function(str){
            var now = new Date;
            
            if(str==='' || str===null || str==="null" || !str) return "";
            if (str) {
                if (str === (parseInt(str) + '')) {
                    now = new Date(parseInt(str));
                } else {
                    now = new Date(str);
                }
                if (now == 'Invalid Date'){
                    now = new Date;
                }
            }
            return (now).getTime();
        },
        timeInMilliseconds: function(str){
            var int = self.$sanitize.toInt(str);
            if(int<0 && int>86400000){
                int = 0;
            }
            return int
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