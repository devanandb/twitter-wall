(function() {
  var DelayedQueue, root;
  var __bind = function(func, context) {
    return function(){ return func.apply(context, arguments); };
  };
  root = (typeof exports !== "undefined" && exports !== null) ? exports : this;
  DelayedQueue = function() {
    this.itemCallback = null;
    this.itemDelay = 0;
    this.emptyCallback = null;
    this.emptyDelay = 0;
    this.queue = [];
    this.processed = {};
    this.timer = null;
    return this;
  };
  DelayedQueue.prototype.onitem = function(delay, callback) {
    this.itemCallback = callback;
    this.itemDelay = delay;
    return this;
  };
  DelayedQueue.prototype.onempty = function(delay, callback) {
    this.emptyCallback = callback;
    this.emptyDelay = delay;
    return this;
  };
  DelayedQueue.prototype.process = function() {
    if (this.queue.length !== 0) {
      this.itemCallback(this.queue.shift());
    } else {
      this.stop();
      window.setTimeout((__bind(function() {
        return this.emptyCallback();
      }, this)), this.emptyDelay);
    }
    return this;
  };
  DelayedQueue.prototype.push = function(items) {
    var _a, _b, _c, _d, item;
    if (!(typeof (_a = this.timer) !== "undefined" && _a !== null) && this.queue.length === 0) {
      this.start();
    }
    if (!items instanceof Array) {
      items = [items];
    }
    _c = items;
    for (_b = 0, _d = _c.length; _b < _d; _b++) {
      item = _c[_b];
      if (!this.processed[item.id]) {
        this.queue.push(item);
      }
      this.processed[item.id] = true;
    }
    this.queue.sort((function(a, b) {
      return a.id - b.id;
    }));
    return this;
  };
  DelayedQueue.prototype.start = function() {
    var _a;
    if (!(typeof (_a = this.timer) !== "undefined" && _a !== null)) {
      this.timer = window.setInterval((__bind(function() {
        return this.process();
      }, this)), this.itemDelay);
    }
    return this;
  };
  DelayedQueue.prototype.stop = function() {
    window.clearInterval(this.timer);
    this.timer = null;
    return this;
  };
  root.DelayedQueue = DelayedQueue;
})();
