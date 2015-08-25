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

        this.initViewer(this.viewerReady.bind(this));

        var current = new Backbone.Model();
        current.on('change', function(model) {
            var current = '#annotation-' + (1 + parseInt(this.get('order'), 10));
            $('.slide').removeClass('active');
            $(current).addClass('active');
        });

        this.listenTo(this, 'idle', function(e) {
            if (e === true && this._annotations) {
                _.each(this._annotations, function(annotation, i) {
                    var distance = this.annotationDistance(annotation);
                    if (distance === 0) {
                        annotation.order = i;
                        current.set(annotation);
                    }
                }.bind(this));
            }
        });

        Backbone.ajax({
            url: 'https://sketchfab.com/i/models/' + config.URLID + '/hotspots'
        }).then(function(data) {
            this._annotations = data.results;
        }.bind(this));

    },

    initViewer: function(callback) {
        var self = this;
        var iframe = this.$el.find('#api-frame').get(0);
        var version = '1.0.0';
        var urlid = config.URLID;
        var client = new Sketchfab(version, iframe);

        client.init(urlid, _.extend({}, {
            success: function onSuccess(api) {
                self._api = api;
                api.start(function() {
                    api.addEventListener('viewerready', function() {
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
        console.log('Viewer ready');
        this.startCameraPolling();
    },

    startCameraPolling: function() {
        this.timer = setInterval(function() {
            this._api.getCameraLookAt(function(dummy, camera) {
                this._camera = camera;
                this._onCameraPolled();
            }.bind(this));
        }.bind(this), CAMERA_POLLING_INTERVAL);
    },

    _onCameraPolled: function() {
        var camera = {
            position: [
                Math.round(this._camera.position[0] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this._camera.position[1] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this._camera.position[2] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
            ],
            target: [
                Math.round(this._camera.target[0] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this._camera.target[1] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this._camera.target[2] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
            ]
        };
        var signature = JSON.stringify(camera);
        if (this.previousSignature && this.previousSignature === signature) {
            this.trigger('idle', true);
        } else {
            this.previousSignature = signature;
            this.trigger('idle', false);
        }
    },

    annotationDistance: function(annotation) {
        var ce = this._camera.position;
        var ct = this._camera.target;
        var cameraEye = vec3.fromValues(ce[0], ce[1], ce[2]);
        var cameraTarget = vec3.fromValues(ct[0], ct[1], ct[2]);

        var ae = annotation.eye;
        var at = annotation.target;
        var annotationEye = vec3.fromValues(ae[0], ae[1], ae[2]);
        var annotationTarget = vec3.fromValues(at[0], at[1], at[2]);

        var eyeDistance = vec3.distance(cameraEye, annotationEye);
        var targetDistance = vec3.distance(cameraTarget, annotationTarget);

        return eyeDistance + targetDistance;
    }
});

module.exports = AppView;
