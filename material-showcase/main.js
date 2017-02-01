( function () {
    'use strict';

    // globals
    var $ = window.$;

    var model = 'https://sketchfab.com/models/93166cb1877f4895a91411334460898b/embed?material_showcase=1&autostart=1';
    var materials = {};
    var domain = 'https://sketchfab-labs.s3.amazonaws.com/';

    function start() {
        var html = '<iframe width="640" height="480" src="' + model + '" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" onmousewheel=""></iframe>';

        var iframe = html;
        $( '.iframe' ).append( iframe );
    }

    function applyMaterial( id ) {
        var iframeURL = model + '#material_showcase=1,' + materials[ id ].params;
        $( 'iframe' ).attr( 'src', iframeURL );
    }

    function resolveLink( id, callback ) {
        var material = materials[ id ];

        if (material.link === undefined) {
            $.get( materials[id].linkFile ).then(function(response){
                var matches = response.match(/https+:\/\/\S+/);
                if (matches.length) {
                    var link = matches[0];
                    material.link = link;
                    callback(link);
                } else {
                    callback(null);
                }
            }, function(error){
                console.error(error);
                callback(null);
            });
        } else {
            callback(material.link);
        }
    }

    function renderMaterialList() {
        var out = '';
        Object.keys( materials ).forEach( function ( materialName ) {
            if (materials[materialName].thumbnail) {
                out += '<li class="material" data-material="' + materialName + '"><img src="' + materials[materialName].thumbnail + '" alt="' + materialName + '"></li>';
            } else {
                out += '<li class="material" data-material="' + materialName + '"><span>' + materialName + '</span></li>';
            }
        });
        $( '.materials' ).html(out);
    }

    function onLoadingStart() {
        $('.loading').addClass('active');
    }

    function onLoadingStop() {
        $('.loading').removeClass('active');
    }

    function fetchMaterials() {
        var url = domain + '?prefix=materials';
        return $.get( url )
            .done( function ( materialListXML ) {
                var filesXML = $( materialListXML ).find( 'Key' );
                for ( var i = 0, l = filesXML.length; i < l; i++ ) {
                    var element = filesXML[ i ];
                    var file = $( element ).text();

                    var split = file.split( '/' );

                    // materials / materialName / file
                    if ( split.length < 3 ) continue;

                    var dir = split[ 1 ];
                    if ( !materials[ dir ] ) {
                        materials[ dir ] = [];
                    }
                    materials[ dir ].push( domain + file );
                }

                Object.keys( materials ).forEach( function ( materialName ) {
                    var files = materials [ materialName ];
                    var urlParams = [];
                    var hasAO = false;
                    var hasNormal = false;
                    files.forEach( function ( file ) {
                        if ( file.match( 'Base_Color' ) ) {
                            urlParams.push( 'material_diffuse=' + file );
                            return;
                        }

                        if ( file.match( 'Metallic' ) ) {
                            urlParams.push( 'material_metalness=' + file );
                            return;
                        }

                        if ( file.match( 'Ambient_Occlusion' ) ) {
                            urlParams.push( 'material_cavity=' + file );
                            hasAO = true;
                            return;
                        }

                        if ( file.match( 'Normal' ) ) {
                            urlParams.push( 'material_normal=' + file );
                            hasNormal = true;
                            return;
                        }

                        if ( file.match( 'Roughness' ) ) {
                            urlParams.push( 'material_roughness=' + file );
                            return;
                        }

                        if ( file.match( 'Thumbnail.jpg' ) ) {
                            materials [ materialName ][ 'thumbnail' ] = file;
                        }

                        if ( file.match(/\.url$/)) {
                            materials[materialName]['linkFile'] = file;
                        }

                    } );

                    if ( !hasAO )
                        urlParams.push( 'material_cavity=' );
                    if ( !hasNormal )
                        urlParams.push( 'material_normal=' );

                    materials [ materialName ][ 'params' ] = urlParams.join( ',' );
                });

                console.log( Object.keys( materials ).length + ' materials loaded');
                console.log( materials);
            });
    }

    $(function(){
        $('.materials').on('click', '.material', function(e){
            e.preventDefault();
            var $target = $(e.currentTarget);
            var materialId = $target.attr('data-material');
            applyMaterial( materialId );
            resolveLink( materialId, function(link){
                var out = '<h1>' + materialId + '</h1>';
                if (link) {
                    out += '<a href="' + link + '" target="_blank">Download on Substance Share</a>';
                }
                $('.material-selected').html(out);
            } );
            onLoadingStart();
            setTimeout(onLoadingStop, 1000);
        });

        start();
        fetchMaterials().then(function(){
            renderMaterialList();
        });
    });

} )();
