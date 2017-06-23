( function ( window ) {
    'use strict';

    function ImageSequence( api, options ) {

        this.api = api;
        this.images = [];
        this.events = {};
        this.progressValue = 0;

        var fps = options.fps || 15;
        var duration = options.duration || 2;

        this.options = {
            width: options.width || 640,
            height: options.height || 360,
            duration: duration,
            fps: fps,
            steps: Math.floor( duration * fps ),
            format: options.format || 'image/png',
            isAnimated: !!options.isAnimated
        };

        if ( options.callback && isFunction( options.callback ) ) {
            this.clbk = options.callback;
        } else {
            this.clbk = null;
        }
    }

    ImageSequence.prototype.on = function on( name, handler ) {
        if ( name === 'progress' ) {
            this.events[ name ] = handler;
        }
    };

    ImageSequence.prototype.triggerProgress = function triggerProgress( value ) {
        if ( value >= this.progressValue ) {
            this.progressValue = value;
            if ( this.events.progress && isFunction( this.events.progress ) ) {
                this.events.progress.call( window, {
                    progress: value
                } );
            }
        }
    };

    ImageSequence.prototype.start = function start() {
        console.log( 'Starting image sequence', this.options );
        this.capture( this.options.steps, function () {
            if ( isFunction( this.clbk ) ) {
                this.clbk.call( window, this.images );
            }
        }.bind( this ) );
    };

    ImageSequence.prototype.capture = function capture( nbFrames, callback ) {

        var api = this.api;
        var outputFormat = this.options.format;
        var width = this.options.width;
        var height = this.options.height;
        var isAnimated = this.options.isAnimated;

        var _capture = function ( frameIndex, initialCamera ) {


            if ( frameIndex === nbFrames ) {
                this.triggerProgress( 1.0 );
                if ( callback ) {
                    callback.call( this );
                }
                return;
            }

            this.triggerProgress( frameIndex / nbFrames );
            if ( !isAnimated ) {
                var newCamera = Animations.turntable( initialCamera, frameIndex, nbFrames );
                api.setCameraLookAt(
                    newCamera.position,
                    newCamera.target,
                    0
                );
            } else {
                var seekTime = this.options.duration / nbFrames * frameIndex;
                api.seekTo( seekTime );
            }

            setTimeout( function () {
                api.getScreenShot( width, height, outputFormat, function ( err, b64image ) {
                    if ( err ) {
                        return;
                    }

                    if ( this.options.format !== 'image/webp' ) {
                        var image = new Image();
                        image.src = b64image;
                        this.images.push( image );
                    } else {
                        this.images.push( b64image );
                    }

                    _capture( frameIndex + 1, initialCamera );
                }.bind( this ) );
            }.bind( this ), 100 );

        }.bind( this );


        api.getCameraLookAt( function ( err, camera ) {
            var initialCamera = camera;
            if ( isAnimated ) {
                api.pause();
                api.seekTo( 0.0 );
            }
            _capture( 0, initialCamera );
        } );

    };

    var Animations = {
        still: function still( camera, i, total ) {
            return camera;
        },

        turntable: function turntable( camera, i, total ) {
            var inc = ( 2 * Math.PI ) / total;
            var angle = inc * ( i + 1 );
            var distance = Math.sqrt(
                Math.pow( camera.target[ 0 ] - camera.position[ 0 ], 2 ) +
                Math.pow( camera.target[ 1 ] - camera.position[ 1 ], 2 )
            );
            var x = camera.target[ 0 ] + distance * Math.cos( angle );
            var y = camera.target[ 1 ] + distance * Math.sin( angle );

            return {
                position: [ x, y, camera.position[ 2 ] ],
                target: camera.target.slice()
            };
        }
    };

    function isFunction( functionToCheck ) {
        var getType = {};
        return functionToCheck && getType.toString.call( functionToCheck ) === '[object Function]';
    }

    window.ImageSequence = ImageSequence;
} )( window );
