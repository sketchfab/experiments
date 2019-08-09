(function(window) {
    'use strict';

    var AppView = Backbone.View.extend({
        el: '.app',

        events: {
            'click #load-scene': 'onLoadSceneClick',
            'click #render-gif': 'onRenderClick',
            'click #render-record': 'onRenderRecordClick',
            'click #record-mouse': 'onRecordMouse',
            'click #stop-record-mouse': 'onStopRecordMouse',
            'click .resolution-preset': 'onPresetClick'
        },

        initialize: function() {
            var version = '1.6.0';

            this.recordTarget = document.getElementById('recorder');
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

            this.logoImg = new Image();
            this.logoImg.crossOrigin = 'Anonymous';
            this.logoImg.src =
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA7CAYAAAFQ/tlcAAAACXBIWXMAAAsSAAALEgHS3X78AAALCUlEQVRo3uVbfUxb1xX/3WtjiMHhI4HUiQ0Egx2kJCRpaNNAgGTr2uajKCm22q2jkdZVa6X9062a2jUd7bpWU7pq6aRt6rJWzVpt9aNNstGk0bYmMAhpaPMB2ZL3TAhgp14wDTBDAv66+wPbfRg/+9mYrFOPhPT83r333HPuOb97zrkXQER6TnhWx/H94ncEAIqs/cv9mOpDBDksJkIAQGflGQDYzcbQSKHu3VTPCc9CihhWUwb2qLg31z92IvQMANRhNhUHn/8DAObi7LpZkwzNIdokaegBBN2RH2f10HH8cFEzvzXu8A6LiRDxh+Cs/XpOUAAAjTIfRVgsca+QxkJyR+uJ314aaYsrL5WQa1d4tWbIKjFKNAWRWJ3KNKoBm9tTJDXIrDnbzUY3AE20DrtO2C92uW6Wh2XScfxwRBvN0avjJ/ScgF63t+P2lj5XUIXs/Tp9ubihUkHQ6Gf4QPzyvmVZdUG9V4lsbZZ+JFUdWrRgZ5+eE5SRUpBENB2pcRLto+mwSzPhGfkrYWwtA951WEyN0drN6Ky3Ch8ysHukOKqo0tjXYLDJWmdEZ3fJYTaVh81PquPpbcu7okDAikKOb5S0+oObC9vsZiO06rRKu9mIPJViRPw9wPAWAJBIrmIMiaQwQgGgBM/M4Kyg8Ok5AX7GnOL3T58ZOiXuGOT+0ozOz1UUdNjNRhQ327ShxnpOwLHPxg3RZqSMNj272YhJH+P1nGAKdsqXdPZolKEkpnirRkFIWGHPn3NVQyapoCyiDrORfqEEptBzAq7d9H0ibrjy0OWxSIX1WQyDJKiUvYyxH8rlGnIMGlTQUyA4KnO6OZIOHsvGI1GUyOGms/IfAdgsz3EIo8D9g2ZjS2z/ikJNjNH9nOBHCogQ8ordbHwqJuNUMowi4lGH2bR1FuN44CWmgQajkxJoQ79f6h7u+A1/vSph2NVxwnEwVifVePNt6u4Dm3Sr5Qx80xfgjQd7TfGYU9NhlyYWUwDYoddcl6vRBUqqTyPwxjZWwUf0VuFjBnZHtAbPry1o3W3ILi9qthWE3q1blMEf3lI4Q6JxL7tQfsi2MgyVq/LbnliRWxPp/RHIx9bEBChCCsSQueGD/oVRBlxpe6DMlkFJWfB3TTzNKBnwLoBvy1XlqW3FWvGuIZpUWSJGTqX263klQj6mQXXuiPb9J2eHavWcgO91Os/IHdPtDVzQcwJira/DbNwQ9uOS5stlnoBPiDdwppKOX9pZuiAUQtvNRrxw3nXyd8LIRhkoNmU3GzOiAz3HXwTDilRrVwVlTp/FMBZ3kyjk+MZQrDIHnA5LKGuTkJjI0wFGfgowRSyjUTGFpc9iGIwP3QlQUTO/1R/AgyCoIQxaRuAGSC8BWtSq3H18fb5b/p4RV1JhewD4MxiTO8njDotpS9KM5Vq59MDkmN1ivFc6ZIsey+6dC9PpIJzdo7PyrIkxKkvi+XAnBdJLBizFVyQl1nH8kfnwYT+m+iIlp2K/BcN9cgc7vW15V5lGNSC3fWRIlXD69bgpr+OZ1YurRCmJs6hZ0CZqcMHQhz8PhpihTZ5KMXK+3rBQXM0Q0yfDk207jw/G3YdnxlxxpBV2lvILlNQkR6rGfzi6j//7xup4fk4LOf5pqRaV+Qsu2s1GyGUKAAc26VYHCxuSsWMwVxV8sfA3jcDb12D0AlDLYcz1j514sutazOAxMz1vIZFrVA8bck69vK5gg6TLMOYsbrZpxTmzPxA9myWE7KGxmNnNRnzXmHsSAN6+PLpBzwkY97ILke3qPxrkQ0wJSGCwwXj9uYqCDmlUw3YaT9LnKvI32s3GqQxKJwGg/JBt5e0tfS4A6HV7O/ScgDOfT5oA4Njdhe2D5jJKCPLiAGqpUqbNpNseKMXAuLez+uiVu4Zu+vKDMVUVANy9NOvcG1VL1wCQlZ4TBg1NBPqKstLuspuNqFmS2TNdDCIeu9k4HmQqfwMhcNJksPfN6qULAWB7oeY8gKwktq62pBjPebei+BMFIR/fasYDDaYjVMUUFqkGb/SOtiYVBDCMNJ11bZIqVQAAjRURhjIJT4Bdkcv0gY/sFwubhVyG6JEHBe4X78e7Yg1meM+2fPOHAzH33k7XzVY9J+D05zfLY7ULFWVCBfWDhJCpWB163VNFek5A+7WJ1ogSoVPPCbCcsNfGzSaoMnoxWnYtNgXVHypVPUtxxedSZMmJRhQKx1LOfLrMVC47oNdzwiRjLH0uPCnBI4Nm04GEUxidld8J4P0kpOx2mE0Vc07aSqyXCz3EbwVjd8YYyk8J2zNoNr2ckqQtESqxXi70Ed+3AiD1YFgfM6WNPS0/CD6hYIeVTPmOnLQ3ZVlqXBMgaIoXkqfQQbrB0OSwmA7eMoELOb6Rgbw+V0dLAQ5OEbDHpJx1rr6U7SG+PyaSSt5a6XFUxZQPiWtZSQkcFPTUfCTq87URqZhyQyzBaYz9Ya8HvtH/G2GnI+YVHvhG9ZywV/YKlzRfLvMyf0+qfVStoBO/vkvb9TVt5kYAquBrz9+dEyef6HRW3vAHMlPt42lEsUp84B0t2Epu45WgdYsy+LeqdZM5Klohp/2oJ3D+kXZHRijtTBHtEqM6+QJ9he0Bxv4yNxcigR+vWtz+mCl3FSHInZN1Moy8zo/0/KxnuFoqKZAfepEdoTieiCKa/gQqwmFaplY5365Z1leqSauaT/fsdXs7Hm67WnL1hkebhH0zFVMU91kMgxQAguFbUkGIKVs1pFMrl8w3HunUyiWmbNVQkuZCPMRvBQASPFz4IBWTKs5Kc1hrdU6tOq0yFeM5b3i7LK0Obf+4V5ei8sM2orPyB5DAQWaInq3Ib1ubl8F2d3y21u3xL5xVKlTS8f0btZ9WL8mshkSVN1pRsP3aRPujJ523T/gCswo5eSrFyJublvV8+vkke+HcUG0SMv9BCYIaJJEIp1HC7li8oPZf9QYAwPCU78yDrVdz+bGp5QAw4QtkPdR2tXYmmOVUEEKyZ1obG3udHz0fBCcFgBmCVBeoL+zfuFSRmUbLAeQCqDl3fbI1SVStURIGbSoS/8XpynV/+8b09Twvw8APTjtdBwfd66fjAUZf7HHVvNjjAgBs1WWdAYAjjvF1ALIhOlNXUPiaKgo6dpfmrAl+W5myvZlBq2QEbjAsSiXApBEUvXantui1O7UAMH6gd/TTPedc1QE2nS4GBZ2B9O/ULL1i0Kg2YvqKVu18AB8jcCsB0guwRfMIsFmNpTm1jaU58ATYgOE9W/iW5q7ihV37Km+rBKAN/s13sN1LCdCCrwgRoIWqVbn7AOL/CojrV6ty91G+Pt9NCduTaHevj5H/1dST4U0J28PX57vFR7byL/+JaEmGcujdOn2vQZMW95ZLDB+OR4Gz1yfbd3d8tvL6pC8vCR2FL0eEz7YcFtMWOUfGkXRt0ldQ9+GVAgBIV9CpX1Qu6azXazYAyJhbagvXq/8c5n95caQK0yf6NUk6brfD/MVNkFmmkci9xHi0uzSn8/k1BcWhu4vxVnjEEzj3cJsjs3tksiw1IDX71gmRKtTN9QpTJK1dpOb3rs93ff3YQPiE895lWWe/WZI99ninc320UHJuKWH0aryk8zcxRvc3Cy1f2sJdjILeow3G7U2EBBIu4gHBf/shU0e+9LUtgksKlr418upQwgKLV/z3zbafJ3I7/ZbIScgr32ko+5HUiiYt8KxCX8D/q1SBWzJglEYV348s0M2bwBHpHSlqtm0LMPYkCKlLtnISqzwDxk5QQl6Nd+lfDv0XZdm2IQ6IDGwAAAAASUVORK5CYII=';
        },

        onLoadSceneClick: function(/*e*/) {
            var picker = new SketchfabPicker();
            picker.pick({
                success: function(model) {
                    this.disableControls();
                    this.modelInfo = model;

                    if (model.uid === this.uid) {
                        this.initViewer(model.uid, model);
                    }

                    if (model.uid) {
                        router.navigate('model/' + model.uid, {
                            trigger: true
                        });
                    }
                }.bind(this)
            });
        },

        initViewer: function(urlid, modelInfo) {
            this.uid = urlid;
            this.modelInfo = modelInfo;

            //'7w7pAfrCfjovwykkEeRFLGw5SXS'

            var options = {
                logoImg: this.logoImg,
                modelInfo: this.modelInfo,
                overrideDevicePixelRatio: 1,
                camera: 0,
                graph_optimizer: 1,
                preload: 1,
                success: function onSuccess(api) {
                    this.api = api;
                    setRecordingTarget(this.recordTarget, this.api);
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
            };
            if (this.textureQuality === 'HD') options.pixel_budget = -1;

            this.client.init(urlid, options);

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
            if (this.animations && this.animations.length > 0) {
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
            startRecording(this.api);
            this._progressModel.set('noprogress', true);
        },

        onStopRecordMouse: function(e) {
            e.preventDefault();
            endRecording(this.api, this);
            this._progressModel.set('noprogress', false);
        },

        onRenderRecordClick: function(e) {
            e.preventDefault();

            if (!this.recordedData) return; // msg : "please record first"

            this.renderSequence(this.recordedData);
        },

        onRenderClick: function(e) {
            e.preventDefault();
            this.renderSequence();
        },

        renderSequence(recordedData) {
            disableTransmitToIframe();

            var isAnimated = this.animations && this.animations.length > 0;
            var width = Math.floor(parseInt(this.$el.find('input[name="width"]').val()));
            var height = Math.floor(parseInt(this.$el.find('input[name="height"]').val()));
            var duration = isAnimated
                ? this.animations[0][2]
                : parseFloat(this.$el.find('select[name="duration"]').val());
            var output = this.$el.find('select[name="output"]').val();

            var fps = parseInt(this.$el.find('select[name="fps"]').val(), 10);
            this.FPS = fps;
            var textureQuality = this.$el.find('select[name="texture"]').val();
            this.textureQuality = textureQuality;

            var options = {
                logoImg: this.logoImg,
                modelInfo: this.modelInfo,
                width: width,
                height: height,
                duration: duration,
                isAnimated: isAnimated,
                fps: this.FPS,
                textureQuality: textureQuality
            };

            var sequence;

            if (output === 'gif') {
                options.callback = function(images) {
                    this.encodeGif(images, {
                        width: width,
                        height: height
                    });
                    enableTransmitToIframe();
                }.bind(this);
            } else if (output === 'png') {
                options.format = 'image/png';
                options.fps = this.FPS;
                options.asDataURI = true;
                options.callback = function(images) {
                    enableTransmitToIframe();
                    this.saveFiles(images, {
                        width: width,
                        height: height
                    });
                }.bind(this);
            } else if (output === 'mp4') {
                options.format = 'mp4';
                options.fps = this.FPS;
                options.asDataURI = true;

                options.frameCallback = function(data) {
                    this.videoEncoder.queueFrame({ type: 'video', pixels: data });
                }.bind(this);
                var first = true;

                options.callback = function() {
                    this.videoEncoder.close(
                        function(vid) {
                            this.saveImage(
                                new Blob([vid], { type: 'video/mp4' }),
                                this.getFilename('.mp4')
                            );
                            enableTransmitToIframe();
                        }.bind(this)
                    );
                }.bind(this);

                this.videoEncoder.init(
                    {
                        fps: options.fps,
                        duration: options.duration,
                        br: 1000000,
                        width: options.width,
                        height: options.height,
                        presetIdx: 4
                    },
                    null,
                    null,
                    function() {
                        if (first) {
                            sequence.start(recordedData);
                            first = false;
                        } else {
                            sequence._capture(sequence.frameIndex + 1, sequence.initialCamera);
                        }
                    }.bind(this)
                );
                // set start position
                if (recordedData) {
                    playFrame(
                        this.api,
                        recordedData,
                        0, // in ms
                        0
                    );
                }
            }

            if (isAnimated) {
                this.api.setCurrentAnimationByUID(this.animations[0][0]);
            }

            sequence = new ImageSequence(this.api, options, recordedData);
            sequence.on(
                'progress',
                function onProgress(progress) {
                    this._progressModel.set('value', progress.progress);
                }.bind(this)
            );

            this._progressModel.set('noprogress', false);
            this._progressModel.set('isVisible', true);
            if (output !== 'mp4') {
                sequence.start(recordedData);
            }
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
                var url = window.URL.createObjectURL(blob);
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

    window['AppView'] = AppView;
})(window);
