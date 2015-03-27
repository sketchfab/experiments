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

var displayModel = function () {
    var modelId = modelInput.value;
    viewer.src = 'https://sketchfab.com/models/' + modelId + '/embed?autostart=1&transparent=1&ui_controls=0&ui_controls=0&watermak=0&ui_infos=0';
    viewer.style.display = 'block';
    controls.style.display = 'none';

};

button.addEventListener('click', function() {
    if (navigator.getUserMedia) {
        navigator.getUserMedia('video', function(stream) {

            video.src = stream;
            video.controls = false;
            localMediaStream = stream;

            displayModel();
        }, errorCallback);
    } else if (navigator.webkitGetUserMedia) {
        navigator.webkitGetUserMedia({
            video: true
        }, function(stream) {
            video.src = window.URL.createObjectURL(stream);
            video.controls = false;
            localMediaStream = stream;
            displayModel();
        }, errorCallback);
    } else {
        errorCallback({
            target: video
        });
    }
}, false);
