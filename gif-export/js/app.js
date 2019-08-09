(function(window) {
    'use strict';

    var appView = new AppView();
    var router = new Router({
        appView: appView
    });
    Backbone.history.start();

    window['startedSketchfabVideoExporter'] = true;
})(window);
