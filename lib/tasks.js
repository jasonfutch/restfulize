var $errors = require('./errors');
var $restfulList = require('./list');
var $restfulGet = require('./get');
var $restfulInsert = require('./insert');
var $restfulUpdate = require('./update');
var $extend = require('extend');
var $sql = require('./postgres');
var _ = require('underscore');

module.exports = function restfulMap(req,res){
    var self = this;

    this.$init = function(){

    };

    var objRead = {
        type: "get",
        overwrites: {
            _section: ""
        },
        defaults: {},
        onBeginList: undefined,
        onBeginRead: undefined,
        onComplete: undefined
    };

    this.read = function(tables,maps,func){
        if(!func) func = function(resp){ res.send(resp) };

        var obj = $extend(true, {}, objRead);

        var runTaskSet = function(map,f) {
            var task, lngMap = map.length;

            //make sure datamap has tasks
            if (lngMap === 0) return false;

            if (self.$validateMap(map, 'read') == false) return false;

            var currentID = 0;
            var mainObj = {};
            var runTask = function (json) {
                if (!json) json = {};

                if (currentID === lngMap) {
                    f(json);
                    return false;
                }

                var cMap = map[currentID];

                /*No current way to populate section name if an array*/
//                if(_.isArray(cMap)){
//                    runTaskSet(cMap,function(subJson){
//                        (json.data!==undefined) ? json.data[task.overwrites._section] = subJson : json[task.overwrites._section] = subJson;
//                        currentID++;
//                        runTask(json);
//                    });
//                    return true;
//                }else {
                    task = $extend(true, $extend(true, {}, obj), cMap);
                    if (task.onBeginList !== undefined && task.type==='list') {
                        task = $extend(true, task, task.onBeginList(json));
                    }
                    if (task.onBeginRead !== undefined && task.type==='get') {
                        task = $extend(true, task, task.onBeginRead(json));
                    }
                    var onComplete = task.onComplete;
                    if (onComplete === undefined) onComplete = function (resp, o) {
                        return resp;
                    };
                    task.toComplete = function (resp, o) {
                        if (currentID === 0) {
                            mainObj = o;
                            json = onComplete(resp, o)
                        } else {
                            (json.data!==undefined) ? json.data[task.overwrites._section] = onComplete(resp, o) : json[task.overwrites._section] = onComplete(resp, o);
                        }
                        currentID++;
                        runTask(json);
                    };
                    self.$action(tables, task, 'read');
                    return true;
//                }
            };
            runTask();
        };
        runTaskSet(maps,func);

        return true;
    };

    this.write = function(tables,maps,func){
        if(!func) func = function(obj){
            var arySQL = [];
            var lngObj = obj.length;
            for(var i=0;i<lngObj;i++){
                arySQL.push(obj[i].sql);
            }
            //res.send(arySQL);

            $sql.connect().then(function(connection){
                connection.transaction(arySQL).then(function() {
                    connection.release();
                    response = {
                        "status":"success"
                    };
                    res.send(response);
                },function(err){
                    console.log(err)
                });

            },function(err){
                res.send(err);
            });
        };

        var writes = [];

        var sharedObj = {};

        var obj = {
            type: "insert",
            insertBlankIfEmpty: false,
            requireIfEmpty: false,
            multiple: false,
            shared:[],
            overwrites: {
                _section: ""
            },
            defaults: {},
            onBeginMultiple: undefined,
            onBeginCreate: undefined,
            onBeginUpdate: undefined,
            onBeginDelete: undefined,
            onComplete: undefined
        };

        var runTaskSet = function(map,f) {
            var extTask, lngMap = map.length;

            //make sure datamap has tasks
            if (lngMap === 0) return false;

            if (self.$validateMap(map, 'write') == false) return false;

            var currentID = 0;
            var mainObj = {};
            var runTask = function (sharedObj) {
                if (!sharedObj) sharedObj = {};
                if (currentID === lngMap) {
                    f(writes);
                    return false;
                }

                var runTaskAction = function(task,callback) {
                    if(!callback) callback = function(){
                        currentID++;
                        runTask(sharedObj);
                    };
                    if (task.onBeginCreate !== undefined && task.type==='insert') {
                        task = $extend(true, task, task.onBeginCreate(sharedObj));
                    }
                    if (task.onBeginUpdate !== undefined && task.type==='update') {
                        task = $extend(true, task, task.onBeginUpdate(sharedObj));
                    }
                    if (task.onBeginDelete !== undefined && task.type==='delete') {
                        task = $extend(true, task, task.onBeginDelete(sharedObj));
                    }
                    var onComplete = task.onComplete;
                    if (onComplete === undefined) onComplete = function (sql, o, sObj) {
                        return {sql: sql, obj: o, sharedObj: sObj}
                    };
                    task.toComplete = function (sql, o) {
                        var lngShared = task.shared.length;
                        for(var i=0;i<lngShared;i++){
                            var sharedItem = task.shared[i];
                            if(o.body[sharedItem]!==undefined) sharedObj[sharedItem] = o.body[sharedItem];
                        }
                        var resp = onComplete(sql, o, sharedObj);
                        sharedObj = resp.sharedObj;
                        writes.push({sql: resp.sql, obj: resp.obj});
                        callback();
                    };
                    self.$action(tables, task, 'write');
                };

                var extTask = $extend(true, $extend(true, {}, obj), map[currentID]);
                if(extTask.multiple) {

                    var multipleFunction = function(){
                        var section = extTask.overwrites._section;
                        var arySection = [];
                        if(section!==''){
                            if(req.body[section]!==undefined){
                                if(_.isArray(req.body[section])) arySection = req.body[section];
                            }
                        }else{
                            if(_.isArray(req.body)) arySection = req.body;
                        }

                        var lngSection = arySection.length;
                        if(lngSection===0){
                            if(extTask.insertBlankIfEmpty){
                                extTask.body = {};
                                runTaskAction(extTask);
                            }else {
                                if(extTask.requireIfEmpty){

                                }else{
                                    currentID++;
                                    runTask(sharedObj);
                                }
                            }
                        }else{
                            var sectionCurrentID = -1;
                            var multipleRepeat = function(){
                                sectionCurrentID++;
                                if(lngSection===sectionCurrentID){
                                    currentID++;
                                    runTask(sharedObj);
                                }else{
                                    var tempTask = $extend(true, {}, extTask);
                                    tempTask.body = arySection[sectionCurrentID];
                                    runTaskAction(tempTask,multipleRepeat);
                                }
                            };
                            multipleRepeat();
                        }
                    };

                    if(extTask.type==='update' || extTask.type==='crud' || extTask.type==='delete'){
                        /**
                         * PULL ORIGINAL LIST TO COMPARE AGAINST
                         */
                        var objMultipleRead = $extend(true, {}, objRead);
                        var task = $extend(true, $extend(true, {}, objMultipleRead), task.onBeginList(json));
                        task.type = 'list';
                        task.toComplete = function (resp, o) {
                            if (currentID === 0) {
                                mainObj = o;
                                json = onComplete(resp, o)
                            } else {
                                (json.data!==undefined) ? json.data[task.overwrites._section] = onComplete(resp, o) : json[task.overwrites._section] = onComplete(resp, o);
                            }
                            currentID++;
                            multipleFunction();
                        };
                        self.$action(tables, task, 'read');
                    }else{
                        multipleFunction();
                    }
                }else{
                    runTaskAction(extTask);
                }
                return true;
            };
            runTask(sharedObj);
        };
        runTaskSet(maps,func);

        return true;
    };

    this.$validateMap = function(map,type){
        var lngMap = map.length;
        if(self.$validateSectionLead(map,type)==false) return false;
        for(var i=0;i<lngMap;i++){
            var task = map[i];
            if(task.isArray){
                if(self.$validateMap(task)==false) return false;
            }
        }
        return true;
    };

    this.$validateSectionLead = function(map,type){
        if(!type) type = 'read';

        //get first task;
        var task = map[0];

        //make sure for item is not an array
//        if(task.isArray){
//            console.warn('first task on data map and sub maps can not be an array');
//            return false;
//        }

//        //first task must be get if it has sub sections
//        if((task.type).toLowerCase()!=='get' && type==='read'){
//            console.warn('first task on data map must be a type:GET when it has sub sections');
//            return false;
//        }
        return true;
    };

    this.$action = function(tables,task,type){
        if(type==='read') {
            switch ((task.type).toLowerCase()) {
                case 'get':
                    var restfulGet = new $restfulGet(req, res);
                    restfulGet.build(tables, task, task.toComplete);
                    break;
                case 'list':
                    var restfulList = new $restfulList(req, res);
                    restfulList.build(tables, task, task.toComplete);
                    break;
            }
        }else{
            switch ((task.type).toLowerCase()) {
                case 'insert':
                    var restfulInsert = new $restfulInsert(req, res);
                    restfulInsert.build(tables, task, {transaction:true}, task.toComplete);
                    break;
                case 'update':
                    var restfulUpdate = new $restfulUpdate(req, res);
                    restfulUpdate.build(tables, task, {transaction:true}, task.toComplete);
                    break;
            }
        }
    };


    this.$init();
};

