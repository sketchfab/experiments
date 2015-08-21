'use strict';

var Animations = require('./libs/animations');
var Sketchfab = window.Sketchfab;

var FPS = 15;
var DELAY = 1 / FPS;

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function ImageSequence(urlid, options) {
    this.urlid = urlid;
    this.id = 'skfb2gif' + (+new Date());
    this.images = [];
    this.events = {};
    this.progressValue = 0;

    var duration = options.duration || 5;
    var format = options.format || 'image/png';

    this.options = {
        width: options.width || 320,
        height: options.height || 240,
        duration: duration,
        steps: duration * FPS,
        format: format
    };

    if (options.callback && isFunction(options.callback)) {
        this.clbk = options.callback;
    }
}

ImageSequence.prototype.start = function start() {
    var document = window.document;
    this.iframe = document.createElement('iframe');
    this.iframe.id = this.id;
    this.iframe.style.opacity = 0;
    this.iframe.style.position = 'absolute';
    this.iframe.style.top = '0px';
    this.iframe.style.pointerEvents = 'none';
    this.iframe.width = this.options.width;
    this.iframe.height = this.options.height;
    document.body.appendChild(this.iframe);

    this.initialize(this.iframe, this.urlid);
};

ImageSequence.prototype.cleanup = function cleanup() {
    var document = window.document;
    document.body.removeChild(this.iframe);
};

ImageSequence.prototype.on = function on(name, handler) {
    this.events[name] = handler;
};

ImageSequence.prototype.progress = function progress(value, message) {
    if (value >= this.progressValue) {
        this.progressValue = value;
        if (this.events.progress && isFunction(this.events.progress)) {
            this.events.progress.call(window, {
                progress: value,
                data: message
            });
        }
    }
};

ImageSequence.prototype.initialize = function initialize(iframe, urlid) {
    var version = '1.0.0';
    var client = new Sketchfab(version, iframe);
    var self = this;

    client.init(urlid, {
        preload: 1,
        camera: 0,
        overrideDevicePixelRatio: 1,
        success: function(api) {
            api.start(function() {
                api.addEventListener('viewerready', function() {
                    setTimeout(function() {
                        self.progress(1, 'Ready');
                        self.capture(api, self.options.steps, function() {
                            api.stop();
                            self.progress(100, 'Finished');
                            self.cleanup();

                            if (self.clbk && isFunction(self.clbk)) {
                                self.clbk.call(window, this.images);
                            }
                        });
                    }, 1000);
                });
            });
        },
        error: function() {}
    });
};

ImageSequence.prototype.capture = function capture(api, nb, callback) {

    var self = this;

    function _capture(i) {

        var start = 1;
        var end = 90;
        var range = end - start;
        var current = Math.floor((self.options.steps - i) * range / self.options.steps);
        self.progress(current, 'Frame ' + (self.options.steps - i) + '/' + self.options.steps);

        // End of recursion
        if (i === -1) {
            if (callback) {
                callback.call(self);
            }
            return;
        }

        api.getCameraLookAt(function(err, camera) {

            // Camera animation is given by custom function
            var newCamera = Animations.turntable(camera, nb - i, nb);

            api.lookat(
                newCamera.position,
                newCamera.target,
                0
            );

            // Callback of lookat seems to act weird. Using setTimeout instead.
            setTimeout(function onLookAtFinished() {
                var w = self.options.height * (self.options.width / self.options.height);
                var h = self.options.width * (self.options.width / self.options.height);
                api.getScreenShot(w, h, self.options.format, function(err, b64image) {
                    if (err) {
                        return;
                    }
                    self.images.push(b64image);
                    _capture(i - 1);
                });
            }, 50);
        });
    }

    _capture(nb);

};

module.exports = ImageSequence;
