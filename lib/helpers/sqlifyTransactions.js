var $restfulSqlString = require('./../sql-string');

module.exports = function(type,obj,arySQL){
    var restfulSqlString = new $restfulSqlString();

    var placement;
    switch(type.toLowerCase()){
        case 'pre':
            placement = '_pretransaction';
            break;
        case 'post':
            placement = '_transaction';
            break;
        default:
            console.error('pushTransaction: unknown placement');
            return arySQL
    }

    var lngTransaction = obj[placement].length;
    if(obj[placement].length>0){
        for(var i=0;i<lngTransaction;i++){
            var transaction = obj[placement][i];
            switch(transaction.type){
                case 'insert':
                    arySQL.push(restfulSqlString.insert(transaction.data));
                    break;
                case 'update':
                    arySQL.push(restfulSqlString.update(transaction.data));
                    break;
                case 'delete':
                    arySQL.push(restfulSqlString.delete(transaction.data));
                    break;
            }
        }
    }

    return arySQL;
};