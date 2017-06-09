'use strict';

var ScreenshotUIView = Backbone.View.extend( {

    el: '#screenshot-panel',

    events: {
        'submit': 'onSubmit',
    },

    initialize: function () {
        this.api = null;
        this.hidden = [];
    },

    setApi: function ( api ) {
        this.api = api;
        this.render();
    },

    onSubmit: function ( e ) {
        e.preventDefault();

        var width = parseInt( this.$el.find( 'input[name="width"]' ).val(), 10 );
        var height = parseInt( this.$el.find( 'input[name="height"]' ).val(), 10 );

        width = Math.min( width, 4096 );
        height = Math.min( height, 4096 );

        this.trigger( 'requestScreenshot', {
            width: width,
            height: height
        } );
    }
} );
