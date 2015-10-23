'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var config = require('../config.js');

var tplInfo = require('../templates/info.tpl');
var tplTextures = require('../templates/textures.tpl');

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var AppView = Backbone.View.extend({

    el: 'body',

    events: {
        'click li[data-id]': 'toggle'
    },

    initialize: function() {
        this._optionCollections = {};
        this._optionsViews = {};
        this._embedParams = {
            continuousRender: 1,
            preload: 1,
            ui_infos: 0,
            ui_stop: 0,
            debug3d: 1
        };

        this.urlid = getParameterByName('urlid');
        if (!this.urlid) {
            return;
        }

        this.initViewer(this.initOptions.bind(this));

        this.hidden = [];

    },

    initViewer: function(callback) {
        var self = this;
        var iframe = this.$el.find('#api-frame').get(0);
        var version = '1.0.0';

        var client = new Sketchfab(version, iframe);

        client.init(this.urlid, _.extend(this._embedParams, {
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

        this.getModelInfo();
        this.getTextures();
    },

    toggle: function(e) {
        e.stopPropagation();
        var $target = $(e.currentTarget);

        console.log($target.attr('data-id'), $target.find('span').first().text());

        var id = parseInt($target.attr('data-id'), 10);

        if (this.hidden[id]) {
            this._api.show(id);
            this.hidden[id] = false;
            console.log('Show', id);
            $target.removeClass('hidden');
        } else {
            this._api.hide(id);
            this.hidden[id] = true;
            $target.addClass('hidden');
            console.log('Hide', id);
        }
    },

    initOptions: function() {

        this._api.getSceneGraph(function(err, result) {

            if (err) {
                console.log('Error getting nodes');
                return;
            }

            console.log(result);

            function renderChildren(node) {
                var nodes = [];
                for (var i = 0, l = node.children.length; i < l; i++) {
                    nodes.push(renderNode(node.children[i]));
                }
                return '<ul>' + nodes.join('') + '</ul>';
            }

            function renderNode(node) {

                var icons = {
                    'Group': 'ion-folder',
                    'Geometry': 'ion-document',
                    'MatrixTransform': 'ion-arrow-expand'
                }

                var out = '';

                out += '<li data-type="' + node.type + '" data-id="' + node.instanceID + '">';

                out += '<i class="icon ' + icons[node.type] + '" title="' + node.type + '"></i> ';

                out += '<span>' + (node.name ? node.name : ('(' + node.type + ')')) + '</span>';

                if (node.children && node.children.length) {
                    out += renderChildren(node);
                }

                out += '</li>';

                return out;
            }

            var out = '<ul>' + renderNode(result) + '</ul>';
            $('.objects').html(out);

        }.bind(this));
    },

    getTextures: function() {

        var template = _.template(tplTextures);

        $.ajax({
            url: 'https://sketchfab.com/i/models/' + this.urlid + '/textures',
            success: function(response) {

                // Convert bits to human-readable unit
                function humanSize(size) {
                    var suffixes = ['b', 'KiB', 'MiB', 'GiB'];

                    for (var i = 0; i < suffixes.length; i++, size /= 1024) {
                        if (size < 1024) {
                            return Math.floor(size) + ' ' + suffixes[i];
                        }
                    }
                    return Math.floor(size) + ' ' + suffixes[suffixes.length - 1];
                }

                var textures = response.results;
                for (var i = 0; i < textures.length; i++) {
                    for (var j = 0; j < textures[i].images.length; j++) {
                        if (textures[i].images[j].width === 32) {
                            textures[i].preview = textures[i].images[j].url;
                        }
                    }
                }

                var textures = {};
                textures.count = response.results.length;

                var texture;
                var textureSize;
                var maxTextureSize;
                var sumTextureSize = 0;
                for (var i = 0; i < response.results.length; i++) {

                    texture = response.results[i];

                    maxTextureSize = 0;
                    for (var j = 0; j < texture.images.length; j++) {
                        textureSize = texture.images[j].width * texture.images[j].height;
                        if (textureSize > maxTextureSize) {
                            maxTextureSize = textureSize;
                        }
                        sumTextureSize += maxTextureSize;
                    }
                }
                textures.pixelCount = sumTextureSize;
                textures.vram = humanSize(sumTextureSize * 4);


                $('.textures').html(template({
                    textures: textures
                }));
            }
        });
    },

    getModelInfo: function() {

        var template = _.template(tplInfo);

        $.ajax({
            url: 'https://sketchfab.com/i/models/' + this.urlid,
            success: function(response) {

                var info = _.clone(response);
                info.materialsCount = (_.keys(info.options.materials)).length;
                $('.info').html(template({
                    info: info
                }));
            }
        });

    }
});

module.exports = AppView;
