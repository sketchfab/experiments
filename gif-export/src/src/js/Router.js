'use strict';

var Backbone = require("backbone");

var Router = Backbone.Router.extend({
    routes: {
        '': 'search',
        'model/:urlid': 'generator'
    },

    initialize: function(options) {
        this.appView = options.appView;
    },

    search: function() {
        this.appView.goToSearch();
    },

    generator: function(urlid) {
        this.appView.goToGenerator(urlid);
    }
});

module.exports = Router;
