Vue.component( 'search-item', {

    props: [ 'model' ],

    template: [
        '<div class="search-item" @click="onResultClicked" role="button">',
        '   <img :src="thumbnail" :alt="model.name" class="thumbnail">',
        '   <span class="title">{{ model.name }}</span>',
        '   <span class="username">by {{ model.user.displayName }}</span>',
        '</div>'
    ].join( '' ),

    computed: {
        thumbnail: function() {
            var thumbs = this.model.thumbnails.images.slice(0);
            thumbs.sort(function(a, b){
                return a.width - b.width;
            });
            var thumbnail = thumbs.reduce( function ( acc, current ) {
                if ( current.width >= 200 && acc === '' ) {
                    return current.url;
                } else {
                    return acc;
                }
            }, '' );
            return thumbnail;
        }
    },

    methods: {
        onResultClicked: function( e ) {
            e.preventDefault();
            this.$emit( 'select', this.model );
        },
    }
} );
