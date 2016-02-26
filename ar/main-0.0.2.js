'use strict';

var videoElement = document.querySelector( '#video' );
var rasterCanvas = document.querySelector( '#rasterCanvas' );
var controls = document.querySelector( '#controls' );
var startButton = document.querySelector( '#capture-button' );
var stopButton = document.querySelector( '#stop-button' );
var viewer = document.querySelector( '#viewer' );
var modelInput = document.querySelector( '#model' );
var localMediaStream = null;

var videoSelect = document.querySelector( '#videoSource' );

var errorCallback = function ( e ) {
    console.error( e );

    // latest Draft of media Device compatibility
    // aka Firefox
    if ( e.message && e.message === 'audio and/or video is required' ) {
        var p = navigator.mediaDevices.getUserMedia( {
            audio: false,
            video: true
        } );

        p.then( function ( mediaStream ) {

            videoElement.src = window.URL.createObjectURL( mediaStream );

            videoElement.controls = false;
            localMediaStream = mediaStream;
            loadModel( getNodeList );

        } );
    }
};

function gotDevices( deviceInfos ) {

    // Handles being called several times to update labels. Preserve values.
    var select = videoSelect;
    var value = select.value;

    while ( select.firstChild ) {
        select.removeChild( select.firstChild );
    }


    for ( var i = 0; i !== deviceInfos.length; ++i ) {
        var deviceInfo = deviceInfos[ i ];
        var option = document.createElement( 'option' );
        option.value = deviceInfo.deviceId;
        if ( deviceInfo.kind === 'videoinput' ) {
            option.text = deviceInfo.label || 'camera ' + ( videoSelect.length + 1 );
            videoSelect.appendChild( option );
        } else {
            console.log( 'Some other kind of source/device: ', deviceInfo );
        }
    }

    if ( Array.prototype.slice.call( select.childNodes ).some( function ( n ) {
            return n.value === value;
        } ) ) {
        select.value = value;
    }
}

if ( navigator.mediaDevices && navigator.mediaDevices.enumerateDevices ) {
    navigator.mediaDevices.enumerateDevices().then( gotDevices ).catch( errorCallback );
}

var clientApi;
var rootNode;

var urlIdsList = [ 'f7d347b6afb349b296bce9d0b336f95a' ];



var updateUrlIds = function () {

    var hash = window.location.hash;

    var entries = hash.slice( 1 ).split( '&' );
    if ( hash ) {
        for ( var i = 0, l = entries.length; i < l; i++ ) {
            var entry = entries[ i ].split( '=' );

            if ( !entry || entry.length !== 2 ) continue;

            if ( entry[ 0 ] === 'id' ) {
                urlIdsList = entry[ 1 ].split( '.' );
            }
        }
    }

};

window.addEventListener( 'hashchange', updateUrlIds, false );
updateUrlIds();
modelInput.value = urlIdsList[ 0 ].trim();



var loadModel = function ( callback ) {

    var modelId = modelInput.value;
    var client = new Sketchfab( '1.0.0', viewer );

    if ( window.location.host.indexOf( 'sketchfab-local' ) !== -1 )
        client._url = 'https://sketchfab-local.com/models/XXXX/embed';

    client.init( modelId, {
        camera: 0,
        transparent: 1,
        watermark: 0,
        //autostart: 1,
        preload: 1,
        //cardboard: 1,
        //continuousRender: 1,
        success: function onSuccess( api ) {
            //API is ready to use
            clientApi = api;
            api.start( function () {
                api.addEventListener( 'viewerready', function () {

                    callback();
                } );
            } );
        },
        error: function onError() {
            console.log( 'Viewer error' );
        }
    } );
    viewer.style.display = 'block';
    // controls.style.display = 'none';
};

var rootTransform;
var rootNode;
var getNodeList = function () {

    if ( clientApi.getRootMatrixNode ) {
        clientApi.getRootMatrixNode( function ( err, id, m ) {
            rootNode = id;
            rootTransform = m;

            console.log( 'RootMatrixNode', id );
        } );
    }

    // not useful just check you got that root node
    clientApi.getNodeMap( function ( err, result ) {

        if ( err ) {
            console.log( 'Error getting nodes' );
            return;
        }

        var nodeList = Object.keys( result );
        console.log( 'Nodes', nodeList );

        if ( err ) {
            console.log( 'Error getting graph' );
            return;
        }
    } );

    // Start
    track();
};


function start() {
    if ( localMediaStream ) {
        localMediaStream.getTracks().forEach( function ( track ) {
            track.stop();
        } );
    }
    var videoSource = videoSelect.value;
    var deviceId = videoSource ? {
        exact: videoSource
    } : undefined;

    var constraints;
    if ( navigator.getUserMedia ) {

        // old webrtc aka chrome
        constraints = {
            video: {
                optional: [ {
                    sourceId: videoSource
                } ]
            }
        };


        navigator.getUserMedia( constraints, function ( stream ) {

            videoElement.src = window.URL.createObjectURL( stream );
            //videoElement.srcObject = stream;
            videoElement.controls = false;
            localMediaStream = stream;

            loadModel( getNodeList );

        }, errorCallback );
    } else if ( navigator.mediaDevices.getUserMedia ) {

        //REAL webrtc thank you
        constraints = {
            video: {
                deviceId: deviceId
            }
        };

        navigator.mediaDevices.getUserMedia( constraints )
            .then( function ( stream ) {

                //videoElement.src = window.URL.createObjectURL( stream );
                videoElement.srcObject = stream;
                videoElement.controls = false;
                localMediaStream = stream;

                loadModel( getNodeList );

                // Refresh button list in case labels have become available
                return navigator.mediaDevices.enumerateDevices();
            } )
            .then( gotDevices )
            .catch( errorCallback );
    }
}

videoSelect.onchange = start;


navigator.getUserMedia = ( navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia );


startButton.addEventListener( 'click', function () {
    if ( navigator.getUserMedia ) {
        start();

    } else {
        errorCallback( {
            target: videoElement
        } );
    }
}, false );

var intervalId;

stopButton.addEventListener( 'click', function () {
    clearInterval( intervalId );
}, false );


var sizeX = 320;
var sizeY = 240;
var markerWidth = 120;
var threshold = 128;



rasterCanvas.width = sizeX;
rasterCanvas.height = sizeY;



var track = function () {


    var previousId;
    var markers = {};
    var markerIds = [];

    var raster = new NyARRgbRaster_Canvas2D( rasterCanvas );
    var param = new FLARParam( sizeX, sizeY );
    var detector = new FLARMultiIdMarkerDetector( param, markerWidth );

    var resultMat = new NyARTransMatResult();
    detector.setContinueMode( true );

    var ctxt = rasterCanvas.getContext( '2d' );

    intervalId = setInterval( function () {
        if ( rootTransform && rootNode ) {

            ctxt.drawImage( videoElement, 0, 0, sizeX, sizeY );
            rasterCanvas.changed = true;

            var markerCount = detector.detectMarkerLite( raster, threshold );

            // Go through the detected markers and get their IDs and transformation matrices.
            if ( markerCount > 0 ) {


                // Get the ID marker data for the current marker.
                // ID markers are special kind of markers that encode a number.
                // The bytes for the number are in the ID marker data.
                var id = detector.getIdMarkerData( 0 );

                // Read bytes from the id packet.
                var currId = -1;
                // This code handles only 32-bit numbers or shorter.
                if ( id.packetLength <= 4 ) {
                    currId = 0;
                    for ( var i = 0; i < id.packetLength; i++ ) {
                        currId = ( currId << 8 ) | id.getPacketData( i );
                    }
                }


                // HERE we switch model if necessary
                if ( previousId !== currId && currId < urlIdsList.length ) {

                    console.log( currId );
                    //console.log(detector.getARCodeIndex(0));

                    modelInput.value = urlIdsList[ currId ];
                    loadModel( getNodeList() );

                    previousId = currId;
                }

                // Get the transformation matrix for the detected marker.
                detector.getTransformMatrix( 0, resultMat );

                var m = rootTransform;

                // GOOD for VR
                // Mirror inverted when AR only
                // inversion left as exercise for the reader
                m[ 0 ] = resultMat.m00;
                m[ 1 ] = -resultMat.m10;
                m[ 2 ] = resultMat.m20;
                //m[3] = 0;
                m[ 4 ] = resultMat.m01;
                m[ 5 ] = -resultMat.m11;
                m[ 6 ] = resultMat.m21;
                //m[7] = 0;
                m[ 8 ] = -resultMat.m02;
                m[ 9 ] = resultMat.m12;
                m[ 10 ] = -resultMat.m22;
                //m[11] = 0;

                // magic numbers, better use bbox
                // left for reader exercice
                m[ 12 ] = resultMat.m03 / 50.0;
                m[ 13 ] = -resultMat.m13 / 50.0;
                m[ 14 ] = resultMat.m23 / 50.0;
                //    m[15] = 1;

                clientApi.setMatrix( rootNode, m );


            }
        }


    }, 15 );
};
