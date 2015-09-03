'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var giphyUpload = require('../utils/giphy.js');
var imgurUpload = require('../utils/imgur.js');

var SketchfabSDK = require('../vendors/sketchfab-sdk/Sketchfab');
var SketchfabImageSequence = require('../vendors/sketchfab-image-sequence/sketchfab-image-sequence');

var tplModelInfo = _.template(require('./GeneratorModelInfo.tpl'));

var GeneratorView = Backbone.View.extend({

    events: {
        'submit': 'generate',
        'click [data-action="imgur"]': 'uploadImgur',
        'click [data-action="giphy"]': 'uploadGiphy'
    },

    initialize: function() {
        this.api = null;
        this.client = null;
        this.blob = null;
        this.config = {};

        // Fetch config from Google Spreadsheet
        $.ajax({
            'url': 'https://spreadsheets.google.com/feeds/list/1M62DAoWPOB7qJH-uaQacHzkz4wiEiThSD5LUvZVezaE/od6/public/values?alt=json'
        }).then(function(response) {
            var cell = response.feed.entry[0].content['$t'];
            this.config.giphy = {
                'api_key': cell.replace('value: ', '')
            }
            console.log(this.config);
        }.bind(this));
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

        this.blob = null;

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
                        this.onGenerateEnd(url, blob);
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
                    this.onGenerateEnd(url, blob);
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

    onGenerateEnd: function(url, blob) {

        console.log(url);
        this.blob = blob;

        var format = this.$el.find('select[name="format"]').val();

        this.hideProgress();
        this.showSharing();

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
    },

    uploadImgur: function(e) {
        e.preventDefault();
        if (!this.blob) {
            return;
        }

        var originalLabel = '';
        var button = this.$el.find('button[data-action="imgur"]');
        originalLabel = button.text();
        button.prop('disabled', true);
        button.text('Uploading...');

        imgurUpload(this.blob, this.model, function(err, data) {

            button.prop('disabled', false);
            button.text(originalLabel);

            if (!err) {
                window.open('http://imgur.com/' + data.id);
            }
        });
    },

    uploadGiphy: function(e) {
        e.preventDefault();
        if (!this.blob) {
            return;
        }

        var originalLabel = '';
        var button = this.$el.find('button[data-action="giphy"]');
        originalLabel = button.text();
        button.prop('disabled', true);
        button.text('Uploading...');

        if (!this.config.giphy) {
            alert('Error. Giphy config is missing');
            return;
        }

        var api_key = this.config.giphy.api_key;

        giphyUpload(this.blob, this.model, api_key, function(err, data) {

            button.prop('disabled', false);
            button.text(originalLabel);

            if (!err) {
                button.prop('disabled', false);
                button.text(originalLabel);

                $.ajax({
                    'url': 'http://api.giphy.com/v1/gifs/' + data.id + '?api_key=' + api_key,
                }).then(function(response) {
                    window.open(response.data.url);
                });

            } else {
                console.error(err);
            }
        });
    }
});

module.exports = GeneratorView;
