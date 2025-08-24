// Modern class-based API and Storage
class Api {
  static ready(fn) {
    fn();
  }
}

class Storage {
  static load(id, callback) {
    callback({
      data: localStorage.getItem(id),
    });
  }

  static save(id, data, callback) {
    localStorage.setItem(id, data);
    callback &&
      callback({
        data: data,
      });
  }
}

// Backward compatibility
var api = Api;
var storage = Storage;
