'use strict';

var AppView = Backbone.View.extend({
    el: '.app',

    events: {
        'click #load-scene': 'onLoadSceneClick',
        'click #render-gif': 'onRenderClick',
        'click #record-mouse': 'onRecordMouse',
        'click #stop-record-mouse': 'onStopRecordMouse',
        'click .resolution-preset': 'onPresetClick'
    },

    initialize: function() {
        var version = '1.5.0';
        this.iframe = this.$el.find('#api-frame').get(0);
        this.client = new Sketchfab(version, this.iframe);
        this.FPS = 60;

        this.uid = null;
        this.modelInfo = null;
        this.isAnimated = false;

        this._progressModel = new Backbone.Model({
            isVisible: false,
            value: 0
        });
        this._progressView = new ProgressView({
            model: this._progressModel
        });

        this.videoEncoder = new VideoEncoder(
            function() {
                this.videoEncoderLoaded = true;
            }.bind(this)
        );
    },

    onLoadSceneClick: function(e) {
        var picker = new SketchfabPicker();
        picker.pick({
            success: function(model) {
                this.disableControls();

                if (model.uid === this.uid) {
                    this.initViewer(model.uid);
                }

                if (model.uid) {
                    router.navigate('model/' + model.uid, {
                        trigger: true
                    });
                }
            }.bind(this)
        });
    },

    initViewer: function(urlid) {
        this.uid = urlid;

        this.client.init(urlid, {
            overrideDevicePixelRatio: 1,
            camera: 0,
            graph_optimizer: 1,
            preload: 1,

            success: function onSuccess(api) {
                this.api = api;
                api.start();
                api.addEventListener(
                    'viewerready',
                    function() {
                        api.getAnimations(
                            function(err, animations) {
                                this.animations = animations;
                                this.onViewerReady();
                            }.bind(this)
                        );
                    }.bind(this)
                );
            }.bind(this),
            error: function onError() {
                console.error('Viewer error');
            }
        });

        this.getModelInfo(urlid).then(
            function(response) {
                this.modelInfo = response;
            }.bind(this),
            function() {
                this.modelInfo = null;
            }.bind(this)
        );
    },

    getModelInfo: function(urlid) {
        return $.ajax({
            url: 'https://api.sketchfab.com/v3/models/' + urlid,
            crossDomain: true,
            dataType: 'json',
            type: 'GET'
        });
    },

    onViewerReady: function() {
        this.render();
    },

    render: function() {
        if (this.animations.length > 0) {
            this.disableDuration();
        } else {
            this.enableDuration();
        }

        if (this.api) {
            this.enableControls();
        }
    },

    enableControls: function() {
        this.$el.find('#options-panel').addClass('active');
    },

    disableControls: function() {
        this.$el.find('#options-panel').removeClass('active');
    },

    enableDuration: function() {
        this.$el.find('.field-duration').addClass('active');
    },

    disableDuration: function() {
        this.$el.find('.field-duration').removeClass('active');
    },

    onRecordMouse: function(e) {
        e.preventDefault();
        this._mus = new Mus(this.iframe);
        this._progressModel.set('noprogress', true);
        this._mus.record();
    },

    onStopRecordMouse: function(e) {
        e.preventDefault();
        this._progressModel.set('noprogress', false);
        if (this._mus) this._mus.stop();
    },

    onRenderClick: function(e) {
        e.preventDefault();

        var isAnimated = this.animations.length > 0;
        var width = Math.floor(parseInt(this.$el.find('input[name="width"]').val()));
        var height = Math.floor(parseInt(this.$el.find('input[name="height"]').val()));
        var duration = isAnimated
            ? this.animations[0][2]
            : parseFloat(this.$el.find('select[name="duration"]').val());
        var output = this.$el.find('select[name="output"]').val();

        var options = {
            width: width,
            height: height,
            duration: duration,
            isAnimated: isAnimated,
            fps: this.FPS
        };

        var sequence;

        if (output === 'gif') {
            options.callback = function(images) {
                this.encodeGif(images, {
                    width: width,
                    height: height
                });
            }.bind(this);
        } else if (output === 'png') {
            options.format = 'image/png';
            options.fps = 60;
            options.asDataURI = true;
            options.callback = function(images) {
                this.saveFiles(images, {
                    width: width,
                    height: height
                });
            }.bind(this);
        } else if (output === 'mp4') {
            options.format = 'mp4';
            options.fps = 60;
            options.asDataURI = true;

            const canvas = document.createElement('canvas');
            canvas.height = height;
            canvas.width = width;
            const ctx = canvas.getContext('2d');
            //var pixels = new Uint8Array(width * height * 4);
            var image = new Image();
            ctx.translate(width - 1, height - 1);
            ctx.rotate(Math.PI);

            options.frameCallback = function(err, b64image) {
                image.src = b64image;
                image.onload = function() {
                    ctx.drawImage(image, 0, 0);
                    let imageData = ctx.getImageData(0, 0, width, height);
                    this.videoEncoder.queueFrame({ type: 'video', pixels: imageData.data });
                }.bind(this);
            }.bind(this);
            var first = true;

            options.callback = function() {
                this.videoEncoder.close(
                    function(vid) {
                        this.saveImage(
                            new Blob([vid], { type: 'video/mp4' }),
                            this.getFilename('.mp4')
                        );
                    }.bind(this)
                );
            }.bind(this);

            this.videoEncoder.init(
                {
                    fps: options.fps,
                    duration: options.duration,
                    br: 1000000,
                    width: options.width,
                    height: options.height
                },
                null,
                null,
                function() {
                    if (first) {
                        sequence.start();
                        first = false;
                    } else {
                        sequence._capture(sequence.frameIndex + 1, sequence.initialCamera);
                    }
                }.bind(this)
            );
        }

        if (isAnimated) {
            this.api.setCurrentAnimationByUID(this.animations[0][0]);
        }

        sequence = new ImageSequence(this.api, options);
        sequence.on(
            'progress',
            function onProgress(progress) {
                this._progressModel.set('value', progress.progress);
            }.bind(this)
        );

        if (this._mus) {
            // Sets playback speed (optional, default NORMAL)
            this._mus.setPlaybackSpeed(this._mus.speed.SLOW);

            // Starts playing and enjoy
            this._mus.play();
        }
        this._progressModel.set('noprogress', false);
        this._progressModel.set('isVisible', true);
        if (output !== 'mp4') sequence.start();
    },

    encodeGif: function(images, options) {
        var fps = this.FPS;

        var gif = new GIF({
            workers: 2,
            quality: 5,
            dither: 'FloydSteinberg-serpentine',
            width: options.width,
            height: options.height,
            dispose: -1
        });
        var optionsFrame = {
            delay: Math.floor(1000.0 / fps)
        };
        for (var j = 0; j < images.length; j++) {
            gif.addFrame(images[j], optionsFrame);
        }
        gif.on(
            'finished',
            function(blob) {
                this.saveImage(blob, this.getFilename('.gif'));
            }.bind(this)
        );
        gif.render();
    },

    getFilename: function(extension) {
        if (this.modelInfo !== null) {
            return this.modelInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + extension;
        } else {
            return 'scene' + extension;
        }
    },

    saveFiles(images, options) {
        var zip = new window.JSZip();
        var img = zip.folder(this.getFilename(''));
        for (var j = 0; j < images.length; j++) {
            img.file(
                this.getFilename('.' + j + '.png'),
                images[j].replace(/^data:image\/(png|jpg);base64,/, ''),
                { base64: true }
            );
        }
        zip.generateAsync({ type: 'blob' }).then(
            function(content) {
                this.saveImage(content, this.getFilename('.zip'));
            }.bind(this)
        );
    },

    saveImage: function(blob, filename) {
        this._progressModel.set('isVisible', false);
        var hasSaveAs = !!window.saveAs;
        if (hasSaveAs) {
            window.saveAs(blob, filename);
        } else {
            var url = (window.webkitURL || window.URL).createObjectURL(blob);
            window.open(url);
        }
    },

    onPresetClick: function(e) {
        e.preventDefault();
        var target = $(e.currentTarget);
        this.$el.find('input[name="width"]').val(target.attr('data-width'));
        this.$el.find('input[name="height"]').val(target.attr('data-height'));
    }
});
