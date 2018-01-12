'use strict';

var AppView = Backbone.View.extend( {

    el: '.app',

    events: {
        'click #load-scene': 'onLoadSceneClick',
        'mouseover #load-scene': 'renderFrame',
        'change input[name="width"]': 'resizeFrame',
        'change input[name="height"]': 'resizeFrame',
        'change input[name="transparent"]': 'onTransparencyChange'
    },

    initialize: function () {
        var version = '1.0.0';
        this.iframe = this.$el.find( '#api-frame' ).get( 0 );
        this.client = new Sketchfab( version, this.iframe );
        this.uid = null;
        this.filename = 'screenshot.png';

        this._sceneView = new SceneUIView();
        this._screenshotView = new ScreenshotUIView();

        this.listenTo( this._screenshotView, 'requestScreenshot', function ( options ) {
            this.takeScreenshot( options.width, options.height );
        }.bind( this ) );

        this.resizeFrame();
        this.disableControls();

        $( window ).on( 'resize', _.debounce( function () {
            this.resizeFrame();
        }.bind( this ), 100 ) );
    },

    onTransparencyChange: function ( e ) {
        if ( this.uid ) {
            this.initViewer( this.uid );
        }
    },

    onLoadSceneClick: function ( e ) {
        var picker = new SketchfabPicker();
        picker.pick( {
            success: function ( model ) {

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

    initViewer: function ( urlid, params ) {

        if (typeof params === 'undefined') {
            params = {};
        }

        this.uid = urlid;
        this.disableControls();

        var isTransparent = this.$el.find( 'input[name="transparent"]' ).is( ':checked' );

        if (params.width || params.height) {
            if (params.width) {
                this.$el.find( 'input[name="width"]' ).val(params.width);
            }

            if (params.height) {
                this.$el.find( 'input[name="height"]' ).val(params.height);
            }
            this.resizeFrame();
        }

        this.client.init( urlid, {
            camera: 0,
            image_compression: 0,
            internal: 1,
            overrideDevicePixelRatio: 1,
            transparent: isTransparent ? 1 : 0,
            success: function onSuccess( api ) {
                this.api = api;
                api.start();
                api.addEventListener( 'viewerready', function () {
                    this.onViewerReady();
                }.bind( this ) );
            }.bind( this ),
            error: function onError() {
                console.error( 'Viewer error' );
            }
        } );

        this.getModelInfo( urlid ).then(
            function ( response ) {
                if (params.useUidFilename === true) {
                    this.filename = urlid + '.png';
                } else {
                    this.filename = this.sanitizeFilename( response.name ) + '.png';
                }
            }.bind( this ),
            function () {
                //Can't find model info
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
        this._sceneView.setApi( this.api );
        this._screenshotView.setApi( this.api );
        this.enableControls();
    },

    enableControls: function () {
        this.$el.find( '#screenshot-panel' ).addClass( 'active' );
        this.$el.find( '#scene-panel' ).addClass( 'active' );
    },

    disableControls: function () {
        this.$el.find( '#screenshot-panel' ).removeClass( 'active' );
        this.$el.find( '#scene-panel' ).removeClass( 'active' );
    },

    showProgress: function () {
        this.$el.find( '.loader' ).addClass( 'active' );
    },

    hideProgress: function () {
        this.$el.find( '.loader' ).removeClass( 'active' );
    },

    resizeViewer: function ( width, height ) {
        var $viewer = $( this.iframe );
        $viewer.css( {
            width: width,
            height: height
        } );
    },

    takeScreenshot: function ( width, height ) {

        this.showProgress();
        this.resizeViewer( width + 'px', height + 'px' );
        this.disableControls();

        setTimeout( function () {
            this.api.getScreenShot( width, height, 'image/png', function ( err, result ) {
                this.resizeFrame();
                this.hideProgress();
                this.enableControls();
                this.saveImage( result );
            }.bind( this ) );
        }.bind( this ), 1000 );
    },

    sanitizeFilename: function ( s ) {
        return s.replace( /[^a-z0-9]/gi, '_' ).toLowerCase();
    },

    saveImage: function ( b64Image ) {
        var image_data = atob( b64Image.split( ',' )[ 1 ] );
        var arraybuffer = new ArrayBuffer( image_data.length );
        var view = new Uint8Array( arraybuffer );
        for ( var i = 0; i < image_data.length; i++ ) {
            view[ i ] = image_data.charCodeAt( i ) & 0xff;
        }
        var blob = new Blob( [ arraybuffer ], {
            type: 'image/png'
        } );

        var hasSaveAs = !!window.saveAs;

        if ( hasSaveAs ) {
            saveAs( blob, this.filename );
        } else {
            var url = ( window.webkitURL || window.URL ).createObjectURL( blob );
            window.open( url );
        }
    },

    resizeFrame: function () {
        var $viewport = this.$el.find( '.viewer' );
        var $frame = this.$el.find( '#api-frame' );

        var width = parseInt( this.$el.find( 'input[name="width"]' ).val(), 10 );
        var height = parseInt( this.$el.find( 'input[name="height"]' ).val(), 10 );
        var ratio = width / height;

        var viewportWidth = $viewport.width();
        var viewportHeight = $viewport.height();
        var viewportRatio = viewportWidth / viewportHeight;

        if ( ratio < viewportRatio ) {
            $frame.css( {
                width: Math.floor( viewportHeight * ratio ),
                height: viewportHeight
            } );
        } else {
            $frame.css( {
                width: viewportWidth,
                height: Math.floor( viewportWidth / ratio )
            } );
        }
    }
} );
