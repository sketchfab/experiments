'use strict';

/**
 * https://gist.github.com/Manc/9409355
 * Convert a URL or just the query part of a URL to an
 * object with all keys and values.
 * Usage examples:
 *   // Get "GET" parameters from current request as object:
 *   var parameters = parseQueryString(window.location.search);
 */
function parseQueryString(query) {
    var obj = {},
        qPos = query.indexOf('?'),
        tokens = query.substr(qPos + 1).split('&'),
        i = tokens.length - 1;
    if (qPos !== -1 || query.indexOf('=') !== -1) {
        for (; i >= 0; i--) {
            var s = tokens[i].split('=');
            obj[unescape(s[0])] = s.hasOwnProperty(1) ? unescape(s[1]) : null;
        }
    }
    return obj;
}

function isValidDimension(value) {
    var numberValue = parseInt(value, 10);
    return (!isNaN(numberValue) && numberValue > 0);
}

var Router = Backbone.Router.extend({
    routes: {
        '': 'index',
        'model/:urlid': 'screenshot'
    },

    initialize: function(options) {
        this.appView = options.appView;
    },

    index: function() {},

    screenshot: function(urlid, queryString) {

        var params = {
            width: 1920,
            height: 1080,
            useUidFilename: false
        };

        if (queryString) {
            var parsedQueryString = parseQueryString(queryString);
            if (parsedQueryString.width && isValidDimension(parsedQueryString.width)) {
                params.width = parseInt(parsedQueryString.width, 10);
            }
            if (parsedQueryString.height && isValidDimension(parsedQueryString.height)) {
                params.height = parseInt(parsedQueryString.height, 10);
            }
            if (parsedQueryString.useUidFilename && parsedQueryString.useUidFilename === '1') {
                params.useUidFilename = true;
            }
        }

        this.appView.initViewer(urlid, params);
    }
});
