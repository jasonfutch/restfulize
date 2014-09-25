/*restful formatters*/
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
            if(str==='true' || str==='yes' || str==='1') bol = true;
            return bol;
        },
        date: function(str){
            if(str===null && str===undefined) str='';
            str = $sanitize.trim(str);
            if(str!=='') str = Date.parse(str);
            return str;
        },
        lowercase: function(str){
            return (str+'').toLowerCase();
        },
        uppercase: function(str){
            return (str+'').toUpperCase();
        }
    };

    formatters.$processFormatters = function(field, value, ary){
        var lngFormatters = ary.length;
        for(var i=0;i<lngFormatters;i++){
            var formatter = ary[i];
            if(formatters[formatter]!==undefined){
                value = formatters[formatter](value);
            }else{
                self.onError(400,100,'Formatter:'+formatter+' could not be found.',field);
            }
        }
        return value;
    };

    return formatters;
};