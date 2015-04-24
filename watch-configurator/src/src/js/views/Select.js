'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var config = require('../config.js');

var SelectView = Backbone.View.extend({
    events: {
        'change': 'onChange'
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
        var out = '<select>';
        this.model.each(function(model) {
            out += [
                '<option value="' + model.get('id') + '" ' + (model.get('selected') ? 'selected' : '') + '>',
                model.get('name').replace(config.OPTION_PREFIX, ''),
                '</option>'
            ].join('');
        });
        out += '</select>';
        this.$el.html(out);
        return this;
    },

    onChange: function(e) {
        var id = parseInt(this.$el.find('select').val(), 10);
        this.model.each(function(model) {
            model.set('selected', model.get('id') === id);
        });
    }
});

module.exports = SelectView;
