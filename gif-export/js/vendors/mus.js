/*!
 * Mus.js v1.0.1
 * (c) 2018 Mauricio Giordano <giordano@inevent.us> - InEvent
 * Released under the MIT License.
 */
(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined'
        ? (module.exports = factory())
        : typeof define === 'function' && define.amd
        ? define(factory)
        : (global.Mus = factory());
})(this, function() {
    'use strict';

    // Mus default cursor icon based on OSx default cursor
    var cursorIcon =
        'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCSB2aWV3Qm94PSIwIDAgMjggMjgiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI4IDI4IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cG9seWdvbiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjguMiwyMC45IDguMiw0LjkgMTkuOCwxNi41IDEzLDE2LjUgMTIuNiwxNi42ICIvPjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iMTcuMywyMS42IDEzLjcsMjMuMSA5LDEyIDEyLjcsMTAuNSAiLz48cmVjdCB4PSIxMi41IiB5PSIxMy42IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjkyMjEgLTAuMzg3MSAwLjM4NzEgMC45MjIxIC01Ljc2MDUgNi41OTA5KSIgd2lkdGg9IjIiIGhlaWdodD0iOCIvPjxwb2x5Z29uIHBvaW50cz0iOS4yLDcuMyA5LjIsMTguNSAxMi4yLDE1LjYgMTIuNiwxNS41IDE3LjQsMTUuNSAiLz48L3N2Zz4=';

    /**
     * Mus constructor that defines initial variables and
     * sets browser width and height.
     * @knownbug: if user decides to change browser window size on-the-go
     * 		it may cause bugs during playback
     */
    function Mus(target, showCursor) {
        if (this === undefined) {
            console.error(
                'Have you initialized Mus with "new" statement? (i.e. var mus = new Mus())'
            );
            return;
        }
        this.showCursor = showCursor;
        this.iframe = target;
        this.frames = [];
        this.timeouts = [];
        this.pos = 0;
        this.currPos = 0;
        this.startedAt = 0;
        this.finishedAt = 0;
        this.recording = false;
        this.playing = false;
        this.playbackSpeed = this.speed.NORMAL;
        this.window = {
            width: window.outerWidth,
            height: window.outerHeight
        };

        // Stores initial listeners
        this.onmousemove = window.onmousemove;
        this.onmousedown = window.onmousedown;
        this.onmouseup = window.onmouseup;
        this.onscroll = window.onscroll;
    }

    /**
     * Here goes all Mus magic
     */
    Mus.prototype = {
        /** Mus Listeners **/

        /**
         * Listener intended to be used with onmousemove
         * @param callback function a callback fnc
         * @return function the mouse move listener
         */
        moveListener: function(callback) {
            return function(e) {
                if (callback) callback(['m', e.clientX, e.clientY, window.performance.now(), e]);
                if (this.target) this.iframe.dispatchEvent(e);
            }.bind(this);
        },

        /**
         * Listener intended to be used with onmousedown
         * @param callback function a callback fnc
         * @return function the mouse click listener
         */
        mouseDownListener: function(callback) {
            return function(e) {
                if (callback) callback(['md', e.clientX, e.clientY, window.performance.now(), e]);
                if (this.target) this.iframe.dispatchEvent(e);
            }.bind(this);
        },

        mouseUpListener: function(callback) {
            return function(e) {
                if (callback) callback(['mu', e.clientX, e.clientY, window.performance.now(), e]);
                if (this.target) this.iframe.dispatchEvent(e);
            }.bind(this);
        },

        /**
         * Listener intended to be used with onscroll
         * @param callback function a callback fnc
         * @return function the window scroll listener
         */
        scrollListener: function(callback) {
            return function(e) {
                if (callback)
                    callback([
                        's',
                        document.scrollingElement.scrollLeft,
                        document.scrollingElement.scrollTop,
                        window.performance.now(),
                        e
                    ]);
                if (this.target) this.iframe.dispatchEvent(e);
            }.bind(this);
        },

        /** Mus recording tools **/

        /**
         * Starts screen recording
         */
        record: function(onFrame) {
            if (this.recording) return;

            var self = this;
            if (self.startedAt == 0) self.startedAt = window.performance.now() / 1000;

            // Sets initial scroll position of the window
            self.frames.push([
                's',
                document.scrollingElement.scrollLeft,
                document.scrollingElement.scrollTop
            ]);

            // Defines Mus listeners on window
            window.onmousemove = this.moveListener(function(pos) {
                self.frames.push(pos);
                if (onFrame instanceof Function) onFrame();
            });
            window.onmousedown = this.mouseDownListener(function(click) {
                self.frames.push(click);
                if (onFrame instanceof Function) onFrame();
            });
            window.onmouseup = this.mouseUpListener(function(click) {
                self.frames.push(click);
                if (onFrame instanceof Function) onFrame();
            });
            window.onscroll = this.scrollListener(function(scroll) {
                self.frames.push(scroll);
                if (onFrame instanceof Function) onFrame();
            });

            // Sets our recording flag
            self.recording = true;
        },

        /**
         * Stops screen recording
         */
        stop: function() {
            this.finishedAt = window.performance.now() / 1000;
            window.onmousemove = this.onmousemove;
            window.onmousedown = this.onmousedown;
            window.onmouseup = this.onmouseup;
            window.onscroll = this.onscroll;

            // Sets our recording flag
            this.timeouts = [];
            this.recording = false;
            this.playing = false;
            this.pos = 0;
        },

        /**
         * Pauses current execution
         */
        pause: function() {
            if (this.playing) {
                this.pos = this.currPos;
                this.playing = false;
                this.clearTimeouts();
            }
        },

        /**
         * Runs a playback of a recording
         * @param function onfinish a callback function
         */
        play: function(onfinish, targetIframe, bbox) {
            if (this.playing) return;

            if (this.showCursor) {
                this.createCursor();
                var node = document.getElementById('musCursor');
            }
            for (; this.pos < this.frames.length; this.pos++) {
                this.timeouts.push(
                    setTimeout(
                        function(pos) {
                            // Plays specific timeout
                            if (this.showCursor) {
                                this.playFrame(this, this.frames[pos], node);
                                this.currPos = pos;
                            } else {
                                this.target.dispatchEvent(this.frames[pos].e);
                            }
                            if (pos == this.frames.length - 1) {
                                if (node) node.style.backgroundColor = 'transparent';
                                this.timeouts = [];
                                this.playing = false;
                                this.pos = 0;
                                if (onfinish) onfinish();
                            }
                        }.bind(this),
                        this.pos * this.playbackSpeed,
                        this.pos
                    )
                );
            }

            this.playing = true;
        },

        /**
         * Releases Mus instance
         */
        release: function() {
            this.frames = [];
            this.startedAt = 0;
            this.finishedAt = 0;
            this.stop();
            this.destroyCursor();
            this.destroyClickSnapshot();
        },

        /** Mus internal functions **/

        /**
         * Play a specific frame from playback
         *
         */
        playFrame: function(self, frame, node) {
            if (frame[0] == 'm') {
                node.style.left = self.getXCoordinate(frame[1]) + 'px';
                node.style.top = self.getYCoordinate(frame[2]) + 'px';
            } else if (frame[0] == 'md') {
                self.createMouseDownSnapshot(frame[2], frame[1]);
            } else if (frame[0] == 'mu') {
                self.createMouseUpSnapshot(frame[2], frame[1]);
            } else if (frame[0] == 's') {
                window.scrollTo(frame[1], frame[2]);
            }
        },

        /**
         * Clears all timeouts stored
         */
        clearTimeouts: function() {
            for (var i in this.timeouts) {
                clearTimeout(this.timeouts[i]);
            }

            this.timeouts = [];
        },

        /**
         * Calculates time elapsed during recording
         * @return integer time elapsed
         */
        timeElapsed: function() {
            return this.finishedAt - this.startedAt;
        },

        /**
         * Creates Mus cursor if non-existent
         */
        createCursor: function() {
            if (!document.getElementById('musCursor')) {
                var node = document.createElement('div');
                node.id = 'musCursor';
                node.style.position = 'fixed';
                node.style.width = '32px';
                node.style.height = '32px';
                node.style.top = '-100%';
                node.style.left = '-100%';
                node.style.borderRadius = '32px';
                node.style.backgroundImage = 'url(' + cursorIcon + ')';
                document.body.appendChild(node);
            }
        },

        /**
         * Destroys Mus cursor
         */
        destroyCursor: function() {
            var cursor = document.getElementById('musCursor');
            if (cursor) cursor.remove();
        },

        /**
         * Creates Mus click snapshot
         */
        createMouseDownSnapshot: function(x, y) {
            var left = document.scrollingElement.scrollLeft;
            var top = document.scrollingElement.scrollTop;
            var node = document.createElement('div');
            node.className = 'musClickSnapshot';
            node.style.position = 'absolute';
            node.style.width = '32px';
            node.style.height = '32px';
            node.style.top = x + top + 'px';
            node.style.left = y + left + 'px';
            node.style.borderRadius = '32px';
            node.style.backgroundColor = 'red';
            node.style.opacity = 0.2;
            document.body.appendChild(node);
        },
        /**
         * Creates Mus click snapshot
         */
        createMouseUpSnapshot: function(x, y) {
            var left = document.scrollingElement.scrollLeft;
            var top = document.scrollingElement.scrollTop;
            var node = document.createElement('div');
            node.className = 'musClickSnapshot';
            node.style.position = 'absolute';
            node.style.width = '32px';
            node.style.height = '32px';
            node.style.top = x + top + 'px';
            node.style.left = y + left + 'px';
            node.style.borderRadius = '32px';
            node.style.backgroundColor = 'red';
            node.style.opacity = 0.2;
            document.body.appendChild(node);
        },

        /**
         * Destroys Mus click snapshot
         */
        destroyClickSnapshot: function() {
            var nodes = document.getElementsByClassName('musClickSnapshot');
            while (nodes.length > 0) {
                nodes[0].remove();
            }
        },

        /**
         * Calculates current X coordinate of mouse based on window dimensions provided
         * @param x integer the x position
         * @return integer calculated x position
         */
        getXCoordinate: function(x) {
            if (window.outerWidth > this.window.width) {
                return parseInt((this.window.width * x) / window.outerWidth);
            }

            return parseInt((window.outerWidth * x) / this.window.width);
        },

        /**
         * Calculates current Y coordinate of mouse based on window dimensions provided
         * @param y integer the y position
         * @return integer calculated y position
         */
        getYCoordinate: function(y) {
            if (window.outerHeight > this.window.height) {
                return parseInt((this.window.height * y) / window.outerHeight);
            }

            return parseInt((window.outerHeight * y) / this.window.height);
        },

        /** Public getters and setters **/

        /**
         * Get all generated Mus data
         * @return array generated Mus data
         */
        getData: function() {
            return {
                frames: this.frames,
                timeElapsed: this.timeElapsed(),
                window: {
                    width: window.outerWidth,
                    height: window.outerHeight
                }
            };
        },

        /**
         * Sets generated Mus data for playback
         * @param data array generated Mus data
         */
        setData: function(data) {
            if (data.frames) this.frames = data.frames;
            if (data.window) this.window = data.window;
        },

        /**
         * Sets recorded frames for playback
         * @param frames array the frames array
         */
        setFrames: function(frames) {
            this.frames = frames;
        },

        /**
         * Sets custom window size for playback
         * @param width integer window width
         * @param height integer window height
         */
        setWindowSize: function(width, height) {
            this.window.width = width;
            this.window.height = height;
        },

        /**
         * Sets a playback speed based on Mus speed set
         * @param speed integer the playback speed
         */
        setPlaybackSpeed: function(speed) {
            this.playbackSpeed = speed;
        },

        /**
         * Informs if Mus is currently recording
         * @return boolean is recording?
         */
        isRecording: function() {
            return this.recording;
        },

        /**
         * Informs if Mus is currently playing
         * @return boolean is playing?
         */
        isPlaying: function() {
            return this.playing;
        },

        /** Mus speed constants **/

        speed: {
            SLOW: 35,
            NORMAL: 15,
            FAST: 5
        }
    };

    return Mus;
});
