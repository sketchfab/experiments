'use strict';

var sanitizeFilename = function ( s ) {
    return s.replace( /[^a-z0-9]/gi, '_' ).toLowerCase();
}

var AppView = Backbone.View.extend( {

    el: '.app',

    events: {
        'submit .form-load': 'onLoadModelClick',
        'submit .form-options': 'onTakeScreenshotClick',
    },

    initialize: function () {
        var version = '1.0.0';
        this.iframe = this.$el.find( '#viewer-frame' ).get( 0 );
        this.client = new Sketchfab( version, this.iframe );
        this.filename = 'screenshot.png';

        this._renderingOptionsView = new RenderingOptionsView();
        this._sceneGraphView = new SceneGraphView();
    },

    onLoadModelClick: function ( e ) {
        e.preventDefault();
        var urlid = $.trim( this.$el.find( 'input[name="urlid"]' ).val() );
        var transparent = this.$el.find( 'input[name="transparent"]' ).is( ':checked' );
        this.initViewer( urlid, transparent );
    },

    initViewer: function ( urlid, transparent ) {
        this.client.init( urlid, {
            overrideDevicePixelRatio: 1,
            camera: 0,
            transparent: transparent ? 1 : 0,
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
                this.filename = sanitizeFilename( response.name ) + '.png';
            }.bind( this ),
            function () {
                //Can't find model info
            }.bind( this )
        );
    },

    getModelInfo: function ( urlid ) {
        return $.ajax( {
            url: 'https://api.sketchfab.com/v2/models/' + urlid,
            crossDomain: true,
            dataType: 'json',
            type: 'GET'
        } );
    },

    onViewerReady: function () {
        this.enableControls();
    },

    enableControls: function () {
        this._renderingOptionsView.setApi( this.api );
        this._sceneGraphView.setApi( this.api );

        this.$el.find( '.options' ).addClass( 'active' );
    },

    disableControls: function () {
        this.$el.find( '.options' ).removeClass( 'active' );
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
            this.api.getScreenShot( width, width * ( width / height ), 'image/png', function ( err, result ) {
                this.resizeViewer( '100%', '100%' );
                this.hideProgress();
                this.enableControls();
                this.saveImage( result );
            }.bind( this ) );
        }.bind( this ), 1000 );
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

    onTakeScreenshotClick: function ( e ) {
        e.preventDefault();
        var width = parseInt( this.$el.find( 'input[name="width"]' ).val(), 10 );
        var height = parseInt( this.$el.find( 'input[name="height"]' ).val(), 10 );

        width = Math.min( width, 4096 );
        height = Math.min( height, 4096 );

        this.takeScreenshot( width, height );
    }
} );
