'use strict';

var Backbone = require("backbone");

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

module.exports = Router;
