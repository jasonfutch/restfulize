module.exports = function(type,sqlObj,obj){
    console.log('pushTransaction');
    switch(type){
        case 'update':
        case 'insert':
        case 'delete':
            break;
        default:
            console.error('helpers.pushTransaction: unrecognized type - '+type);
    }
    if(typeof obj._transaction==='undefined') obj._transaction = [];
    obj._transaction.push({type:type,data:sqlObj});
    return true;
};