'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var config = require('../config.js');

var OptionView = Backbone.View.extend({
    tagName: 'li',

    initialize: function(options) {
        this.options = options;
    },

    render: function() {
        this.$el
            .attr('data-id', this.model.get('id'))
            .addClass(this.model.get('name'))
            .toggleClass('selected', this.model.get('selected'));
        return this;
    }
});

module.exports = OptionView;
