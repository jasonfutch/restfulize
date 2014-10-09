var $errors = require('./errors');
var $restfulList = require('./list');
var $restfulGet = require('./get');
var $extend = require('extend');

module.exports = function restfulMap(req,res){
    var self = this;

    this.$init = function(){

    };

    this.build = function(tables,map,func){
        if(!func) func = function(resp){ res.send(resp) };

        var obj = {
            type:"get",
            overwrites:{
                _section:""
            },
            defaults:{},
            onBegin: undefined,
            onComplete: undefined
        };

        var task, lngMap = map.length;

        //make sure datamap has tasks
        if(lngMap===0) return false;

        if(self.$validateMap(map)==false) return false;

        var currentID = 0;
        var mainObj = {};
        var runTask = function(json){
            if(!json) json = {};
            if(currentID===lngMap){
                func(json);
                return false;
            }
            task = $extend(true,$extend(true,{},obj),map[currentID]);
            if(task.onBegin!==undefined){
                task = $extend(true,task,task.onBegin(json));
            }
            var onComplete = task.onComplete;
            if(onComplete===undefined) onComplete = function(resp,o){ return resp; };
            task.toComplete = function(resp,o){
                if(currentID===0){
                    mainObj = o;
                    json = onComplete(resp,o)
                }else{
                    if(json.data!==undefined){
                        json.data[task.overwrites._section] = onComplete(resp,o);
                    }else{
                        json[task.overwrites._section] = onComplete(resp,o);
                    }
                }
                currentID++;
                runTask(json);
            };
            self.$action(tables,task);
            return true;
        };
        runTask();

        return true;
    };

    this.$validateMap = function(map){
        var lngMap = map.length;
        if(self.$validateSectionLead(map)==false) return false;
        for(var i=0;i<lngMap;i++){
            var task = map[i];
            if(task.isArray){
                if(self.$validateMap(task)==false) return false;
            }
        }
        return true;
    };

    this.$validateSectionLead = function(map){
        //get first task;
        var task = map[0];

        //make sure for item is not an array
        if(task.isArray){
            console.log('first task on data map and sub maps can not be an array');
            return false;
        }

        //first task must be get if it has sub sections
        if((task.type).toLowerCase()!=='get'){
            console.log('first task on data map must be a type:GET when it has sub sections');
            return false;
        }
        return true;
    };

    this.$action = function(tables,task){
        switch((task.type).toLowerCase()){
            case 'get':
                var restfulGet = new $restfulGet(req,res);
                restfulGet.build(tables,task,task.toComplete);
                break;
            case 'list':
                var restfulList = new $restfulList(req,res);
                restfulList.build(tables,task,task.toComplete);
                break;
        }
    };


    this.$init();
};

