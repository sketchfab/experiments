'use strict';

var SketchfabGifAnimations = require('./libs/animations');
//var Sketchfab = window.Sketchfab;

var FPS = 15;
var DELAY = 1 / FPS;

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function SketchfabGif(urlid, options) {
    this.urlid = urlid;
    this.id = 'skfb2gif' + (+new Date());
    this.images = [];
    this.events = {};
    this.progressValue = 0;

    var duration = options.duration || 5;
    this.options = {
        width: options.width || 320,
        height: options.height || 240,
        duration: duration,
        steps: duration * FPS,
    };

    if (options.callback && isFunction(options.callback)) {
        this.clbk = options.callback;
    }
}

SketchfabGif.prototype.start = function() {
    var document = window.document;
    this.iframe = document.createElement('iframe');
    this.iframe.id = this.id;
    this.iframe.style.opacity = 0;
    this.iframe.style.position = 'absolute';
    this.iframe.style.pointerEvents = 'none';
    document.body.appendChild(this.iframe);

    this.initialize(this.iframe, this.urlid);
}

SketchfabGif.prototype.cleanup = function() {
    document.body.removeChild(this.iframe);
};

SketchfabGif.prototype.on = function(name, handler) {
    this.events[name] = handler;
};

SketchfabGif.prototype.progress = function(value, message) {
    if (value >= this.progressValue) {
        this.progressValue = value;
        // console.info(value, message);
        if (this.events['progress'] && isFunction(this.events['progress'])) {
            this.events['progress'].call(window, {
                progress: value,
                data: message
            });
        }
    }
};

SketchfabGif.prototype.initialize = function(iframe, urlid) {
    var version = '1.0.0';
    var client = new Sketchfab(version, iframe);
    var self = this;

    client.init(urlid, {
        preload: 1,
        camera: 0,
        // overrideDevicePixelRatio: 1,
        success: function(api) {
            api.start(function() {
                api.addEventListener('viewerready', function() {
                    setTimeout(function() {
                        self.progress(1, 'Ready');
                        self.capture(api, self.options.steps, function() {
                            api.stop();
                            self.buildGif();
                        });
                    }, 1000);
                });
            });
        },
        error: function() {}
    });
};

SketchfabGif.prototype.capture = function(api, nb, callback) {

    var self = this;

    function _capture(i) {

        var start = 1;
        var end = 90;
        var range = end - start;
        var current = Math.floor((self.options.steps - i) * range / self.options.steps);
        self.progress(current, 'Frame ' + (self.options.steps - i) + '/' + self.options.steps);

        if (i === -1) {
            if (callback) {
                callback.call(self);
            }
            return;
        }

        api.getCameraLookAt(function(err, camera) {

            // Camera animation is given by custom function
            var newCamera = SketchfabGifAnimations.turntable( camera, nb - i, nb);

            api.lookat(
                newCamera.position,
                newCamera.target,
                0
            );
            setTimeout(function() {
                api.getScreenShot(self.options.height * (self.options.width / self.options.height), self.options.width * (self.options.width / self.options.height), 'image/png', function(err, result) {
                    if (err) {
                        return;
                    }
                    var image = new Image();
                    image.src = result;
                    self.images.push(image);
                });
                setTimeout(function(){
                    _capture(i - 1);
                }, 100);
            }, 30);

        });
    }

    _capture(nb);

};

SketchfabGif.prototype.buildGif = function() {
    var self = this;
    this.progress(99, 'Encoding ' + this.images.length + ' frames');
    var gif = new GIF({
        workers: 2,
        quality: 5,
        width: this.images[this.images.length - 1].width,
        height: this.images[this.images.length - 1].height
    });
    for (var j = 0; j < this.images.length; j++) {
        gif.addFrame(this.images[j], {
            delay: DELAY
        });
    }
    gif.on('finished', function(blob) {

        self.progress(100, blob);

        self.cleanup();

        if (self.clbk && isFunction(self.clbk)) {
            self.clbk.call(window);
        }
    });
    gif.render();
};

module.exports = SketchfabGif;
