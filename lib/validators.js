
/*restful validators*/
module.exports = function restfulValidators(tables, req, res, errorHandler){
    var self = this;
    this.onError = function(status, code, msg, field){ return errorHandler.error(status, code, msg, field) };

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
                message: "Invalid password format."
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
        }
    };

    var $patternToString = function(reg){
        var pattern = (reg).toString();
        return pattern.substring(1,pattern.length-1);
    };

    return validators;
};