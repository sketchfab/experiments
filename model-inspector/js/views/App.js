'use strict';

var tplInfo = `
<ul class="stat">
    <li>
        <span class="field">Vertices</span>
        <span class="value"><%= info.vertexCount %></span>
    </li>
    <li>
        <span class="field">Faces</span>
        <span class="value"><%= info.faceCount %></span>
    </li>
    <li>
        <span class="field">Renderer</span>
        <span class="value"><%= info.options.shading.renderer %></span>
    </li>
    <li>
        <span class="field">Materials</span>
        <span class="value"><%= info.materialsCount %></span>
    </li>
</ul>
`;
var tplTextures = `
<ul class="stat">
    <li>
        <span class="field">Textures</span>
        <span class="value"><%= textures.count %></span>
    </li>
    <li>
        <span class="field">Total Pixels</span>
        <span class="value"><%= textures.pixelCount %></span>
    </li>
    <li>
        <span class="field">VRAM</span>
        <span class="value"><%= textures.vram %></span>
    </li>
</ul>
`;

var AppView = Backbone.View.extend({
    el: 'body',

    events: {
        'click li[data-id]': 'toggle',
        'click [name="load-model"]': 'loadModel',
        'change input[name="postprocessing"]': 'onPostProcessingChange'
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

        this.initViewer(
            function() {
                this.initOptions();
                this.initPostProcessing();
            }.bind(this)
        );

        this.hidden = [];
    },

    loadModel: function() {
        var picker = new SketchfabPicker();
        picker.pick({
            success: function(model) {
                console.log(model);
                var location = window.location;
                var url = location.protocol + '//' +location.host + location.pathname + '?urlid=' + model.uid
                window.location = url;
            }.bind(this)
        });
    },

    initViewer: function(callback) {
        var self = this;
        var iframe = this.$el.find('#api-frame').get(0);
        var version = '1.0.0';

        var client = new Sketchfab(version, iframe);

        client.init(
            this.urlid,
            _.extend(this._embedParams, {
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
            })
        );

        this.getModelInfo();
        this.getTextures();
    },

    toggle: function(e) {
        e.stopPropagation();
        var $target = $(e.currentTarget);

        console.log(
            $target.attr('data-id'),
            $target
                .find('span')
                .first()
                .text()
        );

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
        this._api.getSceneGraph(
            function(err, result) {
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
                        Group: 'ion-folder',
                        Geometry: 'ion-document',
                        MatrixTransform: 'ion-arrow-expand'
                    };

                    var out = '';

                    out += '<li data-type="' + node.type + '" data-id="' + node.instanceID + '">';

                    out +=
                        '<i class="icon ' + icons[node.type] + '" title="' + node.type + '"></i> ';

                    out += '<span>' + (node.name ? node.name : '(' + node.type + ')') + '</span>';

                    if (node.children && node.children.length) {
                        out += renderChildren(node);
                    }

                    out += '</li>';

                    return out;
                }

                var out = '<ul>' + renderNode(result) + '</ul>';
                $('.objects').html(out);
            }.bind(this)
        );
    },

    getTextures: function() {
        var template = _.template(tplTextures);

        $.ajax({
            url: 'https://sketchfab.com/i/models/' + this.urlid + '/textures',
            success: function(response) {
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

                $('.textures').html(
                    template({
                        textures: textures
                    })
                );
            }
        });
    },

    getModelInfo: function() {
        var template = _.template(tplInfo);

        $.ajax({
            url: 'https://sketchfab.com/i/models/' + this.urlid,
            success: function(response) {
                var info = _.clone(response);
                info.materialsCount = _.keys(info.options.materials).length;
                $('.info').html(
                    template({
                        info: info
                    })
                );
            }
        });
    },

    initPostProcessing: function() {
        var out = '<ul>';

        this._api.getPostProcessing(function(settings) {
            // settings.enable

            if (settings.enable) {
                $('input[name="postprocessing"]').prop('disabled', false);
            }

            out += [
                settings.sharpenEnable ? '<li>Sharpen</li>' : '',
                settings.chromaticAberrationEnable ? '<li>Chromatic Aberration</li>' : '',
                settings.vignetteEnable ? '<li>Vignette</li>' : '',
                settings.bloomEnable ? '<li>Bloom</li>' : '',
                settings.toneMappingEnable ? '<li>Tone Mapping</li>' : '',
                settings.colorBalanceEnable ? '<li>Color Balance</li>' : ''
            ].join('');
            out += '</ul>';

            $('.postprocessing-settings').html(out);
        });
    },

    onPostProcessingChange: function(e) {
        this._api.setPostProcessing({
            enable: $(e.target).is(':checked')
        });
    }
});
