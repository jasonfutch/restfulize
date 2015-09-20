module.exports = function(placement,type,sqlObj,obj){
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
    if(typeof obj._pretransaction==='undefined') obj._pretransaction = [];
    switch(placement.toLowerCase()){
        case 'pre':
            obj._pretransaction.push({type:type,data:sqlObj});
            break;
        case 'post':
            obj._transaction.push({type:type,data:sqlObj});
            break;
        default:
            console.error('pushTransaction: unknown placement')
    }

    return true;
};