'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var getParameterByName = require('../utils/getParameterByName');

var SearchView = require('./Search');
var GeneratorView = require('./Generator');

var AppView = Backbone.View.extend({

    el: 'body',

    initialize: function() {
        this.currentView = null;
        var searchView = new SearchView({
            el: '.search'
        });
        this.generatorView = new GeneratorView({
            el: '.generator'
        });
        this.goToSearch();
    },

    goToView: function(view) {
        // if (this.currentView) {
        //     this.currentView.undelegateEvents();
        //     this.currentView.remove();
        // }

        // this.currentView = view;
    },

    goToSearch: function() {
        // this.goToView();
    },

    goToGenerator: function(urlid) {
        this.generatorView.loadModel(urlid);
    }

});

module.exports = AppView;
