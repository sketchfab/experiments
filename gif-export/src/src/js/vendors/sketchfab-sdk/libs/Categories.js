'use strict';

var _ = require('underscore');
var API = require('./API');
var config = require('../config');

var Sketchfab = {};

/** @namespace */
Sketchfab.Categories = {

    /**
     * Get categories
     * @return Promise
     */
    all: function() {
        return API.get(config.CATEGORIES_ENDPOINT);
    }

};

module.exports = Sketchfab.Categories;
