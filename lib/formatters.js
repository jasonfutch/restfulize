/*restful formatters*/
var dateFormat = require('dateformat');

module.exports = function restfulFormatters(tables, req, res, errorHandler){
    var self = this;
    var $sanitize = require('validator');
    this.onError = function(status, code, msg){ return errorHandler.error(status, code, msg) };

    this.$init = function(){};



    this.$init(); //initializer

    var formatters = {
        json: function(str){
            return JSON.parse(str);
        },
        boolean: function(str){
            str = (str+'').toLowerCase();
            var bol = false;
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1') bol = true;
            return bol;
        },
        date: function(str){
            if(str===null && typeof str==='undefined') str='';
            str = $sanitize.trim(str);
            if(str!=='') str = Date.parse(str);
            return str;
        },
        float: function(str){
            return parseFloat(str);
        },
        lowercase: function(str){
            return (str+'').toLowerCase();
        },
        uppercase: function(str){
            return (str+'').toUpperCase();
        },
        booleanToBoolean: function(str){
            str = (str+'').toLowerCase();
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1' || str===true){
                return true;
            }else{
                return false;
            }
        },
        booleanToNumeric: function(str){
            str = (str+'').toLowerCase();
            if(str==='t' || str==='true' || str==='y' || str==='yes' || str==='on' || str==='1'){
                return 1;
            }else{
                return 0;
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
        },
        dateTime: function(str){
            return dateTime(str)
        }
    };

    formatters.$processFormatters = function(field, value, ary){
        //console.log('$processFormatters');
        var lngFormatters = ary.length;
        for(var i=0;i<lngFormatters;i++){
            var formatter = ary[i];
            //console.log(field +' - '+formatter+': '+value);
            if(typeof formatters[formatter]!=='undefined'){
                value = formatters[formatter](value);
            }else{
                self.onError(400,100,'Formatter:'+formatter+' could not be found.',field);
            }
        }
        return value;
    };

    return formatters;
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
};