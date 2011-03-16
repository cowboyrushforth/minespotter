if (!Object.create) {
  Object.create = (function () {
    function F() {}
    return function (o) {
      F.prototype = o;
      return new F();
    };
  })();
}
if(!Object.keys) {
  Object.keys = function(o){
    var ret=[],p;
    for(p in o) {
      if(Object.prototype.hasOwnProperty.call(o,p)) {
        ret.push(p);
      }
    }
    return ret;
  };
}
dlog = function (txt) {
    if (window.console !== undefined) {
        console.log(txt);
    }
};
