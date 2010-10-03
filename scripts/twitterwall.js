(function() {
  var TwitterWall, root;
  var __bind = function(func, context) {
    return function(){ return func.apply(context, arguments); };
  }, __hasProp = Object.prototype.hasOwnProperty;
  root = (typeof exports !== "undefined" && exports !== null) ? exports : this;
  TwitterWall = function(elem, options) {
    this.container = document.getElementById(elem);
    this.itemDelay = (typeof options === "undefined" || options == undefined ? undefined : options.itemDelay) || 5000;
    this.emptyDelay = (typeof options === "undefined" || options == undefined ? undefined : options.emptyDelay) || 60000;
    this.twitterqueue = new root.DelayedQueue().onitem(this.itemDelay, (__bind(function(tweet) {
      return this.displayTweet(tweet);
    }, this))).onempty(this.emptyDelay, (__bind(function() {
      return this.run();
    }, this)));
    return this;
  };
  TwitterWall.prototype.timeline = function(name, options) {
    this.timelineName = name;
    this.timelineOptions = options;
    return this;
  };
  TwitterWall.prototype.list = function(name, options) {
    this.listName = name;
    this.listOptions = options;
    return this;
  };
  TwitterWall.prototype.search = function(terms, options) {
    this.searchTerms = terms;
    this.searchOptions = options;
    return this;
  };
  TwitterWall.prototype.run = function() {
    var callback;
    callback = (__bind(function(tweets, options) {
      return this.enqueueTweets(tweets, options);
    }, this));
    if (this.timelineName) {
      twitterlib.timeline(this.timelineName, this.timelineOptions, callback);
    }
    if (this.listName) {
      twitterlib.list(this.listName, this.listOptions, callback);
    }
    if (this.searchTerms) {
      twitterlib.search(this.searchTerms, this.searchOptions, callback);
    }
    return this;
  };
  TwitterWall.prototype.enqueueTweets = function(tweets, options) {
    return tweets.length > 0 ? this.twitterqueue.push(tweets) : null;
  };
  TwitterWall.prototype.displayTweet = function(tweet) {
    return this.container.insertBefore(this.createTweet(tweet), this.container.firstChild);
  };
  TwitterWall.prototype.createTweet = function(tweet) {
    var date, date_full, date_iso, date_rel, text, user_id, user_image, user_name, uuid;
    uuid = tweet.id;
    text = twitterlib.ify.clean(tweet.text);
    date = tweet.created_at;
    date_full = twitterlib.time.datetime(date);
    date_iso = twitterlib.time.iso8601(date);
    date_rel = twitterlib.time.relative(date);
    user_id = tweet.user.screen_name;
    user_name = tweet.user.name || user_id;
    user_image = tweet.user.profile_image_url;
    return this.createElement({
      "tagName": "li",
      "childNodes": [
        {
          "tagName": "div",
          "className": "status",
          "childNodes": [
            {
              "tagName": "div",
              "className": "author",
              "childNodes": [
                {
                  "tagName": "a",
                  "className": "url",
                  "href": ("http://twitter.com/" + (user_id)),
                  "title": ("" + (user_name)),
                  "cssText": ("background-image: url(\"" + (user_image) + "\");")
                }
              ]
            }, {
              "tagName": "div",
              "className": "data",
              "childNodes": [
                {
                  "tagName": "div",
                  "className": "meta",
                  "childNodes": [
                    {
                      "tagName": "a",
                      "className": "name",
                      "href": ("http://twitter.com/" + (user_id)),
                      "title": ("" + (user_name)),
                      "textContent": ("" + (user_id))
                    }, {
                      "tagName": "a",
                      "className": "time",
                      "rel": "bookmark",
                      "href": ("http://twitter.com/" + (user_id) + "/status/" + (uuid)),
                      "title": ("" + (date_full)),
                      "childNodes": [
                        {
                          "tagName": "time",
                          "className": "published",
                          "datetime": ("" + (date_iso)),
                          "textContent": ("" + (date_rel))
                        }
                      ]
                    }
                  ]
                }, {
                  "tagName": "div",
                  "className": "content",
                  "innerHTML": ("" + (text))
                }
              ]
            }
          ]
        }
      ]
    });
  };
  TwitterWall.prototype.createElement = function(template) {
    var _a, _b, _c, _d, attrib, childTemplate, elem, value;
    elem = document.createElement(template.tagName);
    delete template.tagName;
    _a = template;
    for (attrib in _a) {
      if (!__hasProp.call(_a, attrib)) continue;
      value = _a[attrib];
      if (attrib === 'childNodes') {
        _c = value;
        for (_b = 0, _d = _c.length; _b < _d; _b++) {
          childTemplate = _c[_b];
          elem.appendChild(this.createElement(childTemplate));
        }
      } else if (attrib === 'cssText') {
        elem.style.cssText = value;
      } else {
        elem[attrib] = value;
      }
    }
    return elem;
  };
  root.TwitterWall = TwitterWall;
})();
