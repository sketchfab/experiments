'use strict';

var _ = require("underscore");
var Backbone = require("backbone");
var parseQueryString = require('./utils/parseQueryString');

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

    generator: function(urlid, qs) {
        var params = {};
        if (qs) {
            params = _.defaults(parseQueryString(qs), {
                autostart: '0'
            });
        }

        this.appView.goToGenerator(urlid, {
            autostart: params.autostart === '1'
        });
    }
});

module.exports = Router;
