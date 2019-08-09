(function(window) {
    'use strict';
    
    var Router = window['Backbone'].Router.extend({
        routes: {
            '': 'index',
            'model/:urlid': 'screenshot'
        },

        initialize: function(options) {
            this.appView = options.appView;
        },

        index: function() {},

        screenshot: function(urlid) {
            this.appView.initViewer(urlid, false);
        }
    });

    window['Router'] = Router;
})(window);
