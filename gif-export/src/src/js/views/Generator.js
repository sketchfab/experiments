'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var SketchfabSDK = require('../vendors/sketchfab-sdk/Sketchfab');
var SketchfabImageSequence = require('../vendors/sketchfab-image-sequence/sketchfab-image-sequence');

var tplModelInfo = _.template(require('./GeneratorModelInfo.tpl'));

var GeneratorView = Backbone.View.extend({

    events: {
        'submit': 'generate'
    },

    initialize: function() {
        this.api = null;
        this.client = null;
    },

    loadModel: function(urlid) {
        this.urlid = urlid;

        SketchfabSDK.Model.byId(this.urlid).then(
            function(response) {
                this.model = response;
                this.enableTools();
                this.render();
            }.bind(this),
            function() {
                console.log('Error');
            }
        );
    },

    render: function() {
        console.log('render');

        var images = _.sortBy(this.model.thumbnails.images, 'width');
        var thumbnailUrl = images[0].url;

        this.$el.find('.model-info').html(tplModelInfo({
            model: this.model,
            thumbnail: thumbnailUrl
        }));
        return this;
    },

    generate: function(e) {
        e.preventDefault();

        if (!this.urlid) {
            return;
        }

        this.disableTools();

        var width = parseInt(this.$el.find('input[name="width"]').val(), 10);
        var height = parseInt(this.$el.find('input[name="height"]').val(), 10);
        var duration = parseInt(this.$el.find('select[name="duration"]').val(), 10);
        var format = this.$el.find('select[name="format"]').val();

        this.$el.find('.viewer .preview').empty();

        this.hideSharing();
        this.showProgress();
        this.updateProgress('Loading model...');

        if (format === 'gif') {
            var sequence = new SketchfabImageSequence(this.urlid, {
                width: width,
                height: height,
                duration: duration,
                callback: function(images) {
                    this.updateProgress('Encoding GIF...');
                    var gif = new GIF({
                        workers: 2,
                        quality: 5,
                        width: width,
                        height: height
                    });
                    var image;
                    for (var j = 0; j < images.length; j++) {
                        image = new Image();
                        image.src = images[j];
                        //@TODO: image loading isn't guaranteed to be finished when added
                        gif.addFrame(image, {
                            delay: 1 / 15
                        });
                    }
                    gif.on('finished', function(blob) {
                        var url = URL.createObjectURL(blob);
                        this.onGenerateEnd(url);
                    }.bind(this));
                    gif.render();
                }.bind(this)
            });
        } else if (format === 'webm') {
            var sequence = new SketchfabImageSequence(this.urlid, {
                width: width,
                height: height,
                duration: duration,
                format: 'image/webp',
                callback: function(images) {
                    this.updateProgress('Encoding WebM...');
                    var blob = Whammy.fromImageArray(images, 15);
                    var url = URL.createObjectURL(blob);
                    this.onGenerateEnd(url);
                }.bind(this)
            });
        }

        sequence.on('progress', function(res) {
            console.log(res.progress, res.data);
            this.updateProgress('Rendering ' + res.progress + '%');
        }.bind(this));

        sequence.start();
    },

    showProgress: function() {
        this.$el.find('.progress').addClass('active');
    },
    hideProgress: function() {
        this.$el.find('.progress').removeClass('active');
    },
    updateProgress: function(message) {
        this.$el.find('.progress .message').text(message);
    },

    showSharing: function() {
        this.$el.find('.share').addClass('active');
    },
    hideSharing: function() {
        this.$el.find('.share').removeClass('active');
    },

    onGenerateEnd: function(url) {
        var format = this.$el.find('select[name="format"]').val();

        this.hideProgress();
        this.showSharing();
        console.log(url);

        if (format === 'gif') {
            this.$el.find('.viewer .preview').html('<img src="' + url + '">');
            this.$el.find('.save').attr('href', url);
            this.$el.find('.save').attr('download', this.model.name);
        } else if (format === 'webm') {
            this.$el.find('.viewer .preview').html('<video src="' + url + '" autoplay loop>');
            this.$el.find('.save').attr('href', url);
            this.$el.find('.save').attr('download', this.model.name + '.webm');
        }
        this.enableTools();

    },

    enableTools: function() {
        this.$el.find('.tools').addClass('active');
        this.$el.find('.btn-primary').removeAttr('disabled');
    },

    disableTools: function() {
        this.$el.find('.tools').removeClass('active');
        this.$el.find('.btn-primary').attr('disabled', 'disabled');
    }
});

module.exports = GeneratorView;
