module.exports = function(field,value,table,obj){
    if(typeof obj.fields==='undefined') obj.fields = [];
    obj.fields.push({
        alias: field,
        as:field,
        field: table.fields[field].field,
        value: value
    });
    return true;
};