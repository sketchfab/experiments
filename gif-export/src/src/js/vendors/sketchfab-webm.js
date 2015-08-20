'use strict';

var SketchfabGifAnimations = require('./sketchfab-gif/libs/animations');
var SketchfabGif = require('./sketchfab-gif/sketchfab-gif');
var _ = require('underscore');

var FPS = 15;

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

var SketchfabWebm = function() {
    SketchfabGif.apply(this, arguments);
}

SketchfabWebm.prototype = Object.create(SketchfabGif.prototype);

SketchfabWebm.prototype.capture = function(api, nb, callback) {

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
            var newCamera = SketchfabGifAnimations.turntable(camera, nb - i, nb);

            api.lookat(
                newCamera.position,
                newCamera.target,
                0
            );
            setTimeout(function() {
                api.getScreenShot(self.options.height * (self.options.width / self.options.height), self.options.width * (self.options.width / self.options.height), 'image/webp', function(err, result) {
                    if (err) {
                        return;
                    }
                    self.images.push(result);
                });
                setTimeout(function() {
                    _capture(i - 1);
                }, 100);
            }, 30);

        });
    }

    _capture(nb);

};

SketchfabWebm.prototype.buildGif = function() {
    this.progress(99, 'Encoding ' + this.images.length + ' frames');
    var encoder = new window.Whammy.Video(FPS);
    for (var j = 0; j < this.images.length; j++) {
        encoder.add(this.images[j]);
    }
    var output = encoder.compile();
    this.progress(100, output);
    this.cleanup();

    if (this.clbk && isFunction(this.clbk)) {
        this.clbk.call(window);
    }
};

module.exports = SketchfabWebm;
