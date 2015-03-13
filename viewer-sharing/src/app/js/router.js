'use strict';

var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;
var _ = require('underscore');

var Router = Backbone.Router.extend({

    routes: {
        '' : 'index',
        'model/:urlid': 'model'
    },

    initialize: function(options) {
        this.appView = options.appView;
    },

    model: function(urlid) {

        var pos = urlid.indexOf('&');
        if ( pos !== -1 ) {
            urlid = urlid.substr(0, pos);
        }

        this.appView.viewModel(urlid);
    }
});

module.exports = Router;
