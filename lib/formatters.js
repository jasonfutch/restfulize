/*restful formatters*/
var dateFormat = require('dateformat');
var $marked = require('marked');

module.exports = function restfulFormatters(tables, req, res, errorHandler){
    var self = this;
    var $sanitize = require('validator');
    this.onError = function(status, code, msg){ return errorHandler.error(status, code, msg) };

    this.$init = function(){

    };

    this.$init(); //initializer

    var formatters = {
        markdown: function(str){
            return $marked(str);
        },
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
            if(str!=='') str = Date.parse($sanitize.trim(str+''));
            if(isNaN(str)) str = '';
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
        dateTime: function(str,field,strict,bol){
            var now;
            if(!bol) bol = false;
            if(!strict) strict = false;
            if(str==='' && bol===false) return str;
            if (str) {
                switch(str){
                    case "today":
                        now = new Date();
                        now.setHours(0,0,0,0);
                        break;
                    case "today~":
                        now = new Date();
                        now.setHours(23,59,59,999);
                        break;
                    case "yesterday":
                        now = new Date();
                        now.setDate(now.getDate() - 1);
                        now.setHours(0,0,0,0);
                        break;
                    case "yesterday~":
                        now = new Date();
                        now.setDate(now.getDate() - 1);
                        now.setHours(23,59,59,999);
                        break;
                    default:
                        if (str === (parseInt(str) + '')) {
                            now = new Date(parseInt(str));
                        } else {
                            now = new Date(str);
                        }
                }

                if (now == 'Invalid Date'){
                    if(strict){
                        self.onError(400,100,'Invalid date found in search.',field);
                        now = new Date();
                    }else{
                        return str;
                    }
                }
            }else{
                now = new Date();
            }
            return dateFormat(now, "yyyy/mm/dd HH:MM:ss");
        }
    };

    formatters.$processFormatters = function(field, value, ary, strict){
        //console.log('$processFormatters');
        var lngFormatters = ary.length;
        for(var i=0;i<lngFormatters;i++){
            var formatter = ary[i];
            // console.log(field +' - '+formatter+': '+value);
            if(typeof formatters[formatter]!=='undefined'){
                value = formatters[formatter](value,field,strict);
            }else{
                self.onError(400,100,'Formatter:'+formatter+' could not be found.',field);
            }
        }
        return value;
    };

    return formatters;
};
