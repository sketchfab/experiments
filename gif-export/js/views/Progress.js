var ProgressView = Backbone.View.extend( {
    el: '.progress',

    initialize: function () {
        this.listenTo( this.model, 'change', this.render.bind( this ) );
    },

    render: function () {
        if ( this.model.get( 'isVisible' ) ) {
            this.$el.addClass( 'active' );
        } else {
            this.$el.removeClass( 'active' );
        }

        var percentage = Math.floor( 100 * this.model.get( 'value' ) );

        var out = '';
        if ( percentage < 100 ) {
            out = [
                '<div>',
                '<span>' + percentage + '%</span>',
                '<div class="progress-bar"><span style="width:' + percentage + '%"></span></div>',
                '</div>'
            ].join( '' );
        } else {
            out = [
                '<div>',
                '<span>Encoding…</span>',
                '<div class="progress-bar"><span style="width:100%"></span></div>',
                '</div>'
            ].join( '' );
        }

        this.$el.html( out );
    }
} );
