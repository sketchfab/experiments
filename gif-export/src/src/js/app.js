'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require("backbone");
var AppView = require('./views/App');
var Router = require('./Router');

var appView = new AppView();
var router = new Router({
    appView: appView
});
Backbone.history.start();
