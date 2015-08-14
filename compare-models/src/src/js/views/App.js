'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var CAMERA_POLLING_INTERVAL = 500;
var CAMERA_DELTA = 0.00001;

var AppView = Backbone.View.extend({

    el: 'body',

    initialize: function() {
        var version = '1.0.0';

        var iframeA = this.$el.find('#viewer-a-frame').get(0);
        var iframeB = this.$el.find('#viewer-b-frame').get(0);

        this.currentViewer = false;

        this.viewers = {
            'a': {
                _id: 'a',
                api: null,
                client: new Sketchfab(version, iframeA),
                ready: false,
                urlid: '375ae80dc7e34b229cc9739b1ce92e2b',
                camera: null,
                previousCamera: {
                    position: [0, 0, 0],
                    target: [0, 0, 0]
                }
            },
            'b': {
                _id: 'b',
                api: null,
                client: new Sketchfab(version, iframeB),
                ready: false,
                urlid: '00e448826184414db5660601d76e4d8e',
                camera: null,
                previousCamera: {
                    position: [0, 0, 0],
                    target: [0, 0, 0]
                }
            }
        };

        this.initViewers();
    },

    initViewers: function() {
        this.viewers.a.client.init(this.viewers.a.urlid, {
            camera: 0,
            success: function onSuccess(apiA) {
                this.viewers.a.api = apiA;
                apiA.start();
                apiA.addEventListener('viewerready', function() {
                    this.viewers.a.ready = true;
                    this.onViewersReady();
                }.bind(this));
            }.bind(this),
            error: function onError() {
                console.log('Viewer A error');
            }
        });

        this.viewers.b.client.init(this.viewers.b.urlid, {
            camera: 0,
            success: function onSuccess(apiB) {
                this.viewers.b.api = apiB;
                apiB.start();
                apiB.addEventListener('viewerready', function() {
                    this.viewers.b.ready = true;
                    this.onViewersReady();
                }.bind(this));
            }.bind(this),
            error: function onError() {
                console.log('Viewer B error');
            }
        });
    },

    onViewersReady: function() {

        var self = this;

        if (this.viewers.a.ready && this.viewers.b.ready) {

            this.startCameraPolling();

            this.viewers.a.api.setCameraLookAt([0, -10, 0], [0, 0, 0], 2);
            this.viewers.b.api.setCameraLookAt([0, -10, 0], [0, 0, 0], 2);
        }
    },

    startCameraPolling: function() {
        this._pollingTimer = setInterval(function() {
            this.viewers.a.api.getCameraLookAt(function(err, camera) {
                this.viewers.a.camera = camera;
                this._onCameraPolled(this.viewers.a);
            }.bind(this));
            this.viewers.b.api.getCameraLookAt(function(err, camera) {
                this.viewers.b.camera = camera;
                this._onCameraPolled(this.viewers.b);
            }.bind(this));
        }.bind(this), CAMERA_POLLING_INTERVAL);
    },

    _onCameraPolled: function(viewer) {
        var camera = viewer.camera;
        var previousCamera = viewer.previousCamera;

        var positionDistance = vec3.distance(
            vec3.fromValues(camera.position[0], camera.position[1], camera.position[2]),
            vec3.fromValues(previousCamera.position[0], previousCamera.position[1], previousCamera.position[2])
        );
        var targetDistance = vec3.distance(
            vec3.fromValues(camera.target[0], camera.target[1], camera.target[2]),
            vec3.fromValues(previousCamera.target[0], previousCamera.target[1], previousCamera.target[2])
        );

        viewer.previousCamera = camera;
        var totalDistance = positionDistance + targetDistance;
        if (totalDistance < CAMERA_DELTA) {
            if (this.currentViewer !== false) {
                this.currentViewer = false;
            }
        } else {
            if (this.currentViewer === false) {
                this.currentViewer = viewer._id;
            }

            if (this.currentViewer === 'a') {
                this.viewers.b.api.setCameraLookAt(camera.position, camera.target, 0.5);
            }
            if (this.currentViewer === 'b') {
                this.viewers.a.api.setCameraLookAt(camera.position, camera.target, 0.5);
            }
        }
    }

});

module.exports = AppView;
