'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require("backbone");
Backbone.$ = $;

var Router = require('./router');
var AppView = require('./views/App');

var appView = new AppView();
var router = new Router({appView: appView});
appView.router = router;
Backbone.history.start();
