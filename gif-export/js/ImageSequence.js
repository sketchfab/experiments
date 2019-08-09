(function(window) {
    'use strict';

    var Animations;

    function ImageSequence(api, options, recordedData) {
        this.api = api;
        this.images = [];
        this.events = {};
        this.progressValue = 0;
        this.recordedData = recordedData;

        var fps = options.fps || 60;
        var duration = options.duration || 2;

        if (this.recordedData) {
            this.currentPosition = 0;
            duration = recordedData[recordedData.length - 8] / 1000.0;
        }

        this.options = {
            width: options.width || 1920,
            height: options.height || 1080,
            duration: duration,
            fps: fps,
            steps: Math.floor(duration * fps),
            format: options.format || 'mp4',
            isAnimated: !!options.isAnimated,
            asDataURI: options.asDataURI,
            frameCallback: options.frameCallback
        };

        if (options.modelInfo) {
            this.options.authorImg = new Image();
            this.options.authorImg.crossOrigin = 'Anonymous';
            this.options.authorImg.src =
                options.modelInfo.user.avatar.images[
                    options.modelInfo.user.avatar.images.length - 1
                ].url;
            this.options.name = options.modelInfo.name;
            this.options.authorName = options.modelInfo.user.displayName;
            // this.options.authorName = options.modelInfo.user.userName;
        }
        this.options.logoImg = options.logoImg;

        if (options.callback && isFunction(options.callback)) {
            this.clbk = options.callback;
        } else {
            this.clbk = null;
        }
    }

    ImageSequence.prototype.on = function on(name, handler) {
        if (name === 'progress') {
            this.events[name] = handler;
        }
    };

    ImageSequence.prototype.triggerProgress = function triggerProgress(value) {
        if (value >= this.progressValue) {
            this.progressValue = value;
            if (this.events.progress && isFunction(this.events.progress)) {
                this.events.progress.call(window, {
                    progress: value
                });
            }
        }
    };

    ImageSequence.prototype.start = function start() {
        if (this.recordedData) {
            this.currentPosition = 0; // restart from 0
        }

        console.log('Starting image sequence', this.options);
        this.capture(
            this.options.steps,
            function() {
                if (isFunction(this.clbk)) {
                    this.clbk.call(window, this.images);
                }
            }.bind(this)
        );
    };

    ImageSequence.prototype.capture = function capture(nbFrames, callback) {
        var api = this.api;
        var outputFormat = this.options.format;
        var width = this.options.width;
        var height = this.options.height;
        var isAnimated = this.options.isAnimated;

        var image = new Image();

        const canvas = document.createElement('canvas');
        canvas.height = height;
        canvas.width = width;
        const ctx = canvas.getContext('2d');
        // invert Y
        ctx.scale(1.0, -1.0);

        // scaled upon video size
        // all sized/tested on full hd
        var ratioH = height / 1080;
        var ratioW = width / 1920;
        var iconSize = 64 * ratioH;
        var fontSize = 24 * ratioH;
        var authorFont = fontSize + 'px serif';
        var modelFont = 'bold ' + fontSize + ' serif';

        // debug
        var eBody = document.getElementsByTagName('body')[0];
        eBody.insertBefore(canvas, eBody.firstChild);

        this._capture = function(frameIndex, initialCamera) {
            this.frameIndex = frameIndex;
            this.initialCamera = initialCamera;
            if (frameIndex === nbFrames) {
                this.triggerProgress(1.0);
                if (callback) {
                    callback.call(this);
                }
                return;
            }

            this.triggerProgress(frameIndex / nbFrames);

            if (this.recordedData) {
                var currentTime = (this.options.duration / nbFrames) * frameIndex;
                if (isAnimated) {
                    api.seekTo(currentTime);
                }
                this.currentPosition = playFrame(
                    this.api,
                    this.recordedData,
                    currentTime * 1000.0, // in ms
                    this.currentPosition
                );
            } else if (!isAnimated) {
                var newCamera = Animations.turntable(initialCamera, frameIndex, nbFrames);
                api.setCameraLookAt(newCamera.position, newCamera.target, 0);
            } else {
                var seekTime = (this.options.duration / nbFrames) * frameIndex;
                api.seekTo(seekTime);
            }

            api.getScreenShot(
                width,
                height,
                outputFormat,
                function(err, b64image) {
                    if (err) {
                        return;
                    }

                    image.src = b64image;
                    image.onload = function() {
                        // only if alpha?
                        ctx.clearRect(0, 0, width, height);

                        // rendered scene image
                        ctx.drawImage(image, 0, height * -1.0, width, height);

                        // author avatar
                        ctx.drawImage(
                            this.options.authorImg,
                            5,
                            height * -1.0 + 5,
                            iconSize,
                            iconSize
                        );

                        ctx.fillStyle = 'white';

                        // model Name
                        var wText = iconSize * 2.0 * ratioW;

                        ctx.font = modelFont;
                        ctx.fillText(this.options.name, wText, height * -1.0 + fontSize);

                        // author name
                        ctx.font = authorFont;
                        ctx.fillText(
                            this.options.authorName,
                            wText,
                            height * -1.0 + fontSize * 2.5
                        );

                        // logo
                        ctx.drawImage(
                            this.options.logoImg,
                            width - 5 * ratioW - iconSize,
                            height * -1.0 + height - 5 * ratioH - iconSize,
                            iconSize,
                            iconSize
                        );

                        let imageData = ctx.getImageData(0, 0, width, height);

                        if (this.options.frameCallback) {
                            this.options.frameCallback(imageData.data);
                            return;
                        }

                        if (this.options.format !== 'image/webp' && !this.options.asDataURI) {
                            var imageHTML = new Image();
                            imageHTML.src = b64image;
                            this.images.push(imageHTML);
                        } else {
                            this.images.push(b64image);
                        }

                        this._capture(frameIndex + 1, initialCamera);
                    }.bind(this);
                }.bind(this)
            );
        }.bind(this);

        api.getCameraLookAt(
            function(err, camera) {
                var initialCamera = camera;
                if (isAnimated) {
                    api.pause();
                    api.seekTo(0.0);
                }
                this._capture(0, initialCamera);
            }.bind(this)
        );
    };

    Animations = {
        still: function still(camera /*, i, total*/) {
            return camera;
        },

        turntable: function turntable(camera, i, total) {
            var inc = (2 * Math.PI) / total;
            var angle = inc * (i + 1);
            var distance = Math.sqrt(
                Math.pow(camera.target[0] - camera.position[0], 2) +
                    Math.pow(camera.target[1] - camera.position[1], 2)
            );
            var x = camera.target[0] + distance * Math.cos(angle);
            var y = camera.target[1] + distance * Math.sin(angle);

            return {
                position: [x, y, camera.position[2]],
                target: camera.target.slice()
            };
        }
    };

    function isFunction(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    }

    window['ImageSequence'] = ImageSequence;
})(window);
