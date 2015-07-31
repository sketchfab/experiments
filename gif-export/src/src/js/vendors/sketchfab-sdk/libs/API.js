'use strict';

var $ = require('jquery');
var _ = require('underscore');
var config = require('../config');

//Use CORS proxy
// $.ajaxPrefilter(function(options) {
//     if (options.crossDomain && $.support.cors) {
//         options.url = 'https://furious-stream-4406.herokuapp.com/' + options.url;
//     }
// });

var API = {

    get: function( path, params, headers ) {

        params = _.pick(_.defaults(params, {}), _.identity); // Prune empty params
        headers = _.defaults(headers, {});

        return $.ajax({
            type: 'GET',
            url: config.BASE_API_URL + path,
            data: params,
            headers: headers,
            crossDomain: true
        });
    },

};

module.exports = API;
