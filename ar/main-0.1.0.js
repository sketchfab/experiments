var video = document.querySelector( '#video' );
var rasterCanvas = document.querySelector( '#rasterCanvas' );
var controls = document.querySelector( '#controls' );
var startButton = document.querySelector( '#capture-button' );
var stopButton = document.querySelector( '#stop-button' );
var fullscreenButton = document.querySelector( '#fullscreen-button' );
var viewer = document.querySelector( '#viewer' );
var modelInput = document.querySelector( '#model' );
var viewport = document.querySelector( '.viewport' );
var controls = document.querySelector( '#controls' );
var toggleButton = document.querySelector( '.toggle' );

var Camera = {

    el: document.querySelector( '#video' ),
    stream: null,
    tracks: null,
    constraints: {
        audio: false,
        video: {
            facingMode: {
                exact: "environment"
            }
        }
    },

    start: function ( callback ) {
        if ( navigator.mediaDevices.getUserMedia ) {
            navigator.mediaDevices.getUserMedia( {
                    audio: false,
                    video: true
                } ).then( function ( stream ) {
                    Camera.tracks = stream.getVideoTracks();
                    Camera.el.controls = false;
                    Camera.el.srcObject = stream;
                    Camera.stream = stream;
                    if ( callback )
                        callback();
                } )
                .catch( function ( error ) {
                    console.error( error );
                    alert( "Error while starting camera" );
                } );
        }
    },

    stop: function ( callback ) {
        Camera.tracks.forEach( function ( track ) {
            track.stop();
        } );
        if ( callback )
            callback();
    }
};

var Viewer = {

    client: new Sketchfab( '1.0.0', viewer ),
    api: null,
    rootMatrixNode: null,

    load: function ( callback ) {
        if ( window.location.host.indexOf( 'sketchfab-local' ) !== -1 )
            Viewer.client._url = 'https://sketchfab-local.com/models/XXXX/embed';

        var uid = modelInput.value;

        Viewer.client.init( uid, {
            camera: 0,
            transparent: 1,
            watermark: 0,
            preload: 1,
            internal: 1,
            success: function onSuccess( api ) {
                Viewer.api = api;
                api.start( function () {
                    api.addEventListener( 'viewerready', function () {
                        Viewer.getRootMatrixNode();
                        if ( callback )
                            callback();
                    } );
                } );
            },
            error: function onError() {
                console.error( 'Viewer error' );
            }
        } );
    },

    getRootMatrixNode: function () {
        if ( Viewer.api.getRootMatrixNode ) {
            Viewer.api.getRootMatrixNode( function ( err, id, m ) {
                Viewer.rootMatrixNode = {
                    id: id,
                    matrix: m
                };
                console.log( 'RootMatrixNode', Viewer.rootMatrixNode );
            } );
        }
    },

    setMatrixTransform: function ( matrix ) {
        var m = Viewer.rootMatrixNode.matrix;

        m[ 0 ] = matrix.m00;
        m[ 1 ] = -matrix.m10;
        m[ 2 ] = matrix.m20;
        //m[3] = 0;
        m[ 4 ] = matrix.m01;
        m[ 5 ] = -matrix.m11;
        m[ 6 ] = matrix.m21;
        //m[7] = 0;
        m[ 8 ] = -matrix.m02;
        m[ 9 ] = matrix.m12;
        m[ 10 ] = -matrix.m22;
        //m[11] = 0;

        // magic numbers, better use bbox
        // left for reader exercice
        m[ 12 ] = matrix.m03 / 50.0;
        m[ 13 ] = -matrix.m13 / 50.0;
        m[ 14 ] = matrix.m23 / 50.0;

        Viewer.api.setMatrix( Viewer.rootMatrixNode.id, m );
    },

    stop: function ( callback ) {
        if ( Viewer.api )
            Viewer.api.stop();

        if ( callback )
            callback();
    }
};

var Tracking = {

    canvas: document.querySelector( '#rasterCanvas' ),
    ctx: null,
    timer: null,

    width: 320,
    height: 240,
    markerWidth: 120,
    threshold: 128,

    start: function () {
        Tracking.canvas.width = Tracking.width;
        Tracking.canvas.height = Tracking.height;
        Tracking.ctx = Tracking.canvas.getContext( '2d' );
        Tracking.track();
    },

    stop: function () {
        if ( Tracking.timer )
            clearInterval( Trackign.timer );
    },

    track: function () {

        var markers = {};
        var markerIds = [];

        var raster = new NyARRgbRaster_Canvas2D( Tracking.canvas );
        var param = new FLARParam( Tracking.width, Tracking.height );
        var detector = new FLARMultiIdMarkerDetector( param, Tracking.markerWidth );

        var resultMat = new NyARTransMatResult();
        detector.setContinueMode( true );

        Tracking.timer = setInterval( function () {
            Tracking.ctx.drawImage( video, 0, 0, Tracking.width, Tracking.height );
            Tracking.canvas.changed = true;

            var markerCount = detector.detectMarkerLite( raster, Tracking.threshold );

            if ( markerCount > 0 ) {
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

                detector.getTransformMatrix( 0, resultMat );
                Viewer.setMatrixTransform( resultMat );
            }
        }, 32 );
    }
};

startButton.addEventListener( 'click', function () {
    Camera.start( function () {
        viewer.style.display = 'block';
        Viewer.load( function () {
            Tracking.start();
        } );
    } );
}, false );

stopButton.addEventListener( 'click', function () {
    Camera.stop();
    Viewer.stop();
    viewer.style.display = 'none';
    Tracking.stop();
}, false );

fullscreenButton.addEventListener( 'click', function () {

    function enterFullscreen( element ) {
        if ( element.requestFullscreen ) {
            element.requestFullscreen();
        } else if ( element.mozRequestFullScreen ) {
            element.mozRequestFullScreen();
        } else if ( element.webkitRequestFullscreen ) {
            element.webkitRequestFullscreen();
        } else if ( element.msRequestFullscreen ) {
            element.msRequestFullscreen();
        }
    }

    enterFullscreen( viewport );
} );

toggleButton.addEventListener( 'click', function () {
    var isActive = controls.className.indexOf( 'active' ) !== -1;
    if ( isActive ) {
        controls.className = controls.className.replace( 'active', '' );
    } else {
        controls.className = controls.className + ' active';
    }
} );
