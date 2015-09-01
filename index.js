var $actions                = require('./lib/actions');
var $dataTables             = require('./lib/data-tables');
var $errors                 = require('./lib/errors');
var $filters                = require('./lib/filters');
var $get                    = require('./lib/get');
var $insert                 = require('./lib/insert');
var $list                   = require('./lib/list');
var $tasks                  = require('./lib/tasks');
var $sql                    = require('./lib/postgres');
var $request                = require('./lib/request');
var $routines               = require('./lib/routines');
var $sqlString              = require('./lib/sql-string');
var $update                 = require('./lib/update');
var $validators             = require('./lib/validators');

exports.actions             = $actions;
exports.errors              = $errors;
exports.filters             = $filters;
exports.get                 = $get;
exports.insert              = $insert;
exports.list                = $list;
exports.tasks               = $tasks;
exports.sql                 = $sql;
exports.request             = $request;
exports.routines            = $routines;
exports.sqlString           = $sqlString;
exports.update              = $update;
exports.validators          = $validators;

exports.data                = {};
exports.dataObjects         = {};
exports.routineDefinitions  = {};

exports.loadData = function(dir){
    exports.data = $dataTables.load(dir);
    exports.dataObjects = $dataTables.dataObjects;
    exports.routineDefinitions = $dataTables.routineDefinitions;
};