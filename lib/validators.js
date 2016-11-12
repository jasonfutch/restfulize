var _ = require('underscore');

/*restful validators*/
module.exports = function restfulValidators(tables, req, res, errorHandler){
    var self = this;
    this.onError = function(status, code, msg, field){ return errorHandler.error(status, code, msg, field) };
    this.$sanitize = require('validator');

    this.$init = function(){

    };

    this.$init(); //initializer

    var validators = {
        min: {
            define: function(min){
                return {min:min};
            },
            validate: function(field,str,min){
                if(str.length>=parseInt(min)){
                    return true;
                }else{
                    return self.onError(400,100, 'Minimum length is '+min+'.',field);
                }
            }
        },
        max: {
            define: function(max){
                return {max:max};
            },
            validate: function(field,str,max){
                if(str.length<=parseInt(max)){
                    return true;
                }else{
                    return self.onError(400,100, 'Maximum length is '+max+'.',field);
                }
            }
        },
        timeInMilliseconds: {
            define: function(){
                return {};
            },
            validate: function(field,str){
                var int = self.$sanitize.toInt(str);
                if(int<0 && int>86400000){
                    return self.onError(400,100, 'Invalid time must be a value between 0 and 86400000.',field);
                }else{
                    return true;
                }
            }
        },
        numeric: {
            pattern:{
                regex: /^\d+$/,
                message: "Invalid number format."
            },
            define: function(){
                var pattern = $patternToString(validators.numeric.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.numeric.pattern.message
                };
            },
            validate: function(field,str){
                var reg = validators.numeric.pattern.regex;
                if(reg.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.numeric.pattern.message, field);
                }
            }
        },
        float:{
            pattern:{
                regex: /^[-+]?[0-9]*\.?[0-9]+$/,
                message: "Invalid decimal number."
            },
            define: function(){
                var pattern = $patternToString(validators.float.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.float.pattern.message
                };
            },
            validate: function(field,str){
                var reg = validators.float.pattern.regex;
                if(reg.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.float.pattern.message, field);
                }
            }
        },
        percentage:{
            pattern:{
                regex: /^(([0]{1}(\.\d{1,10})?)|([0-1]{1}(\.[0]{1,10})?))$/,
                message: "Invalid percentage, must be decimal value <= 1 >= 0."
            },
            define: function(){
                var pattern = $patternToString(validators.percentage.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.percentage.pattern.message
                };
            },
            validate: function(field,str){
                var reg = validators.percentage.pattern.regex;
                if(reg.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.percentage.pattern.message, field);
                }
            }
        },
        length: {
            define: function(lng){
                return {
                    max: lng,
                    min: lng
                };
            },
            validate: function(field,str,lng,type){
                if(!type) type = "characters";
                if(str.length==parseInt(lng)){
                    return true;
                }else{
                    return self.onError(400,100, 'Must be exactly '+lng+' '+type+'.',field);
                }
            }
        },
        password:{
            pattern:{
                /*
                * contains at least 8 characters
                * contain at least 1 number
                * contain at least 1 lowercase character (a-z)
                * contain at least 1 uppercase character (A-Z)
                * contains only characters a-zA-Z0-9!@#$%^&*
                * */
                regex: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/,
                message: "Invalid password format. Must be at least 8 characters long and contain at least one number, one lowercase letter and one uppercase letter."
            },
            define: function(){
                var pattern = $patternToString(validators.password.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.password.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return self.onError(400,100,validators.password.pattern.message,field);
                var re = validators.password.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.password.pattern.message,field);
                }
            }
        },
        email: {
            pattern:{
                regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                message: "Invalid email format."
            },
            define: function(){
                var pattern = $patternToString(validators.email.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.email.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return true;
                var re = validators.email.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.email.pattern.message,field);
                }
            }
        },
        url:{
            pattern:{
                regex: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
                message: "Invalid URL format."
            },
            define: function(){
                var pattern = $patternToString(validators.url.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.url.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return true;
                var re = validators.url.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.url.pattern.message,field);
                }
            }
        },
        uuid: {
            pattern:{
                regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
                message: "Invalid UUID format."
            },
            define: function(){
                var pattern = $patternToString(validators.uuid.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.uuid.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return true;
                var re = validators.uuid.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.uuid.pattern.message,field);
                }
            }
        },
        refKey: {
            pattern:{
                regex: /^[a-f0-9]{32}$/i,
                message: "Invalid refKey format."
            },
            define: function(){
                var pattern = $patternToString(validators.refKey.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.refKey.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return true;
                var re = validators.refKey.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.refKey.pattern.message,field);
                }
            }
        },
        hexcode: {
            pattern:{
                regex: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i,
                    message: "Invalid Hexadecimal Color format.. valid format examples: #FFF, #FFOOO, #fff or #ff0000."
            },
            define: function(){
                var pattern = $patternToString(validators.hexcode.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.hexcode.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return true;
                var re = validators.hexcode.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.hexcode.pattern.message,field);
                }
            }
        },
        key: {
            pattern:{
                regex: /^[a-zA-Z0-9_]+$/i,
                message: "Invalid character format, may only contain characters a-z 0-9 _."
            },
            define: function(){
                var pattern = $patternToString(validators.key.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.key.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return true;
                var re = validators.key.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.key.pattern.message,field);
                }
            }
        },
        cssClass: {
            pattern:{
                regex: /^[a-z0-9_-]+$/i,
                message: "Invalid character format, may only contain characters a-z 0-9 _ -."
            },
            define: function(){
                var pattern = $patternToString(validators.cssClass.pattern.regex);
                return {
                    pattern: pattern,
                    patternErrorMessage: validators.cssClass.pattern.message
                };
            },
            validate: function(field,str){
                if(str==="") return true;
                var re = validators.cssClass.pattern.regex;
                if(re.test(str)){
                    return true;
                }else{
                    return self.onError(400,100,validators.cssClass.pattern.message,field);
                }
            }
        },
        date: {
            define: function(){
                return {};
            },
            validate: function(field,str){
                if(str==="") return true;

                /*check for numeric date*/
                if(str === (parseInt(str) + '')) {
                    now = new Date(parseInt(str));
                } else {
                    now = new Date(str);
                }

                if (now == 'Invalid Date'){
                    return self.onError(400,100, 'Must be a valid/parsable date format.',field);
                }else{
                    return true
                }

            }
        },
        jsonb: {
            define: function(){
                return {};
            },
            validate: function(field,obj){
                if(_.isObject(obj)===false){
                    return self.onError(400,100, 'Must be a valid JSON object.',field);
                }else{
                    return true
                }
            }
        },
        array: {
            define: function(){
                return {};
            },
            validate: function(field,ary){
                if(_.isArray(ary)===false){
                    return self.onError(400,100, 'Must be a valid an Array.',field);
                }else{
                    return true
                }
            }
        }
    };

    var $patternToString = function(reg){
        var pattern = (reg).toString();
        return pattern.substring(1,pattern.length-1);
    };

    return validators;
};