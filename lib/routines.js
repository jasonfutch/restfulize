var $restfulize = require('../index');
var $q = require('q');
var $async = require('async');
var $uuid = require('node-uuid');
var $extend = require('extend');

/*restful routines*/
module.exports = function restfulRoutines(tables, req, res, errorHandler){
    var self = this;
    this.onError = function(status, code, msg, field, obj){ return errorHandler.error(status, code, msg, field, obj) };

    this.consolidateRoutines = {};
    this.routines = {};
    this.beforeRaw = [];
    this.raw = [];
    this.afterRaw = [];
    this.beforeActions = [];
    this.fieldAction = [];
    this.initialActions = [];
    this.actions = [];
    this.afterActions = [];
    this.complete = [];
    this.core = {
        tables:tables,
        req:req,
        res:res,
        errorHandler:errorHandler
    };


    this.stageDefinintion = {
        "onBeforeRaw":"beforeRaw",
        "onRaw":"raw",
        "onAfterRaw":"afterRaw",
        "onBeforeActions":"beforeActions",
        "onFieldAction":"fieldAction",
        "onInitialActions":"initialActions",
        "onActions":"actions",
        "onAfterActions":"afterActions",
        "onComplete":"complete"
    };

    this.$init = function(){
        self.routineDefinitions = $restfulize.routineDefinitions;
        //self.routineDefinitions = $extend(true, {}, $restfulize.routineDefinitions);
    };

    this.$init(); //initializer

    this.initializeRoutines = function(routines,column){
        var deferred = $q.defer();
        $async.eachSeries(routines, function(requestedRoutine,callback) {
                if(typeof self.routineDefinitions[requestedRoutine.routine] !== 'undefined'){
                    try{
                        var routineId, routine;

                        //check if routine within already added consolidated routines
                        //console.log('initializeRoutines routine: '+requestedRoutine.routine);
                        if(typeof self.consolidateRoutines[requestedRoutine.routine] === 'undefined'){
                            routineId = $uuid.v1();
                            self.routines[routineId] = new self.routineDefinitions[requestedRoutine.routine](req, res);

                            if(self.routines[routineId].consolidate===true){
                                self.consolidateRoutines[requestedRoutine.routine] = routineId;
                            }

                            routine = self.routines[routineId];
                            for(var key in routine){
                                //console.log('initializeRoutines routine - process - '+key+': '+requestedRoutine.routine);
                                if(routine.hasOwnProperty(key)){
                                    switch(key){
                                        case 'onBeforeRaw':
                                            self.beforeRaw.push(routineId);
                                            break;
                                        case 'onRaw':
                                            self.raw.push(routineId);
                                            break;
                                        case 'onAfterRaw':
                                            self.afterRaw.push(routineId);
                                            break;
                                        case 'onBeforeActions':
                                            self.beforeActions.push(routineId);
                                            break;
                                        case 'onFieldAction':
                                            self.fieldAction.push(routineId);
                                            break;
                                        case 'onInitialActions':
                                            self.initialActions.push(routineId);
                                            break;
                                        case 'onActions':
                                            self.actions.push(routineId);
                                            break;
                                        case 'onAfterActions':
                                            self.afterActions.push(routineId);
                                            break;
                                        case 'onComplete':
                                            self.complete.push(routineId);
                                            break;
                                    }
                                }
                            }
                        }else{
                            routineId = self.consolidateRoutines[requestedRoutine.routine];
                            routine = self.routines[routineId];
                        }

                        routine.onInit(requestedRoutine.properties,column,self.core).then(function(){
                            callback();
                        });
                    }catch(e){
                        console.error(err);
                    }
                }else{
                    console.log('routine not found: '+requestedRoutine.routine);
                    callback();
                }
            },
            function(err){
                deferred.resolve();
            }
        );
        return deferred.promise;
    };

    this.runRoutines = function(stage,objBuild,obj,field){
        var deferred = $q.defer();
        $async.eachSeries(self[self.stageDefinintion[stage]], function(routineId,callback) {
            self.routines[routineId][stage](objBuild,obj,field).then(function(){
                callback();
            },function(){
                callback(true);
            });
        },
        function(err){
            if(err) deferred.reject();
            deferred.resolve();
        });
        return deferred.promise;
    };

    return {
        initialize: function(objBuild, obj){
            var deferred = $q.defer();

            //initialize field level routines
            $async.eachSeries(obj.columns, function(column,callback) {
                self.initializeRoutines(column.actions.routines,column).then(function(){
                    callback();
                })
            },function(err){

                //initialize service level routines
                self.initializeRoutines(obj._routines).then(function(){
                    deferred.resolve();
                })
            });

            return deferred.promise;
        },
        onBeforeRaw: function(objBuild, obj){
            return self.runRoutines('onBeforeRaw',objBuild,obj);
        },
        onRaw: function(objBuild, obj){
            return self.runRoutines('onRaw',objBuild,obj);
        },
        onAfterRaw: function(objBuild, obj){
            return self.runRoutines('onAfterRaw',objBuild,obj);
        },
        onBeforeActions: function(objBuild, obj){
            return self.runRoutines('onBeforeActions',objBuild,obj);
        },
        onFieldAction: function(objBuild, obj, field){
            return self.runRoutines('onFieldAction',objBuild,obj,field);
        },
        onInitialActions: function(objBuild, obj){
            return self.runRoutines('onInitialActions',objBuild,obj);
        },
        onActions: function(objBuild, obj){
            return self.runRoutines('onActions',objBuild,obj);
        },
        onAfterActions: function(objBuild, obj){
            return self.runRoutines('onAfterActions',objBuild,obj);
        },
        onComplete: function(objBuild, obj){
            return self.runRoutines('onComplete',objBuild,obj);
        }
    };
};