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
        this._options = new Options();

        var params = {
            urlid: getParameterByName('urlid'),
            prefix: getParameterByName('prefix')
        };

        // Collect embed params
        var embedParams = {};
        var embedParamNames = [
            'preload', 'tracking', 'autostart', 'autospin',
            'camera', 'ui_infos', 'desc_button', 'ui_watermark',
            'watermark', 'transparent', 'ui_controls', 'controls',
            'ui_related', 'ui_snapshots', 'ui_stop', 'stop_button'
        ];
        for (var i=0, l=embedParamNames.length; i<l; i++) {
            if ( getParameterByName(embedParamNames[i]) !== '' ) {
                embedParams[embedParamNames[i]] = getParameterByName(embedParamNames[i]);
            }
        }

        // Force continuous rendering
        embedParams.continuousRender = 1;

        this._embedParams = embedParams;
        console.log(this.embedParams);

        if (params.urlid === '') {
            new OptionsView({
                el: this.$el.find('.options'),
                model: this._options
            }).render();
        } else {
            config.OPTION_PREFIX = params.prefix;
            config.URLID = params.urlid;
            new SelectView({
                el: this.$el.find('.select'),
                model: this._options
            }).render();
        }

        this._options.on('change:selected', function() {
            this.render();
        }.bind(this));

        this.initViewer(this.initOptions.bind(this));

    },

    render: function() {
        var self = this;
        this._options.each(function(model){
            if (model.get('selected')) {
                self._api.show(model.get('id'));
            } else {
                if (model.get('name') !== 'composer layer') {
                    self._api.hide(model.get('id'));
                }
            }
        });
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
        }) );
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
            var first = true;
            var canBeHidden = false;
            for (var i = 0; i < keys.length; i++) {
                var node = nodes[keys[i]];
                console.log(node.name);
                canBeHidden = node.name
                                && node.name.indexOf(config.OPTION_PREFIX) !== -1
                                && (node.type === 'Geometry' || node.type === 'Group');
                if (canBeHidden) {
                    this._options.add(new OptionModel({
                        id: node.instanceID,
                        name: node.name,
                        selected: first
                    }));
                    if (first) {
                        first = false;
                    } else {
                        if (node.name !== 'composer layer') {
                            this._api.hide(node.instanceID);
                        }
                    }
                }
            }
        }.bind(this));
    }
});

module.exports = AppView;
