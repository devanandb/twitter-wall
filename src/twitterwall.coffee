################################################################################
#
# Twitter wall.
#
# Based on the code for the Full Frontal JavaScript Conference Twitter Wall by
# Remy Sharp (http://2009.full-frontal.org/screen/).
#
################################################################################

root = exports ? this

################################################################################

class TwitterWall

  constructor: (elem, options) ->
    @container = document.getElementById(elem)

    @itemDelay  = options?.itemDelay  or 5000
    @emptyDelay = options?.emptyDelay or 60000

    @twitterqueue = new root.DelayedQueue()
      .onitem(@itemDelay, ((tweet) => @displayTweet(tweet)))
      .onempty(@emptyDelay, (() => @run()))

  timeline: (name, options) ->
    @timelineName    = name
    @timelineOptions = options

    return this

  list: (name, options) ->
    @listName    = name
    @listOptions = options

    return this

  search: (terms, options) ->
    @searchTerms   = terms
    @searchOptions = options

    return this

  run: ->
    callback = ((tweets, options) => @enqueueTweets(tweets, options))
    twitterlib.timeline(@timelineName, @timelineOptions, callback) if @timelineName
    twitterlib.list(@listName, @listOptions, callback)             if @listName
    twitterlib.search(@searchTerms, @searchOptions, callback)      if @searchTerms

    return this

  enqueueTweets: (tweets, options) ->
    if tweets.length > 0
      @twitterqueue.push(tweets)

  displayTweet: (tweet) ->
    @container.insertBefore(@createTweet(tweet), @container.firstChild)

  createTweet: (tweet) ->
    uuid       = tweet.id
    text       = twitterlib.ify.clean(tweet.text)
    date       = tweet.created_at
    date_full  = twitterlib.time.datetime(date)
    date_iso   = twitterlib.time.iso8601(date)
    date_rel   = twitterlib.time.relative(date)
    user_id    = tweet.user.screen_name
    user_name  = tweet.user.name || user_id
    user_image = tweet.user.profile_image_url

    return @createElement({
      "tagName":     "li",
      "childNodes":  [{
        "tagName":      "div",
        "className":    "status",
        "childNodes":   [{
          "tagName":       "div",
          "className":     "author",
          "childNodes":    [{
            "tagName":        "a",
            "className":      "url",
            "href":           "http://twitter.com/#{user_id}",
            "title":          "#{user_name}",
            "cssText":        "background-image: url(\"#{user_image}\");"
          }]
        }, {
          "tagName":       "div",
          "className":     "data",
          "childNodes":    [{
            "tagName":        "div",
            "className":      "meta",
            "childNodes":     [{
              "tagName":         "a",
              "className":       "name",
              "href":            "http://twitter.com/#{user_id}",
              "title":           "#{user_name}",
              "textContent":     "#{user_id}"
            }, {
              "tagName":         "a",
              "className":       "time",
              "rel":             "bookmark",
              "href":            "http://twitter.com/#{user_id}/status/#{uuid}"
              "title":           "#{date_full}",
              "childNodes":      [{
                "tagName":          "time",
                "className":        "published"
                "datetime":         "#{date_iso}",
                "textContent":      "#{date_rel}"
              }]
            }]
          }, {
            "tagName":        "div",
            "className":      "content",
            "innerHTML":      "#{text}"
          }]
        }]
      }]
    })

  createElement: (template) ->
    elem = document.createElement(template.tagName)
    delete template.tagName

    for attrib, value of template
      switch attrib
        when 'childNodes'
          for childTemplate in value
            elem.appendChild(@createElement(childTemplate))
        when 'cssText'
          elem.style.cssText = value
        else
          elem[attrib] = value

    return elem

################################################################################

# export TwitterWall
root.TwitterWall = TwitterWall

