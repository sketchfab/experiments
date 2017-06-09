'use strict';

var RenderingOptionsView = Backbone.View.extend( {

    el: '#rendering-panel',

    events: {
        'change input[name="postprocessing"]': 'onPostProcessingChange',
        'change #settings-fov': 'onFovChange',
        'click [data-action="exportCamera"]': 'onExportCameraClick',
        'click [data-action="importCamera"]': 'onImportCameraClick',
    },

    initialize: function ( options ) {
        this.api = null;
    },

    setApi: function ( api ) {
        this.api = api;

        this.api.getPostProcessing( function ( settings ) {
            if ( settings.enable ) {
                $( 'input[name="postprocessing"]' ).prop( 'checked', settings.enable );
            }
        } );
    },

    onPostProcessingChange: function ( e ) {

        if ( !this.api ) {
            return;
        }

        this.api.setPostProcessing( {
            enable: $( e.target ).is( ':checked' ),
        } );
    },

    onFovChange: function ( e ) {

        if ( !this.api ) {
            return;
        }

        var fov = Math.min( Math.max( 1, $( e.target ).val() ), 179 );
        this.api.setFov( fov );
    },

    onExportCameraClick: function ( e ) {
        e.preventDefault();

        if ( !this.api ) {
            return;
        }

        this.api.getCameraLookAt( function ( err, camera ) {
            this._camera = camera;
            var win = window.open( '', 'camera-export' );
            win.document.write( '<pre>' + JSON.stringify( this._camera, null, 4 ) + '</pre>' );
        } );
    },

    onImportCameraClick: function ( e ) {
        e.preventDefault();

        if ( !this.api ) {
            return;
        }

        var camera;
        try {
            camera = JSON.parse( window.prompt() );
        } catch ( e ) {
            alert( 'Camera is not valid' );
            return;
        }

        if ( camera.position && camera.target ) {
            this.api.setCameraLookAt(
                camera.position,
                camera.target,
                0.1
            );
        }
    },
} );
