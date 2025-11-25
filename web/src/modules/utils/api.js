// This appears to have been a polyfill after I migrated from clay.io

export const SUPABASE_URL = "https://vatpvuolfdnkcgdwgsxm.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdHB2dW9sZmRua2NnZHdnc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTc3OTMsImV4cCI6MjA3OTE5Mzc5M30.XEJsuWMrWzo1l2otg36z9uZ1Vm3BbItfnhb0r-Ne1NA";

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
