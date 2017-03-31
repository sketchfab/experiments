'use strict';

var startButton = document.querySelector( '#start-button' );
var viewer = document.querySelector( '#viewer' );
var modelInput = document.querySelector( '#model' );

var recognizer;
var clientApi;

var loadModel = function ( callback ) {

    var modelId = modelInput.value;
    var client = new Sketchfab( '1.0.0', viewer );

    if ( window.location.host.indexOf( 'sketchfab-local' ) !== -1 )
        client._url = 'https://sketchfab-local.com/models/XXXX/embed';

    client.init( modelId, {
        camera: 0,
        transparent: 1,
        watermark: 0,
        autostart: 1,
        preload: 1,
        //cardboard: 1,
        //continuousRender: 1,
        success: function onSuccess( api ) {
            //API is ready to use
            clientApi = api;
            api.start( function () {
                api.addEventListener( 'viewerready', function () {

                    callback();
                } );
            } );
        },
        error: function onError() {
            console.log( 'Viewer error' );
        }
    } );
    viewer.style.display = 'block';
    // controls.style.display = 'none';
};

var rootTransform;
var rootNode;
var getNodeList = function () {

    if ( clientApi.getRootMatrixNode ) {
        clientApi.getRootMatrixNode( function ( err, id, m ) {
            rootNode = id;
            rootTransform = m;

            recognizer.stop();

            console.log( 'RootMatrixNode', id );
        } );
    }

    // not useful just check you got that root node
    clientApi.getNodeMap( function ( err, result ) {

        if ( err ) {
            console.log( 'Error getting nodes' );
            return;
        }

        var nodeList = Object.keys( result );
        console.log( 'Nodes', nodeList );

        if ( err ) {
            console.log( 'Error getting graph' );
            return;
        }
    } );

};

function myParseInt( number ) {
    var ref = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
        thirteen: 13,
        fourteen: 14,
        fifteen: 15,
        sixteen: 16,
        seventeen: 17,
        eighteen: 18,
        nineteen: 19,
        twenty: 20,
        thirty: 30,
        forty: 40,
        fifty: 50,
        sixty: 60,
        seventy: 70,
        eighty: 80,
        ninety: 90,
        hundred: 100,
        thousand: 1000,
        million: 1000000
    };

    var find = new RegExp( "(one|t(wo|hree|en|welve|hirteen|wenty|hirty)|f(our|ive|ourteen|iftenn|orty|ifty)|s(ixteen|ixty|eventy|ix|even|eventeen|teen)|eigh(ty|t|teen)|nin(ety|e|eteen)|zero|hundred|thousand|million)", "gi" );
    var mult = new RegExp( "(hundred|thousand|million)", "gi" );

    //reversing the string
    number = number.split( ' ' ).reverse().join( " " );

    var value = 0;
    var multiplier = 1;
    var a, m;
    while ( a = find.exec( number ) ) {
        if ( m = mult.exec( a[ 0 ] ) ) {
            if ( m[ 0 ] == 'hundred' ) {
                multiplier *= 100;
            } else {
                multiplier = ref[ m[ 0 ] ];
            }
        } else {
            value += ref[ a[ 0 ] ] * multiplier;
        }
    }
    console.log( value );
}
var updateCountry = function ( a, b, c ) {
    console.log( a );
    console.log( b );
    console.log( c );
}

var scale = 10;
var targetRotateLeft = [ Math.PI, 1, 0, 0 ];
var targetRotateRight = [ -Math.PI, 1, 0, 0 ];
var targetTranslateX = [ scale, 0, 0, 0 ];
var targetTranslateY = [ 0, scale, 0, 0 ];
var targetTranslateZ = [ 0, 0, scale, 0 ];
var targetTranslateXNeg = [ -scale, 0, 0, 0 ];
var targetTranslateYNeg = [ 0, -scale, 0, 0 ];
var targetTranslateZNeg = [ 0, 0, -scale, 0 ];

var clientActions = function ( cmd ) {

    console.log( '-' + cmd + '-' );

    var index;

    switch ( cmd ) {
    case 'zoom':
    case 'zoom in':
    case 'agrandissement':

        console.log( 'Action' );
        clientApi.translate( rootNode, targetTranslateZ, 1.0, function ( err, result ) {
            console.log( 'animation translate ' + result.toString() + 'finished' );

        } );
        return true;
        break;

    case 'zoom out':
    case 'réduction':

        console.log( 'Action' );
        clientApi.translate( rootNode, targetTranslateZNeg, 1.0, function ( err, result ) {
            console.log( 'animation translate ' + result.toString() + 'finished' );

        } );
        return true;
        break;

    case 'move left':
    case 'vers la gauche':

        console.log( 'Action' );
        clientApi.translate( rootNode, targetTranslateX, 1.0, function ( err, result ) {
            console.log( 'animation translate ' + result.toString() + 'finished' );

        } );
        return true;
        break;

    case 'move right':
    case 'vers la droite':

        console.log( 'Action' );
        clientApi.translate( rootNode, targetTranslateXNeg, 1.0, function ( err, result ) {
            console.log( 'animation translate ' + result.toString() + 'finished' );

        } );
        return true;
        break;

    case 'down':
    case 'move down':
    case 'vers le bas':
    case 'bas':

        console.log( 'Action' );
        clientApi.translate( rootNode, targetTranslateY, 1.0, function ( err, result ) {
            console.log( 'animation translate ' + result.toString() + 'finished' );

        } );
        return true;
        break;

    case 'app':
    case 'up':
    case 'move up':
    case 'vers le haut':
    case 'vers le eau':
    case 'haut':

        clientApi.translate( rootNode, targetTranslateYNeg, 1.0, function ( err, result ) {
            console.log( 'animation translate ' + result.toString() + 'finished' );

        } );
        return true;
        break;

    case 'left':
    case 'turn left':
    case 'tourner à gauche':

        console.log( 'Action' );
        clientApi.rotate( rootNode, targetRotateRight, 1.0, function ( err, result ) {
            console.log( 'animation rotate ' + result.toString() + 'finished' );
        } );
        return true;
        break;


    case 'right':
    case 'turn right':
    case 'tourner à droite':

        console.log( 'Action' );
        clientApi.rotate( rootNode, targetRotateLeft, 1.0, function ( err, result ) {
            console.log( 'animation rotate ' + result.toString() + 'finished' );
        } );
        break;


    case 'one':
    case 'un':
        index = 0;
        break;
    case 'two':
    case 'deux':
        index = 1;
        break;
    case 'three':
    case 'trois':
        index = 2;
        break;
    case 'four':
    case 'quatre':
        index = 3;
        break;
    case 'five':
    case 'cinq':
        index = 3;
        break;
    case 'six':
        index = 3;
        break;
    case 'seven':
    case 'sept':
        index = 3;
        break;
    case 'eight':
    case 'huit':
        index = 7;
        break;
    case 'nine':
    case 'neuf':
        index = 9;
        break;
    default:
        index = parseInt( cmd, 10 ) - 1;
        break;
    }

    if ( !isNaN( index ) ) {
        console.log( 'Action' );
        clientApi.gotoAnnotation( index, function ( err, result ) {
            console.log( 'hotspotfinished' );
        } );
        return true;
    }

    return false;
}

var set_matching_word = function ( selectObj, txtObj ) {
    var letter = txtObj;
    for ( var i = 0; i < selectObj.length; i++ ) {
        if ( selectObj.options[ i ].textContent === letter ) {
            selectObj.selectedIndex = i;
            return;
        }
    }
}
var selectLang = document.getElementById( 'select_language' );
var selectDial = document.getElementById( 'select_dialect' );


var updateCountry = function ( event ) {

    var oldLang = selectLang.options[ selectLang.selectedIndex ].textContent;
    var dialect = selectDial.options[ selectDial.selectedIndex ].textContent;

    console.log( event );

    var lang = event.target.value;
    var newLang = false;

    if ( lang = 'Français' || lang === 'fr' || navigator.language === 'fr-FR' ) {
        newLang = 'fr-FR';

    } else if ( lang === 'English' ) {
        newLang = 'en-UK';
        if ( dialect == 'United States' ) {
            newLang = 'en-US';
        }

    }

    if ( newLang ) {
        recognizer.lang = newLang;
        console.log( 'language:' + recognizer.lang );
    }

}

// Test browser support
window.SpeechRecognition = window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null;

window.SpeechGrammarList = window.SpeechGrammarList ||
    window.webkitSpeechGrammarList ||
    null;

if ( window.SpeechRecognition === null ) {
    document.getElementById( 'ws-unsupported' ).classList.remove( 'hidden' );
    document.getElementById( 'button-play-ws' ).setAttribute( 'disabled', 'disabled' );
    document.getElementById( 'button-stop-ws' ).setAttribute( 'disabled', 'disabled' );
} else {

    recognizer = new window.SpeechRecognition();

    /*
        var grammar = '#JSGF V1.0; grammar actions; public <action> = up | left | right | down | sketchfab | close | search | zoom in | zoom out | slower | faster;';
        var speechRecognitionList = new SpeechGrammarList();
        speechRecognitionList.addFromString( grammar, 1 );
        recognizer.grammars = speechRecognitionList;

        //recognizer.grammars.addFromString( 'sketchfab', 1.0 );
     */

    var transcription = document.getElementById( 'transcription' );
    var log = document.getElementById( 'log' );

    // Recogniser doesn't stop listening even if the user pauses
    recognizer.continuous = false;

    //recognition.continuous = false;
    console.log( 'language:' + recognizer.lang );
    console.log( 'language:' + navigator.languages[ 0 ] );

    console.log( navigator.languages );

    var lang = 'english'
    var dialect = navigator.languages[ 0 ];
    if ( navigator.language === 'fr' || navigator.language === 'fr-FR' ) {
        lang = 'Français';

    }


    set_matching_word( selectLang, lang );
    set_matching_word( selectDial, dialect );

    //recognizer.lang = 'en-US';
    //console.log( 'language:'+        recognizer.lang ); 



    recognizer.interimResults = false;
    recognizer.maxAlternatives = 5;

    // Start recognising
    recognizer.onresult = function ( event ) {

        transcription.textContent = '';

        for ( var i = event.resultIndex, l = event.results.length; i < l; i++ ) {

            var alternatives = event.results[ i ];
            for ( var k = 0, la = alternatives.length; k < la; k++ ) {
                var cmd = alternatives[ k ].transcript;

                cmd = cmd.trim();
                console.log( cmd );

                if ( event.results[ i ].isFinal ) {

                    transcription.textContent = cmd;
                    log.innerHTML = ' (Confidence: ' + event.results[ i ][ 0 ].confidence + ')';


                    if ( clientActions( cmd ) ) {
                        recognizer.stop();
                        recognizer.start();
                        return;
                    }
                } else {

                    transcription.textContent = cmd;
                    log.innerHTML = cmd;

                    if ( clientActions( cmd ) ) {
                        recognizer.stop();
                        recognizer.start();
                        return;
                    }
                }
            }
        }

    };

    // Listen for errors
    recognizer.onerror = function ( event ) {
        log.innerHTML = 'Recognition error: ' + event.message + '<br />' + log.innerHTML;
        recognizer.stop();
        recognizer.start();
    };
    recognizer.onend = function ( event ) {
        log.innerHTML = 'Recognition stop ';
        recognizer.start();
    };
    recognizer.onstart = function ( event ) {
        log.innerHTML = 'Recognition start ';
    };

    recognizer.onspeechend = function ( event ) {
        log.innerHTML = 'speech end ';
    };

    recognizer.onspeechstart = function ( event ) {
        log.innerHTML = 'speech start';
    };

    recognizer.onerror = function ( event ) {
        log.innerHTML = 'Recognition error: ' + event.message + '<br />' + log.innerHTML;
        recognizer.stop();
        recognizer.start();
    };

    document.getElementById( 'button-play-ws' ).addEventListener( 'click', function () {
        // Set if we need interim results
        recognizer.interimResults = document.querySelector( 'input[name="recognition-type"][value="interim"]' ).checked;

        try {

            recognizer.start();
            log.innerHTML = 'Recognition started' + '<br />' + log.innerHTML;

        } catch ( ex ) {

            log.innerHTML = 'Recognition error: ' + ex.message + '<br />' + log.innerHTML;

        }
    } );

    document.getElementById( 'button-stop-ws' ).addEventListener( 'click', function () {
        recognizer.stop();
        log.innerHTML = 'Recognition stopped' + '<br />' + log.innerHTML;
    } );

    document.getElementById( 'clear-all' ).addEventListener( 'click', function () {
        transcription.textContent = '';
        log.textContent = '';
    } );

}

recognizer.start();
loadModel( getNodeList );

startButton.addEventListener( 'click', function () {

    loadModel( getNodeList );


}, false );
