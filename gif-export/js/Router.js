'use strict';

var Router = Backbone.Router.extend( {
    routes: {
        '': 'index',
        'model/:urlid': 'screenshot'
    },

    initialize: function ( options ) {
        this.appView = options.appView;
    },

    index: function () {

    },

    screenshot: function ( urlid ) {
        this.appView.initViewer( urlid, false );
    }
} );
