module.exports = function(str,data){
    var strParse = "";
    var aryString = (str).split(/({{|}})/).filter(function(x){ return x; });

    var lngaryString = aryString.length;
    var bolActiveTag = false;
    for(var i=0;i<lngaryString;i++){
        var item = aryString[i];
        switch(item){
            case '{{':
                bolActiveTag = true;
                break;
            case '}}':
                bolActiveTag = false;
                break;
            default:
                if(bolActiveTag){
                    if(typeof data[item]!=='undefined'){
                        strParse += data[item];
                    }else{
                        strParse += item;
                    }
                }else{
                    strParse += item;
                }
        }
    }
    return strParse;
};