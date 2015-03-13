'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var OptionModel = Backbone.Model.extend({
    defaults: {
        "selected":  false
    }
});

module.exports = OptionModel;
