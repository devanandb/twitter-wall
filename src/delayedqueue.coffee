################################################################################
#
# Queue that consumes itself.
#
# Based on the code for the Full Frontal JavaScript Conference Twitter Wall by
# Remy Sharp (http://2009.full-frontal.org/screen/).
#
################################################################################

root = exports ? this

################################################################################

class DelayedQueue

  constructor: ->
    @itemCallback  = null
    @itemDelay     = 0
    @emptyCallback = null
    @emptyDelay    = 0

    @queue     = []
    @processed = {}
    @timer     = null

  onitem: (delay, callback) ->
    @itemCallback = callback
    @itemDelay = delay

    return this

  onempty: (delay, callback) ->
    @emptyCallback = callback
    @emptyDelay = delay

    return this

  process: ->
    # if there are any items left in the queue
    if @queue.length isnt 0
      # notify the item callback
      @itemCallback(@queue.shift())
    # if there aren't
    else
      # stop processing
      @stop()
      # and notify the empty callback
      window.setTimeout((() => @emptyCallback()), @emptyDelay)

    return this

  push: (items) ->
    # start processing when somebody pushes, unless we have been stopped with
    # items still left in the queue
    @start() if not @timer? && @queue.length is 0

    items = [items] if not items instanceof Array

    # push the items into the queue
    for item in items
      @queue.push(item) if not @processed[item.id]
      @processed[item.id] = true

    # and sort the queue
    @queue.sort(((a, b) ->
      return a.id - b.id
    ))

    return this

  start: ->
    # start the timer if it hasn't been already
    @timer = window.setInterval((() => @process()), @itemDelay) if not @timer?

    return this

  stop: ->
    # stop the timer
    window.clearInterval(@timer)
    @timer = null

    return this

################################################################################

# export DelayedQueue
root.DelayedQueue = DelayedQueue

