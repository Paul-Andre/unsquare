
class Api {
  constructor() {
    this.onReady = [];
  }

  /**
   * Executes a function when the API is ready
   * @param {Function} fn - The function to execute
   */
  ready(fn) {
    // this.onReady.push(fn);
    fn();
  }

  /**
   * Executes all ready callbacks
   * @private
   */
  _finished() {
    for (let i = 0; i < this.onReady.length; i++) {
      this.onReady[i]();
    }
  }
}

class Storage {
  /**
   * Loads data from localStorage
   * @param {string} id - The key to load from
   * @param {Function} callback - Callback function with loaded data
   */
  load(id, callback) {
    callback({
      data: localStorage.getItem(id),
    });
  }

  /**
   * Saves data to localStorage
   * @param {string} id - The key to save to
   * @param {any} data - The data to save
   * @param {Function} callback - Optional callback function
   */
  save(id, data, callback) {
    localStorage.setItem(id, data);
    callback &&
      callback({
        data: data,
      });
  }
}

// Create global instances for backward compatibility
const api = new Api();
const storage = new Storage();

