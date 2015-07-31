'use strict';

var _ = require('underscore');
var API = require('./API');
var config = require('../config');

var defaults = {
    'count': 24,
    'offset': null,

    'location': null,
    'skills': null,
    'sort_by': '-followerCount' // '-followerCount', '-modelCount'
};

var Sketchfab = {};

/** @namespace */
Sketchfab.Users = {

    /**
     * Get user by OAuth token
     * @param {string} token - OAuth2 token
     * @return Promise
     */
    me: function(token) {
        var headers = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return API.get('/v2/users/me', null, headers);
        //@TODO : this fails because preflight requests do not contain Authorization header
        // and server rejects them. Server should return 200 when header is missing
    },

    /**
     * Get users by params
     * @param {object} params - Filtering and sorting parameters
     *
     * @param {int} [params.count=24] - Number of results
     * @param {int} [params.offset] - Pagination offset
     * @param {string} [params.sort_by='-followerCount'] - Sorting field ['-followerCount', '-modelCount']
     *
     * @param {string} [params.location] - Location
     * @param {string} [params.skills] - Skills
     * @return Promise
     */
    all: function(params) {

        params = _.pick(_.defaults(params, defaults), _.keys(defaults));

        return API.get(config.USERS_ENDPOINT, params);
    },

    /**
     * Get user by id
     * @param {string} id - User id
     * @return Promise
     */
    byId: function(id) {
        return API.get(config.USERS_ENDPOINT + '/' + id);
    },

    /**
     * Get user by username. This method uses a private API. It might break in the future.
     * @param {string} username - Username
     * @return Promise
     */
    byUsername: function(username) {
        console.warn('Users.byUsername is not a public API. It might break in the future.');
        return API.get('/i/users/@' + username);
    },

    /**
     * Get users by location
     * @param {string} location - Location
     * @param {int} offset - Pagination offset
     * @return Promise
     */
    byLocation: function(location, offset) {
        return Sketchfab.Users.all({
            location: location,
            offset: offset
        });
    },

    /**
     * Get user by skills
     * @param {string} skills - Skill
     * @param {int} offset - Pagination offset
     * @return Promise
     */
    bySkills: function(skills, offset) {
        return Sketchfab.Users.all({
            skills: skills,
            offset: offset
        });
    }

};

module.exports = Sketchfab.Users;
