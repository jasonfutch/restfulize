module.exports = function restfulErrors(req,res){
    var self = this;
    this._errors = [];
    this._req = req;
    this._res = res

    this.$init = function(){};

    this.error = function(status,code,msg,field){
//        console.log('log error');
        if(!status) status = 400;
        if(!code) code = 215;
        if(!msg) msg = "unknown error";
        if(!field) field = undefined;
        var error = {status:status,code:code,message:msg,field:field};
        self._errors.push(error);
        return false;
    };

    this.hasErrors = function(){
        return (self._errors.length>0);
    };

    this.clear = function(){
        self._errrors = [];
    };

    this.response = function(){
        if(self._errors.length===0) self.error(200,1,'unknown response');
        self._res.statusCode = self._errors[0].status;

        var lngErrors = self._errors.length;
        for(var i=0;i<lngErrors;i++){
            delete self._errors[i].status;
        }
        var errors = {errors:self._errors};
        self._res.json(errors);
        self.clear();
        return false;
    };

    this.$init();
};
