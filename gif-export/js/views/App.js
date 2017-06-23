'use strict';

var AppView = Backbone.View.extend( {

    el: '.app',

    events: {
        'click #load-scene': 'onLoadSceneClick',
        'click #render-gif': 'onRenderClick',
        'click .resolution-preset': 'onPresetClick'
    },

    initialize: function () {
        var version = '1.0.0';
        this.iframe = this.$el.find( '#api-frame' ).get( 0 );
        this.client = new Sketchfab( version, this.iframe );
        this.FPS = 15;

        this.uid = null;
        this.modelInfo = null;
        this.isAnimated = false;

        this._progressModel = new Backbone.Model( {
            isVisible: false,
            value: 0
        } );
        this._progressView = new ProgressView( {
            model: this._progressModel
        } );
    },

    onLoadSceneClick: function ( e ) {
        var picker = new SketchfabPicker();
        picker.pick( {
            success: function ( model ) {

                this.disableControls();

                if ( model.uid === this.uid ) {
                    this.initViewer( model.uid );
                }

                if ( model.uid ) {
                    router.navigate( 'model/' + model.uid, {
                        trigger: true
                    } );
                }

            }.bind( this )
        } );
    },

    initViewer: function ( urlid ) {

        this.uid = urlid;

        this.client.init( urlid, {
            overrideDevicePixelRatio: 1,
            camera: 0,
            success: function onSuccess( api ) {
                this.api = api;
                api.start();
                api.addEventListener( 'viewerready', function () {
                    api.getAnimations( function ( err, animations ) {
                        this.animations = animations;
                        this.onViewerReady();
                    }.bind( this ) );
                }.bind( this ) );
            }.bind( this ),
            error: function onError() {
                console.error( 'Viewer error' );
            }
        } );

        this.getModelInfo( urlid ).then(
            function ( response ) {
                this.modelInfo = response;
            }.bind( this ),
            function () {
                this.modelInfo = null;
            }.bind( this )
        );
    },

    getModelInfo: function ( urlid ) {
        return $.ajax( {
            url: 'https://api.sketchfab.com/v3/models/' + urlid,
            crossDomain: true,
            dataType: 'json',
            type: 'GET'
        } );
    },

    onViewerReady: function () {
        this.render();
    },

    render: function () {
        if ( this.animations.length > 0 ) {
            this.disableDuration();
        } else {
            this.enableDuration();
        }

        if ( this.api ) {
            this.enableControls();
        }
    },

    enableControls: function () {
        this.$el.find( '#options-panel' ).addClass( 'active' );
    },

    disableControls: function () {
        this.$el.find( '#options-panel' ).removeClass( 'active' );
    },

    enableDuration: function () {
        this.$el.find( '.field-duration' ).addClass( 'active' );
    },

    disableDuration: function () {
        this.$el.find( '.field-duration' ).removeClass( 'active' );
    },

    onRenderClick: function ( e ) {
        e.preventDefault();

        this._progressModel.set( 'isVisible', true );

        var isAnimated = this.animations.length > 0;
        var width = Math.floor( parseInt( this.$el.find( 'input[name="width"]' ).val() ) );
        var height = Math.floor( parseInt( this.$el.find( 'input[name="height"]' ).val() ) );
        var duration = isAnimated ? this.animations[ 0 ][ 2 ] : parseInt( this.$el.find( 'select[name="duration"]' ).val() );
        var output = this.$el.find( 'select[name="output"]' ).val();

        var options = {
            width: width,
            height: height,
            duration: duration,
            isAnimated: isAnimated,
            fps: this.FPS
        };

        if ( output === 'gif' ) {
            options.callback = function ( images ) {
                this.encodeGif( images, {
                    width: width,
                    height: height
                } );
            }.bind( this );
        } else if ( output === 'webm' ) {
            options.format = 'image/webp';
            options.fps = 30;
            options.callback = function ( images ) {
                this.encodeWebm( images, {
                    width: width,
                    height: height
                } );
            }.bind( this );
        }

        if ( isAnimated ) {
            this.api.setCurrentAnimationByUID( this.animations[ 0 ][ 0 ] );
        }
        var sequence = new window.ImageSequence( this.api, options );
        sequence.on( 'progress', function onProgress( progress ) {
            this._progressModel.set( 'value', progress.progress );
        }.bind( this ) );
        sequence.start();
    },

    encodeGif: function ( images, options ) {
        var fps = this.FPS;

        var gif = new GIF( {
            workers: 2,
            quality: 5,
            width: options.width,
            height: options.height
        } );
        var image;
        for ( var j = 0; j < images.length; j++ ) {
            gif.addFrame( images[ j ], {
                delay: 1 / fps
            } );
        }
        gif.on( 'finished', function ( blob ) {
            this.saveImage( blob, this.getFilename( '.gif' ) );
        }.bind( this ) );
        gif.render();
    },

    encodeWebm: function ( images, options ) {
        var blob = Whammy.fromImageArray( images, this.FPS );
        var url = URL.createObjectURL( blob );
        this.saveImage( blob, this.getFilename( '.webm' ) );
    },

    getFilename: function ( extension ) {
        if ( this.modelInfo !== null ) {
            return this.modelInfo.name.replace( /[^a-z0-9]/gi, '_' ).toLowerCase() + extension;
        } else {
            return 'scene' + extension;
        }
    },

    saveImage: function ( blob, filename ) {
        this._progressModel.set( 'isVisible', false );
        var hasSaveAs = !!window.saveAs;
        if ( hasSaveAs ) {
            saveAs( blob, filename );
        } else {
            var url = ( window.webkitURL || window.URL ).createObjectURL( blob );
            window.open( url );
        }
    },

    onPresetClick: function ( e ) {
        e.preventDefault();
        var target = $( e.currentTarget );
        this.$el.find( 'input[name="width"]' ).val( target.attr( 'data-width' ) );
        this.$el.find( 'input[name="height"]' ).val( target.attr( 'data-height' ) );
    }

} );
