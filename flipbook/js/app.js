var picker = new SketchfabPicker();

function makeFlipBook( url, paperFormat ) {

    paperFormat = ( typeof paperFormat !== 'undefined' ) ? paperFormat : 'A4';

    var cm2inches = 0.393701;
    var dpi = 300;
    var paperFormats = {
        'A4': {
            width: 21 * cm2inches,
            height: 29.7 * cm2inches
        },
        'letter': {
            width: 8.5,
            height: 11
        }
    };

    //Layout
    var columns = 2;
    var rows = 7;
    var marginSize = 2 * cm2inches;

    onLoading();

    var image = document.createElement( 'IMG' );
    image.onload = function () {
        var frameWidth = Math.floor( image.width / 15 );
        var frameHeight = image.height;
        var frameRatio = frameWidth / frameHeight;

        var canvasWidth = Math.floor( paperFormats[ paperFormat ].width * dpi );
        var canvasHeight = Math.floor( paperFormats[ paperFormat ].height * dpi );

        var margin = Math.floor( marginSize * dpi );
        var cellWidth = ( canvasWidth - 2 * margin ) / columns;
        var cellHeight = ( canvasHeight - 2 * margin ) / rows;
        var cellRatio = cellWidth / cellHeight;

        var resizedFrameX;
        var resizedFrameY;
        var resizedFrameWidth;
        var resizedFrameHeight;

        if ( cellRatio < frameRatio ) {
            resizedFrameWidth = cellWidth * 0.66;
            resizedFrameHeight = resizedFrameWidth / frameRatio;
            resizedFrameX = cellWidth * 0.33;
            resizedFrameY = ( cellHeight - resizedFrameHeight ) * 0.5;
        } else {
            resizedFrameHeight = cellHeight;
            resizedFrameWidth = resizedFrameHeight * frameRatio;
            resizedFrameX = cellWidth - resizedFrameWidth;
            resizedFrameY = 0;
        }

        var canvas = document.querySelector( '#canvas' );
        var ctx = canvas.getContext( '2d' );
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect( 0, 0, canvasWidth, canvasHeight );

        var fontSize = 36;
        var textMargin = 15;
        ctx.font = fontSize + 'pt sans-serif';
        ctx.fillStyle = 'rgb(0, 0, 0)';

        ctx.fillText( 'https://labs.sketchfab.com/experiments/flipbook/', margin, margin - ( fontSize + textMargin ) );

        for ( var i = 0; i < Math.min( columns * rows, 15 ); i++ ) {
            var x = ( i % columns ) * cellWidth + margin;
            var y = ( Math.floor( i / columns ) ) * cellHeight + margin;

            ctx.drawImage( image, i * frameWidth, 0, frameWidth, frameHeight, x + resizedFrameX, y + resizedFrameY, resizedFrameWidth, resizedFrameHeight );
            ctx.strokeRect( x, y, cellWidth, cellHeight );
            ctx.fillText( ( i + 1 ), x + textMargin, y + fontSize + textMargin );
        }

        setTimeout( onSuccess, 1000 );
    };
    image.crossOrigin = "Anonymous";
    image.src = url;
}

function download() {
    var canvas = document.querySelector( '#canvas' );
    canvas.toBlob( function ( blob ) {
        saveAs( blob, "sketchfab-flipbook.png" );

        setTimeout( function () {
            Popup.close();
        }, 1000 );
    } );
}

var downloadButton = document.querySelector( '.download' );
var thumbEl = document.querySelector( '.model__thumbnail' );
downloadButton.addEventListener( 'click', download, false );
thumbEl.addEventListener( 'click', download, false );

var pickButton = document.querySelector( '.pick' );
pickButton.addEventListener( 'click', function () {
    picker.pick( {
        success: function ( model ) {
            if ( model.uid ) {
                generateFlipBook( model.uid, 'A4' );
            }
        }
    } );
}, false );

function onLoading() {
    var successEl = document.querySelector( '.generator-download .success' );
    var errorEl = document.querySelector( '.generator-download .error' );
    var loadingEl = document.querySelector( '.generator-download .loading' );
    successEl.style.display = 'none';
    errorEl.style.display = 'none';
    loadingEl.style.display = 'block';
}

function onSuccess() {
    var successEl = document.querySelector( '.generator-download .success' );
    var errorEl = document.querySelector( '.generator-download .error' );
    var loadingEl = document.querySelector( '.generator-download .loading' );
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
    loadingEl.style.display = 'none';
}

function onError() {
    var successEl = document.querySelector( '.generator-download .success' );
    var errorEl = document.querySelector( '.generator-download .error' );
    var loadingEl = document.querySelector( '.generator-download .loading' );
    successEl.style.display = 'none';
    errorEl.style.display = 'block';
    loadingEl.style.display = 'none';
}

function renderModelPreview( model ) {
    var infoEl = document.querySelector( '.model' );
    var nameEl = document.querySelector( '.model__name' );
    var authorEl = document.querySelector( '.model__author' );
    var thumbEl = document.querySelector( '.model__thumbnail' );
    infoEl.style.display = 'block';
    nameEl.innerText = model.name;
    authorEl.innerText = model.user.displayName;

    var thumbnailUrl = model.thumbnails.images.reduce( function ( acc, current ) {
        if ( current.width >= 200 && acc === '' ) {
            return current.url;
        } else {
            return acc;
        }
    }, '' );
    thumbEl.style.backgroundImage = 'url(' + thumbnailUrl + ')';
}

function generateFlipBook( uid, paperFormat ) {
    var fallbackUrl = 'https://sketchfab.com/i/models/' + uid + '/fallback';
    axios.get( fallbackUrl ).then( function ( response ) {
        var images = response.data.results.images;
        var largestImage = images.reduce( function ( acc, val ) {
            if ( val.height > acc.height ) {
                return val;
            } else {
                return acc;
            }
        }, images[ 0 ] );

        makeFlipBook( largestImage.url, paperFormat );
    } ).catch( function () {
        onError();
        console.error( 'Can not find fallback' );
    } );

    axios.get( 'https://api.sketchfab.com/v3/models/' + uid ).then( function ( response ) {
        Popup.open();
        renderModelPreview( response.data );
    } ).
    catch( function () {
        onError();
    } );
}

var Popup = {
    el: document.querySelector( '.popup' ),

    init: function () {
        var overlay = document.querySelector( '.popup__overlay' );
        overlay.addEventListener( 'click', function () {
            Popup.close();
        } );
    },

    open: function () {
        Popup.el.classList.add( 'popup--active' );
    },

    close: function () {
        Popup.el.classList.remove( 'popup--active' );
    }
};
Popup.init();
