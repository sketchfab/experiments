'use strict';

var video = document.querySelector( '#video' );
var rasterCanvas = document.querySelector( '#rasterCanvas' );
var controls = document.querySelector( '#controls' );
var startButton = document.querySelector( '#capture-button' );
var stopButton = document.querySelector( '#stop-button' );
var viewer = document.querySelector( '#viewer' );
var modelInput = document.querySelector( '#model' );
var localMediaStream = null;

var clientApi;

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

            video.src = window.URL.createObjectURL( mediaStream );

            video.controls = false;
            localMediaStream = mediaStream;
            loadModel( getNodeList );

        } );
    }
};


var getConstraints = function ( callback ) {
    var videoSource = null;

    // MediaStreamTrack is not defined, let the browser decide
    if ( !MediaStreamTrack.getSources ) {
        callback( {} );
    } else {

        MediaStreamTrack.getSources( function ( sourceInfos ) {

            for ( var i = 0; i !== sourceInfos.length; ++i ) {
                var sourceInfo = sourceInfos[ i ];
                if ( sourceInfo.kind === 'video' && sourceInfo.facing === "environment" ) {
                    videoSource = sourceInfo.id;
                }
            }

            var constraints = {
                video: {
                    optional: [ {
                        sourceId: videoSource
                    } ]
                }
            };

            callback( constraints );
        } );
    }
};

navigator.getUserMedia = ( navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia );


startButton.addEventListener( 'click', function () {
    if ( navigator.getUserMedia ) {
        getConstraints( function ( constraints ) {
            navigator.getUserMedia( constraints, function ( stream ) {
                video.src = window.URL.createObjectURL( stream );
                video.controls = false;
                localMediaStream = stream;
                loadModel( getNodeList );

            }, errorCallback );
        } );
    } else {
        errorCallback( {
            target: video
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

            ctxt.drawImage( video, 0, 0, sizeX, sizeY );
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

                // console.log(currId);
                // console.log(detector.getARCodeIndex(0));

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
