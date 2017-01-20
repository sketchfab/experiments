var vm = new Vue({
    el: '.app',

    data: {
        selectedTab: 'pick-search',
        q: '',
        url: '',
        search: {
            models: []
        }
    },

    methods: {
        selectTab: function( e ) {
            e.preventDefault();
            var id = e.currentTarget.getAttribute('href').replace('#','');
            this.selectedTab = id;
        },

        onUrlSubmit: function( e ) {
            e.preventDefault();
            var urlRegex = /https:\/\/sketchfab\.com\/models\/(\w+)/;
            var matches = this.url.match( urlRegex );
            if ( matches ) {
                getModel( matches[1] ).then( function( response) {
                    pickModel( response.data );
                } ).catch( function( error ){
                    console.error( error );
                    alert( "Error: Can not load this URL");
                } );
            } else {
                alert("This URL isn't a valid model URL. It should look like http://sketchfab.com/models/[UID]. Shortened URL are not supported.");
            }
        },

        onSearchResultClicked: function( e ) {
            pickModel( JSON.parse( JSON.stringify( e ) ) );
        },

        onSearchSubmit: function( e ) {
            e.preventDefault();
            search( this.q ).then( function( response ){
                this.search.models = response.data.results;
            }.bind( this ) ).catch(function( error ){
                console.log( 'Search error' );
            });
        }
    }
});

function search( q ) {
    var url = 'https://api.sketchfab.com/v3/search?sort_by=-likeCount&type=models&q=' + encodeURIComponent( q );
    return axios.get( url );
}

function getModel( uid ) {
    var url = 'https://api.sketchfab.com/v3/models/' + uid;
    return axios.get( url );
}

function pickModel( model ) {
    if ( window.opener ) {
        window.opener.postMessage( {
            source: 'sketchfab-model-picker',
            model: model
        }, '*' );
    }
    console.log( 'Selected model', model );
}
