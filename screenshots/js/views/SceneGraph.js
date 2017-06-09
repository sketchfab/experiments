'use strict';

var SceneGraphView = Backbone.View.extend( {

    el: '#scene-panel',

    events: {
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

    render: function () {

        if ( !this.api ) {
            return this;
        }

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
