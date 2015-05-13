'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var OptionModel = require('../models/Option');
var config = require('../config.js');

var OptionColletion = Backbone.Collection.extend({
    model: OptionModel,

    comparator: function(model1, model2) {
        var index1 = config.OPTION_ORDER.indexOf(model1.get('name'));
        var index2 = config.OPTION_ORDER.indexOf(model2.get('name'));

        if (index1 === -1) {
            return 0;
        }

        if (index2 === -1) {
            return 0;
        }

        return index1 - index2;
    }
});

module.exports = OptionColletion;
