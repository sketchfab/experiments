'use strict';

var SceneUIView = Backbone.View.extend( {

    el: '#scene-panel',

    events: {
        'change input[name="postprocessing"]': 'onPostProcessingChange',
        'change #settings-fov': 'onFovChange',
        'click [data-action="exportCamera"]': 'onExportCameraClick',
        'click [data-action="importCamera"]': 'onImportCameraClick',
        'click li[data-id]': 'toggleNode',
    },

    initialize: function () {
        this.api = null;
        this.hidden = [];
    },

    setApi: function ( api ) {
        this.api = api;
        this.render();
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

        if ( camera && camera.position && camera.target ) {
            this.api.setCameraLookAt(
                camera.position,
                camera.target,
                0.1
            );
        }
    },

    render: function () {

        if ( !this.api ) {
            return this;
        }

        this.api.getPostProcessing( function ( settings ) {
            if ( settings.enable ) {
                $( 'input[name="postprocessing"]' ).prop( 'checked', settings.enable );
            }
        } );

        this.api.getSceneGraph( function ( err, result ) {

            if ( err ) {
                console.log( 'Error getting nodes' );
                return;
            }

            console.log( result );

            function renderChildren( node ) {
                var nodes = [];
                for ( var i = 0, l = node.children.length; i < l; i++ ) {
                    nodes.push( renderNode( node.children[ i ] ) );
                }
                return '<ul>' + nodes.join( '' ) + '</ul>';
            }

            function renderNode( node ) {

                var icons = {
                    'Group': 'fa fa-folder',
                    'Geometry': 'fa fa-cube',
                    'MatrixTransform': 'fa fa-arrows-alt'
                }

                var out = '';

                out += '<li data-type="' + node.type + '" data-id="' + node.instanceID + '">';

                out += '<i class="icon ' + icons[ node.type ] + '" title="' + node.type + '"></i> ';

                out += '<span>' + ( node.name ? node.name : ( '(' + node.type + ')' ) ) + '</span>';

                if ( node.children && node.children.length ) {
                    out += renderChildren( node );
                }

                out += '</li>';

                return out;
            }

            var out = '<ul>' + renderNode( result ) + '</ul>';
            this.$el.find( '.objects' ).html( out );

        }.bind( this ) );

        return this;
    },

    toggleNode: function ( e ) {

        if ( !this.api ) {
            return this;
        }

        e.stopPropagation();
        var $target = $( e.currentTarget );

        var id = parseInt( $target.attr( 'data-id' ), 10 );

        if ( this.hidden[ id ] ) {
            this.api.show( id );
            this.hidden[ id ] = false;
            $target.removeClass( 'hidden' );
        } else {
            this.api.hide( id );
            this.hidden[ id ] = true;
            $target.addClass( 'hidden' );
        }
    },
} );
