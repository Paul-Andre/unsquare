// This appears to have been a polyfill after I migrated from clay.io

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
export let api = Api;
export let storage = Storage;
