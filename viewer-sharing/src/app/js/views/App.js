'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var CAMERA_THRESHOLD = 10e9;
var CAMERA_POLLING_INTERVAL = 1000;

var AppView = Backbone.View.extend({

    el: 'body',

    events: {
        'submit .intro form': 'onSubmit'
    },

    initialize: function() {
        var self = this;
        TogetherJS.hub.on("cameraUpdate", function (msg) {

            //ignore messages from other URLs
            if (! msg.sameUrl) {
                return;
            }

            // console.log( 'Message: ' +  msg );
            if ( msg.camera && self.api ) {
                var camera = JSON.parse(msg.camera);
                self.api.lookat(
                    camera.position,
                    camera.target,
                    1
                );
            }

        });
    },

    onSubmit: function( e ) {
        e.preventDefault();

        var url = $('input[name="url"]').val();
        console.log(url);

        var parsed = url.match(/https:\/\/sketchfab.com\/models\/([a-f0-9]+)/);
        if ( parsed && parsed[1] ) {
            var urlid = parsed[1];
            this.router.navigate('model/' + urlid, {trigger: true});
        }
    },

    hideIntro: function() {
        $('.intro').hide();
    },

    viewModel: function(urlid) {

        this.hideIntro();

        var self = this;
        var iframe = $( '#api-frame' )[ 0 ];
        var version = '1.0.0';
        this.client = new Sketchfab( version, iframe );
        this.client.init( urlid, {
            success: function( api ){
                self.api = api;
                api.start(function(){
                    self.startStreaming();
                    TogetherJS();
                });
            },
            error: function(){}
        } );
    },

    startStreaming: function() {
        var self = this;
        this.timer = setInterval(function(){
            self.api.getCameraLookAt( function( dummy, camera ){
                self.camera = camera;
                self.sendCamera();
            });
        }, CAMERA_POLLING_INTERVAL);
    },

    stopStreaming: function() {
        clearInterval( this.timer );
    },

    sendCamera: function() {

        if ( ! $('input[name="master"]').is(':checked') ) {
            return;
        }

        var camera = {
            position:[
                Math.round(this.camera.position[0] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this.camera.position[1] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this.camera.position[2] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
            ],
            target:[
                Math.round(this.camera.target[0] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this.camera.target[1] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
                Math.round(this.camera.target[2] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
            ]
        };

        var signature = JSON.stringify(camera);

        // var signature = JSON.stringify(this.camera);
        if ( this.previousSignature && this.previousSignature === signature ) {
            //nothing to do
        } else {
            this.previousSignature = signature;
            TogetherJS.send({type: "cameraUpdate", camera: signature });
        }
    }

});

module.exports = AppView;
