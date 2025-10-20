// Modern class-based API and Storage
export class Api {
  static ready(fn) {
    fn();
  }
}

export class Storage {
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
export var api = Api;
export var storage = Storage;
