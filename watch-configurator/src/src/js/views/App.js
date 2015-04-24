'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var OptionModel = require('../models/Option');
var Options = require('../collections/Options');
var OptionsView = require('./Options');
var SelectView = require('./Select');
var config = require('../config.js');

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var AppView = Backbone.View.extend({

    el: 'body',

    initialize: function() {
        this._optionCollections = {};
        this._optionsViews = {};
        this._embedParams = {
            continuousRender: 1,
            preload: 1,
            ui_infos: 0,
            ui_controls: 0,
            ui_stop: 0,
            ui_watermark: 0,
            autospin: 0.1
        };

        this.initViewer(this.initOptions.bind(this));

    },

    render: function() {
        var self = this;

        var prefixes = Object.keys(this._optionCollections);
        var prefix;
        for (var i = 0; i < prefixes.length; i++) {
            prefix = prefixes[i];
            this._optionCollections[prefix].each(function(model) {
                if (model.get('selected')) {
                    self._api.show(model.get('id'));
                } else {
                    if (model.get('name') !== 'composer layer') {
                        self._api.hide(model.get('id'));
                    }
                }
            });
        }

        return this;
    },

    initViewer: function(callback) {
        var self = this;
        var iframe = this.$el.find('#api-frame').get(0);
        var version = '1.0.0';
        var urlid = config.URLID;
        var client = new Sketchfab(version, iframe);

        client.init(urlid, _.extend(this._embedParams, {
            success: function onSuccess(api) {
                self._api = api;
                api.start(function() {
                    api.addEventListener('viewerready', function() {
                        callback();
                    });
                });
            },
            error: function onError() {
                console.log('Error while initializing the viewer');
            }
        }));
    },

    initOptions: function() {
        this._api.getNodeMap(function(err, result) {

            if (err) {
                console.log('Error getting nodes');
                return;
            }
            console.log('Nodes', result);

            var nodes = result;
            var keys = Object.keys(result);

            var isOption;
            var prefix;
            var optionModel;
            for (var i = 0, l = config.OPTION_PREFIXES.length; i < l; i++) {

                prefix = config.OPTION_PREFIXES[i];
                this._optionCollections[prefix] = new Options();

                //Create collections from nodes
                for (var j = 0; j < keys.length; j++) {
                    var node = nodes[keys[j]];
                    isOption = node.name && (node.name.indexOf(prefix) !== -1) && (node.type === 'MatrixTransform');
                    if (isOption) {
                        optionModel = new OptionModel({
                            id: node.instanceID,
                            name: node.name,
                            selected: config.OPTION_DEFAULTS.indexOf(node.name) !== -1
                        });
                        console.log(node.instanceID + ' ' + node.name + ' ' + config.OPTION_DEFAULTS.indexOf(node.name));
                        this._optionCollections[prefix].add(optionModel);
                        if (!optionModel.get('selected')) {
                            this._api.hide(node.instanceID);
                        }
                    }
                }

                // Render views
                this._optionsViews[prefix] = new OptionsView({
                    model: this._optionCollections[prefix]
                }).render();
                if (prefix === 'option_bracelet_') {
                    $('.options').append('<h2>Choose band</h2>');
                }
                if (prefix === 'option_coque_') {
                    $('.options').append('<h2>Choose model</h2>');
                }
                $('.options').append(this._optionsViews[prefix].el);

                // Listen for changes
                this._optionCollections[prefix].on('change:selected', function() {
                    this.render();
                }.bind(this));

            }

        }.bind(this));
    }
});

module.exports = AppView;
