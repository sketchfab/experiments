'use strict';

var Router = Backbone.Router.extend({
    routes: {
        '': 'index'
    },

    initialize: function(options) {
        this.appView = options.appView;
    },

    index: function() {

    },
});
