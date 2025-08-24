
var api = (function () {
  var onReady = [];

  var api = {};

  api.ready = function (fn) {
    //onReady.push(fn);
    fn();
  };

  function finished() {
    for (var i = 0; i < onReady.length; i++) {
      onReady[i]();
    }
  }

  return api;
})();



var storage = (function () {
  var storage = {};

  storage.load = function (id, callback) {
    callback({
      data: localStorage.getItem(id),
    });
  };

  storage.save = function (id, data, callback) {
    localStorage.setItem(id, data);
    callback &&
      callback({
        data: data,
      });
  };

  return storage;
})();

