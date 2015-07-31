'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var SketchfabSDK = require('../vendors/sketchfab-sdk/Sketchfab');
var template = _.template(require('./Search.tpl'));

function getUid(str) {
    var modelUrlRegex = /https:\/\/sketchfab\.com\/models\/([^\/\?#]+)/;
    var matches = str.match(modelUrlRegex);
    return matches ? matches[1] : false;
}

var SearchView = Backbone.View.extend({
    events: {
        'submit': 'onSearch',
        'click .results-item': 'onResultClick'
    },

    initialize: function() {
        this.collection = new Backbone.Collection({
            model: Backbone.Model
        });
        this.listenTo(this.collection, 'reset', this.render.bind(this));
    },

    delegateEvents: function() {
        Backbone.View.prototype.delegateEvents.apply(this, arguments);

        this.onKeydownBound = this.onKeydown.bind(this);
        this.onDocumentClickBound = this.onDocumentClick.bind(this);

        $(document).on('keydown', this.onKeydownBound);
        $(document).on('click', this.onDocumentClickBound);
    },

    undelegateEvents: function() {
        Backbone.View.prototype.undelegateEvents.apply(this, arguments);
        $(document).off('keydown', this.onKeydownBound);
        $(document).off('click', this.onDocumentClickBound);
    },

    render: function() {
        var models = this.collection.toJSON();

        var images;
        for (var i = 0; i < models.length; i++) {
            images = _.sortBy(models[i].thumbnails.images, 'width');
            models[i].thumbnailUrl = images[1].url;
        }

        this.$el.find('.search-results').show();
        this.$el.find('.search-results').html(template({
            models: models
        }));
    },

    startLoading: function() {
        this.$el.find('.loading').text('•••');
    },

    endLoading: function() {
        this.$el.find('.loading').text('');
    },

    search: function search(query) {
        return new Promise(function(resolve, reject) {

            if (query.length > 10) {
                var uid = getUid(query);
                if (uid) {
                    query = uid;
                }
            }

            SketchfabSDK.Model.byId(query).then(
                function(model) {
                    resolve([model]);
                },
                function() {
                    SketchfabSDK.Models.models({
                        search: query,
                        sort_by: '-likeCount'
                    }).then(
                        function(response) {
                            resolve(response.results)
                        },
                        reject
                    );
                }
            );
        });
    },

    onSearch: function onSearch(e) {
        e.preventDefault();
        var $q = this.$el.find('[name="q"]');
        var query = $q.val();

        this.startLoading();

        this.collection.reset([]);

        this.search(query).then(
            function(models) {
                this.endLoading();
                if (models.length) {
                    this.collection.reset(models);
                } else {
                    console.info('No results');
                }
            }.bind(this),
            function() {
                console.error('Error while searching');
                this.endLoading();
            }.bind(this)
        );
    },


    closeSearchResults: function() {
        this.$el.find('.search-results').empty();
        this.$el.find('.search-results').hide();
    },

    onResultClick: function(e) {
        this.$el.find('[name="q"]').val('');
        this.closeSearchResults();
    },

    onKeydown: function(e) {
        if (e.which === 27) {
            this.closeSearchResults();
        }
    },
    onDocumentClick: function(e) {
        if ($(e.target).parents('.search-inner').length === 0) {
            this.closeSearchResults();
        }
    }
});

module.exports = SearchView;
