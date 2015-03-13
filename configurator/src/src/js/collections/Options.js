'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var OptionModel = require('../models/Option');

var OptionColletion = Backbone.Collection.extend({
    model: OptionModel
});

module.exports = OptionColletion;
