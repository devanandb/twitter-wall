// twitterlib.js (c) 2009 Remy Sharp
// Licensed under the terms of the MIT license.
(function (twitterlib, container) {
  var guid = +new Date,
      window = this,
      document = window.document,
      head = document.getElementsByTagName('head')[0],
      last = {}, // memorisation object for the next method
      outstanding = {}, // reference object to allow us to cancel JSONP calls (though nulling the return function)
      ENTITIES = {
        '&quot;': '"',
        '&lt;': '<',
        '&gt;': '>'
      },
      URLS = {
        search: 'http://search.twitter.com/search.json?q=%search%&page=%page|1%&rpp=%limit|100%&since_id=%since|remove%',
        timeline: 'http://twitter.com/statuses/user_timeline/%user%.json?count=%limit|200%&page=%page|1%&since_id=%since|remove%',
        list: 'http://api.twitter.com/1/%user%/lists/%list%/statuses.json?page=%page|1%&per_page=%limit|200%&since_id=%since|remove%',
        favs: 'http://twitter.com/favorites/%user%.json?page=%page|1%'
      },
      urls = URLS, // allows for resetting debugging
      undefined,
      caching = false;
  
  var ify = function() {
    return {
      entities: function (t) {
        return t.replace(/(&[a-z0-9]+;)/g, function (m) {
          return ENTITIES[m];
        });
      },
      link: function(t) {
        return t.replace(/[a-z]+:\/\/[a-z0-9-_]+\.[a-z0-9-_:~\+#%&\?\/.=]+[^:\.,\)\s*$]/ig, function(m) {
          return '<a href="' + m + '" rel="nofollow">' + ((m.length > 25) ? m.substr(0, 24) + '...' : m) + '</a>';
        });
      },
      at: function(t) {
        return t.replace(/(^|[^\w]+)\@([a-zA-Z0-9_]{1,15}(\/[a-zA-Z0-9-_]+)*)/g, function(m, m1, m2) {
          return m1 + '@<a href="http://twitter.com/' + m2 + '" rel="nofollow">' + m2 + '</a>';
        });
      },
      hash: function(t) {
        return t.replace(/(^|[^&\w'"]+)\#([a-zA-Z0-9_]+)/g, function(m, m1, m2) {
          return m1 + '<a href="http://search.twitter.com/search?q=%23' + m2 + '" rel="nofollow">#' + m2 + '</a>';
        });
      },
      clean: function(tweet) {
        return this.hash(this.at(this.link(tweet)));
      }
    };
  }();
  
  var time = function () {
    var monthDict = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      time: function (date) {
        var hour = date.getHours(),
            min = date.getMinutes() + "",
            ampm = 'AM';
    
        if (hour == 0) {
          hour = 12;
        } else if (hour == 12) {
          ampm = 'PM';
        } else if (hour > 12) {
          hour -= 12;
          ampm = 'PM';
        }
    
        if (min.length == 1) {
          min = '0' + min;
        }
    
        return hour + ':' + min + ' ' + ampm;
      },
      date: function (date) {
        var ds = date.toDateString().split(/ /),
            mon = monthDict[date.getMonth()],
            day = date.getDate()+'',
            dayi = ~~(day),
            year = date.getFullYear(),
            thisyear = (new Date()).getFullYear(),
            th = 'th';

        // anti-'th' - but don't do the 11th, 12th or 13th
        if ((dayi % 10) == 1 && day.substr(0, 1) != '1') {
          th = 'st';
        } else if ((dayi % 10) == 2 && day.substr(0, 1) != '1') {
          th = 'nd';
        } else if ((dayi % 10) == 3 && day.substr(0, 1) != '1') {
          th = 'rd';
        }

        if (day.substr(0, 1) == '0') {
          day = day.substr(1);
        }

        return mon + ' ' + day + th + (thisyear != year ? ', ' + year : '');
      },
      datetime: function (time_value) {
        var values = time_value.split(" "),
            date = new Date(Date.parse(values[1] + " " + values[2] + ", " + values[5] + " " + values[3] + " GMT"));

        return this.time(date) + ' ' + this.date(date);
      },
      iso8601: function (time_value) {
        var values = time_value.split(" "),
            date = new Date(Date.parse(values[1] + " " + values[2] + ", " + values[5] + " " + values[3] + " GMT"));

        function pad(n) { return n < 10 ? '0' + n : n }

        return date.getUTCFullYear()    + '-'
          + pad(date.getUTCMonth() + 1) + '-'
          + pad(date.getUTCDate())      + 'T'
          + pad(date.getUTCHours())     + ':'
          + pad(date.getUTCMinutes())   + ':'
          + pad(date.getUTCSeconds())   + 'Z';
      },
      relative: function (time_value) {
        var values = time_value.split(" "),
            date = new Date(Date.parse(values[1] + " " + values[2] + ", " + values[5] + " " + values[3] + " GMT")),
            relative_to = (arguments.length > 1) ? arguments[1] : new Date(),
            delta = ~~((relative_to.getTime() - date.getTime()) / 1000),
            r = '';

        if (delta < 5) {
          r = 'less than 5 seconds ago';
        } else if (delta < 30) {
          r = 'half a minute ago';
        } else if (delta < 60) {
          r = 'less than a minute ago';
        } else if (delta < 120) {
          r = '1 minute ago';
        } else if (delta < (45*60)) {
          r = (~~(delta / 60)).toString() + ' minutes ago';
        } else if (delta < (2*60*60)) {
          r = 'about 1 hour ago';
        } else if (delta < (24*60*60)) {
          r = 'about ' + (~~(delta / 3600)).toString() + ' hours ago';
        } else {
          r = this.time(date) + ' ' + this.date(date);
        }

        return r;
      }    
    };
  }();
  
  var filter = (function () {
    return {
      match: function (tweet, search, includeHighlighted) {
        var i = 0, s = '', text = tweet.text.toLowerCase();

        if (typeof search == "string") {
          search = this.format(search);
        }

        // loop ignore first
        if (search['not'].length) {
          for (i = 0; i < search['not'].length; i++) {
            if (text.indexOf(search['not'][i]) !== -1) {
              return false;
            }
          }

          if (!search['and'].length && !search['or'].length) {
            return true;
          }
        }

        if (search['and'].length) {
          for (i = 0; i < search['and'].length; i++) {
            s = search['and'][i];

            if (s.substr(0, 3) === 'to:') {
              if (!RegExp('^@' + s.substr(3)).test(text)) {
                return false;
              }
            } else if (s.substr(0, 5) == 'from:') {
              if (tweet.user.screen_name !== s.substr(5)) {
                return false;
              }
            } else if (text.indexOf(s) === -1) {
              return false;
            }
          }
        }

        if (search['or'].length) {
          for (i = 0; i < search['or'].length; i++) {
            s = search['or'][i];

            if (s.substr(0, 3) === 'to:') {
              if (RegExp('^@' + s.substr(3)).test(text)) {
                return true;
              }
            } else if (s.substr(0, 5) == 'from:') {
              if (tweet.user.screen_name === s.substr(5)) {
                return true;
              }
            } else if (text.indexOf(search['or'][i]) !== -1) {
              return true;
            }
          }
        } else if (search['and'].length) {
          return true;
        }

        return false;
      },

      format: function (search, caseSensitive) {
        // search can match search.twitter.com format
        var blocks = [], ors = [], ands = [], i = 0, negative = [], since = '', until = '';

        search.replace(/(-?["'](.*?)["']|\S+\b)/g, function (m) {
          var neg = false;
          if (m.substr(0, 1) == '-') {
            neg = true;
          }
          m = m.replace(/["']+|["']+$/g, '');
          
          if (neg) {
            negative.push(m.substr(1).toLowerCase()); 
          } else {
            blocks.push(m);            
          }
        });
        
        for (i = 0; i < blocks.length; i++) {
          if (blocks[i] == 'OR' && blocks[i+1]) {
            ors.push(blocks[i-1].toLowerCase());
            ors.push(blocks[i+1].toLowerCase());
            i++;
            ands.pop(); // remove the and test from the last loop
          } else {
            ands.push(blocks[i].toLowerCase());
          }
        }

        return {
          'or' : ors,
          'and' : ands,
          'not' : negative
        };

      },

      // tweets typeof Array
      matchTweets: function (tweets, search, includeHighlighted) {
        var updated = [], tmp, i = 0;

        if (typeof search == 'string') {
          search = this.format(search);
        }

        for (i = 0; i < tweets.length; i++) {
          if (this.match(tweets[i], search, includeHighlighted)) {
            updated.push(tweets[i]);
          }
        }

        return updated;
      }
    };
  })();
    
  // based on twitter.com list of tweets, most common format for tweets
  function render(tweet) {
    var html = '<li><div class="tweet">';
    html += '<div class="vcard"><a href="http://twitter.com/' + tweet.user.screen_name + '" class="url"><img style="height: 48px; width: 48px;" alt="' + tweet.user.name + '" class="photo fn" height="48" src="' + tweet.user.profile_image_url + '" width="48" /></a></div>';  
    html += '<div class="hentry"><strong><a href="http://twitter.com/';
    html += tweet.user.screen_name + '" ';
    html += 'title="' + tweet.user.name + '">' + tweet.user.screen_name + '</a></strong> ';
    html += '<span class="entry-content">';
    html += container[twitterlib].ify.clean(tweet.text);
    html += '</span> <span class="meta entry-meta"><a href="http://twitter.com/' + tweet.user.screen_name;
    html += '/status/' + tweet.id + '" class="entry-date" rel="bookmark"><span class="published" title="';
    html += tweet.created_at + '">' + container[twitterlib].time.datetime(tweet.created_at) + '</span></a>';
    if (tweet.source) html += ' <span>from ' + tweet.source + '</span>';
    html += '</span></div></div></li>';

    return html;
  }

  function clean(guid) {
    var el = document.getElementById(twitterlib + guid);
    if (el) {
      head.removeChild(document.getElementById(twitterlib + guid));
    }
    delete outstanding[twitterlib + guid];
    window[twitterlib + guid] = undefined; 
    try{ delete window[ twitterlib + guid ]; } catch(e){}
  }
    
  function load(url, options, callback) {
    var script = document.createElement('script'), match = null;
    if (options == undefined) options = {};
    guid++;
    
    outstanding[twitterlib + guid] = true;
    window[twitterlib + guid] = (function (guid, options) { // args are now private and static
      return function (tweets) {
        // remove original script include
        var i = 0, parts = [];
        
        if (tweets.results) {
          tweets = tweets.results;
          i = tweets.length;
          // fix the user prop to match "normal" API calls
          while (i--) {
            tweets[i].user = { id: tweets[i].from_user_id, screen_name: tweets[i].from_user, profile_image_url: tweets[i].profile_image_url };
            tweets[i].source = container[twitterlib].ify.entities(tweets[i].source);
            
            // fix created_at
            parts = tweets[i].created_at.split(' ');
            tweets[i].created_at = [parts[0],parts[2],parts[1],parts[4],parts[5], parts[3]].join(' ').replace(/,/, '');
          }
        } else if (tweets.length && tweets[0].sender) { // DM - we'll change it to look like a tweet
          i = tweets.length;
          while (i--) {
            tweets[i].user = tweets[i].sender;
            tweets[i].originalText = tweets[i].text;
            tweets[i].text = '@' + tweets[i].recipient_screen_name + ' ' + tweets[i].text;
          }
        }
        
        options.originalTweets = tweets;
        if (options.filter) {
          tweets = filter.matchTweets(tweets, options.filter);
        }
        
        if (caching && options.page > 1) {
          sessionStorage.setItem(twitterlib + '.page' + options.page, 'true');
          sessionStorage.setItem(twitterlib + '.page' + options.page + '.tweets', JSON.stringify(tweets));
          sessionStorage.setItem(twitterlib + '.page' + options.page + '.originalTweets', JSON.stringify(options.originalTweets));
        }
        
        options.cached = false;
        
        callback.call(container[twitterlib], tweets, options);
        // clean up
        clean(guid);
      };
    })(guid, options);
    
    match = url.match(/callback=(.*)/);
    if (match != null && match.length > 1) {
      window[match[1]] = window[twitterlib + guid];
    } else {
      url += '&callback=' + twitterlib + guid;
    }

    // all first requests go via live
    if (!caching || options.page <= 1 || (caching && sessionStorage.getItem(twitterlib + '.page' + options.page) == null)) {
      script.src = url;
      script.id = twitterlib + guid;
      head.appendChild(script);      
    } else if (caching) {
      clean(guid);
      options.cached = true;
      options.originalTweets = JSON.parse(sessionStorage.getItem(twitterlib + '.page' + options.page + '.originalTweets'));
      callback.call(container[twitterlib], JSON.parse(sessionStorage.getItem(twitterlib + '.page' + options.page + '.tweets')), options);
    } 
  }
  
  function getUrl(type, options) {
    return urls[type].replace(/(\b.*?)%(.*?)(\|.*?)?%/g, function (a, q, key, def) {
      // remove empty values that shouldn't be sent
      if (def && def.substr(1) == 'remove' && options[key] == undefined) {
        return '';
      }
      return q + (options[key] === undefined ? def.substr(1) : options[key]);
    });
  }
  
  function normaliseArgs(options, callback) {
    if (typeof options == 'function') {
      callback = options;
      options = {};
    }
    if (options === undefined) options = {};
    options.page = options.page || 1;
    options.callback = callback;
    if (options.limit === 0) {
      delete options.limit;
    }
    return options;
  }
  
  function setLast(method, arg, options) {
    last = { 
      method: method,
      arg: arg,
      options: options,
      callback: options.callback,
      page: options.page || 1
    };
    
    if (caching) {
      var last_request = JSON.parse(sessionStorage.getItem(twitterlib + '.last_request') || '{}');
      if (last.method != last_request.method || last.arg != last_request.arg) {
        clearCache();
        sessionStorage.setItem(twitterlib + '.last_request', JSON.stringify(last));
      } 
    }
  }
  
  function clearCache() {
    var i = sessionStorage.length;
    while (i--) {
      if (sessionStorage.key(i).substr(0, twitterlib.length) == twitterlib) {
        sessionStorage.removeItem(sessionStorage.key(i));
      }
    }
  }
  
  function custom(name, url, defaults) {
    if (url && urls[name] == undefined) urls[name] = url;
    if (this[name] == undefined) {
      this[name] = function (term, options, callback) {
        // handle "termless" custom methods
        if (typeof term == 'function') {
          callback = term;
          term = '';
        } else if (term.toString() == '[Object object]') {
          callback = options;
          options = term;
          term = '';
        }
        options = normaliseArgs(options, callback);
        setLast(name, term, options);
        // slight hack to support my own shortcuts
        options[name] = options.user = term; 
        options.search = encodeURIComponent(term);
        if (options.callback) load(getUrl(name, options), options, options.callback);
        return this;
      };
    }
    // makes my code nicer to read when setting up twitterlib object
    return this[name];
  }
  
  container[twitterlib] = {
    // search is an exception case
    custom: custom,
    status: function (user, options, callback) { // alias function
      options = normaliseArgs(options, callback);
      options.limit = 1;
      setLast('status', user, options); // setting after limit = 1 to keep this intact
      return this.timeline(user, options, options.callback);
    },
    list: function (list, options, callback) {
      var parts = list.split('/');
      options = normaliseArgs(options, callback);
      setLast('list', list, options);
      options.user = parts[0];
      options.list = parts[1];
      if (options.callback) load(getUrl('list', options), options, options.callback);
      return this;
    },
    next: function () {
      if (last.method) {
        last.page++;
        last.options.page = last.page;
        this[last.method](last.arg, last.options, last.callback);
      } // else we won't do anything
      return this;
    },
    
    // appending on pre-existing utilities
    time: time,
    ify: ify,
    filter: filter,
    cancel: function () {
      for (var k in outstanding) {
        window[k] = (function () { return function (guid) { clean(guid); };})(k.replace(twitterlib, ''));
      }
      outstanding = {};
      return this;
    },
    reset: function () {
      urls = URLS;
      last.method = '';
    },
    render: render,
    debug: function (data) {
      for (var url in data) {
        urls[url] = data[url];
      }
      return this;
    },
    cache: function (enabled) {
      caching = enabled == undefined ? true : enabled;
      
      // cache is only supported if you have native json encoding
      if (!window.JSON || !window.sessionStorage) {
        caching = false;
      }
    }
  };
  
  container[twitterlib].custom('search');
  container[twitterlib].custom('timeline');
  container[twitterlib].custom('favs');
})('twitterlib', this);