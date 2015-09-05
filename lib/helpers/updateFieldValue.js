module.exports = function(field,value,obj){
    var bolFound = false;
    var lngDataFields = obj.fields.length;
    for(var x=0;x<lngDataFields;x++){
        if(obj.fields[x].alias===field){
            obj.fields[x].value = value;
            bolFound = true;
            break;
        }
    }
    return bolFound;
};