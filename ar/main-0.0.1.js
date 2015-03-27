'use strict';

var video = document.querySelector('#video');
var controls = document.querySelector('#controls');
var button = document.querySelector('#capture-button');
var viewer = document.querySelector('#viewer');
var modelInput = document.querySelector('#model');
var localMediaStream = null;

var errorCallback = function(e) {
    console.error(e);
};

var displayModel = function() {
    var modelId = modelInput.value;
    viewer.src = 'https://sketchfab.com/models/' + modelId + '/embed?autostart=1&transparent=1&ui_controls=0&ui_controls=0&watermak=0&ui_infos=0&overrideDevicePixelRatio=1.5&internal=1';
    viewer.style.display = 'block';
    controls.style.display = 'none';

};

var getConstraints = function( callback ) {
    var videoSource = null;

    // MediaStreamTrack is not defined, let the browser decide
    if ( !MediaStreamTrack.getSources ) return callback({});

    MediaStreamTrack.getSources(function(sourceInfos) {

        for (var i = 0; i !== sourceInfos.length; ++i) {
            var sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === 'video' && sourceInfo.facing === "environment") {
                videoSource = sourceInfo.id;
            }
        }

        callback( {
        video: {
            optional: [{
                sourceId: videoSource
            }]
        }
        });
    });
};

navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);


button.addEventListener('click', function() {
    if (navigator.getUserMedia) {
        getConstraints(function( constraints ) {
            navigator.getUserMedia(constraints, function(stream) {
                video.src = window.URL.createObjectURL(stream);
                video.controls = false;
                localMediaStream = stream;
                displayModel();
            }, errorCallback);
        });
    } else {
        errorCallback({
            target: video
        });
    }
}, false);
