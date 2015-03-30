'use strict';

var video = document.querySelector('#video');
var rasterCanvas = document.querySelector('#rasterCanvas');
var controls = document.querySelector('#controls');
var startButton = document.querySelector('#capture-button');
var stopButton = document.querySelector('#stop-button');
var viewer = document.querySelector('#viewer');
var modelInput = document.querySelector('#model');
var localMediaStream = null;

var errorCallback = function(e) {
    console.error(e);
};

var clientApi;
var rootNode;

var loadModel = function(callback) {
    var modelId = modelInput.value;
    var client = new Sketchfab('1.0.0', viewer);
    client.init(modelId, {
        camera: 0,
        transparent: 1,
        watermark: 0,
        continuousRender: 1,
        success: function onSuccess(api) {
            //API is ready to use
            clientApi = api;
            api.start(function() {
                api.addEventListener('viewerready', function() {
                    callback();
                });
            });
        },
        error: function onError() {
            console.log('Viewer error');
        }
    });
    viewer.style.display = 'block';
    // controls.style.display = 'none';
};

var rootTransform = '236';
var getNodeList = function() {
    clientApi.getNodeMap(function(err, result) {

        if (err) {
            console.log('Error getting nodes');
            return;
        }
        console.log('Nodes', result);
        track();
        console.log( result[242] );


        clientApi.lookat([0,-10,0],[0,0,0]);
        clientApi.getCameraLookAt(function( err2, result2) {
            if (err2) {
                console.log('Error getting graph');
                return;
            }
            var m = result2;
            console.log(m);




        } );


    });
};


var getConstraints = function(callback) {
    var videoSource = null;

    // MediaStreamTrack is not defined, let the browser decide
    if (!MediaStreamTrack.getSources) {
        callback({});
    } else {

        MediaStreamTrack.getSources(function(sourceInfos) {

            for (var i = 0; i !== sourceInfos.length; ++i) {
                var sourceInfo = sourceInfos[i];
                if (sourceInfo.kind === 'video' && sourceInfo.facing === "environment") {
                    videoSource = sourceInfo.id;
                }
            }

            var constraints = {
                video: {
                    optional: [{
                        sourceId: videoSource
                    }]
                }
            };

            callback(constraints);
        });
    }
};

navigator.getUserMedia = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);


startButton.addEventListener('click', function() {
    if (navigator.getUserMedia) {
        getConstraints(function(constraints) {
            navigator.getUserMedia(constraints, function(stream) {
                video.src = window.URL.createObjectURL(stream);
                video.controls = false;
                localMediaStream = stream;
                loadModel(getNodeList);
                // track();
            }, errorCallback);
        });
    } else {
        errorCallback({
            target: video
        });
    }
}, false);

stopButton.addEventListener('click', function() {
    clearInterval(intervalId);
}, false);


var copyMarkerMatrix = function(arMat) {
    var glMat = {};
    glMat[0] = arMat.m00;
    glMat[1] = -arMat.m10;
    glMat[2] = arMat.m20;
    glMat[3] = 0;
    glMat[4] = arMat.m01;
    glMat[5] = -arMat.m11;
    glMat[6] = arMat.m21;
    glMat[7] = 0;
    glMat[8] = -arMat.m02;
    glMat[9] = arMat.m12;
    glMat[10] = -arMat.m22;
    glMat[11] = 0;
    glMat[12] = arMat.m03;
    glMat[13] = -arMat.m13;
    glMat[14] = arMat.m23;
    glMat[15] = 1;
    return glMat;
};

var intervalId;
var track = function() {

    var markers = {};
    var markerIds = [];
    intervalId = setInterval(function() {
        var raster = new NyARRgbRaster_Canvas2D(rasterCanvas);
        var param = new FLARParam(320, 240);
        var detector = new FLARMultiIdMarkerDetector(param, 120);
        detector.setContinueMode(true);
        rasterCanvas.getContext('2d').drawImage(video, 0, 0, 320, 240);
        rasterCanvas.changed = true;

        var threshold = 128;
        var markerCount = detector.detectMarkerLite(raster, threshold);

        var resultMat = new NyARTransMatResult();
        // Go through the detected markers and get their IDs and transformation matrices.
        if (markerCount > 0) {
            // Get the ID marker data for the current marker.
            // ID markers are special kind of markers that encode a number.
            // The bytes for the number are in the ID marker data.
            var id = detector.getIdMarkerData(0);

            // Read bytes from the id packet.
            var currId = -1;
            // This code handles only 32-bit numbers or shorter.
            if (id.packetLength <= 4) {
                currId = 0;
                for (var i = 0; i < id.packetLength; i++) {
                    currId = (currId << 8) | id.getPacketData(i);
                }
            }

            // Get the transformation matrix for the detected marker.
            detector.getTransformMatrix(0, resultMat);

            // Copy the result matrix into our marker tracker object.
            var rootMat = Object.asCopy(resultMat);
            // console.log(rootMat);
            var rootMat2 = copyMarkerMatrix(rootMat);
            console.log('setting object matrix');
            console.log(rootMat2);
            var eye = [0, 0, 0];
            var target = [0, 0, 1];
            clientApi.lookat(eye, target, 0);
        }


    }, 15);
};
