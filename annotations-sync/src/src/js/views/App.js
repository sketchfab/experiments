'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var config = require('../config.js');

var CAMERA_THRESHOLD = 10e9;
var CAMERA_POLLING_INTERVAL = 100;

var AppView = Backbone.View.extend({

    el: 'body',

    initialize: function() {

        this.currentAnnotation = null;

        // Start the viewer
        this.initViewer(this.viewerReady.bind(this));

    },

    initViewer: function(callback) {
        var self = this;
        var iframe = this.$el.find('#api-frame').get(0);
        var version = '1.0.0';
        var urlid = config.URLID;
        var client = new Sketchfab(version, iframe);

        client.init(urlid, _.extend({}, {
            success: function onSuccess(api) {
                api.start(function() {
                    api.addEventListener('viewerready', function() {
                        self._api = api;
                        callback();
                    });
                });
            },
            error: function onError() {
                console.log('Error while initializing the viewer');
            }
        }));
    },

    viewerReady: function() {
        // Update the current annotation when the annotation changes
        this._api.addEventListener('annotationFocus', function(index) {
            this.currentAnnotation = 1 + index;
            this.render();
        }.bind(this));
    },

    render: function() {
        if (this.currentAnnotation) {
            var current = '#annotation-' + this.currentAnnotation;
            $('.slide').removeClass('active');
            $(current).addClass('active');
        }
        return this;
    }
});

module.exports = AppView;
