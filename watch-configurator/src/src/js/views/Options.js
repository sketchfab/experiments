'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var OptionView = require('./Option');

var OptionsView = Backbone.View.extend({

    tagName: 'ul',

    events: {
        'click [data-id]': 'onOptionClick'
    },

    initialize: function(options) {
        this.options = options;
        this.model.on('change:selected', function() {
            this.render();
        }.bind(this));
        this.model.on('add remove', function() {
            this.render();
        }.bind(this));
    },

    render: function() {
        var self = this;
        this.$el.empty();
        this.model.each(function(model) {
            self.$el.append(new OptionView({
                model: model
            }).render().el);
        });
        return this;
    },

    onOptionClick: function(e) {
        var id = parseInt($(e.currentTarget).attr('data-id'), 10);
        this.model.each(function(model) {
            model.set('selected', model.get('id') === id);
        });
    }
});

module.exports = OptionsView;
