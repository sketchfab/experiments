'use strict';

var API = require('./API');
var config = require('../config');

var Sketchfab = {};

/** @namespace */
Sketchfab.Model = {

    /**
     * Get model by id
     * @param {string} id - Model id
     * @return Promise
     */
    byId: function(id) {
        return API.get(config.MODELS_ENDPOINT + '/' + id);
    },

    /**
     * Get annotations for model. This method uses a private API. It might break in the future.
     * @param {string} id - Model id
     * @return Promise
     */
    annotations: function(id) {
        console.warn('Model.annotations is not a public API. It might break in the future.');
        return API.get('/i/models/' + id + '/hotspots');
    },

    /**
     * Get textures for model. This method uses a private API. It might break in the future.
     * @param {string} id - Model id
     * @return Promise
     */
    textures: function(id) {
        console.warn('Model.textures is not a public API. It might break in the future.');
        return API.get('/i/models/' + id + '/textures');
    },

    /**
     * Get comments for model. This method uses a private API. It might break in the future.
     * @param {string} id - Model id
     * @param {int} offset - Pagination offset
     * @return Promise
     */
    comments: function(id, offset) {
        console.warn('Model.comments is not a public API. It might break in the future.');
        return API.get(config.COMMENTS_ENDPOINT, {
            model: id,
            offset: offset
        });
    }

};

module.exports = Sketchfab.Model;
