// This is a legacy file from when I used clay.io to collect statistics about gameplay.
// Though getName might be useful
//
// Not deleting and just keeping dummy function if we'll ever try spying on players some time in the future.

var levelStats = function() {

  function getName(level) {

    return level.book.id + ": " + level.index

  }

  return {

    open: function(level) {

    },

    close: function(level) {

    },


    pass: function(level) {

    },

    getName: getName,
  }

}()