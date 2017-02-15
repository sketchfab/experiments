window.materialName = 'Display';
window.apps = [{
    video: 'https://labs.sketchfab.com/experiments/video-textures/videos/shazam.webm',
    camera: {
        "position": [-5.20412822581436, -19.121745822133644, 3.154700374905264],
        "target": [0.000005142699927019269, -0.3250986610075804, 0.0890636007763596]
    }
}, {
    video: 'https://labs.sketchfab.com/experiments/video-textures/videos/yahoo.webm',
    camera: {
        "position": [10.45378074877901, -14.66936406657716, 2.0479698873912184],
        "target": [0.000005142699927019269, -0.3250986610075804, 0.0890636007763596]
    }
}, {
    video: 'https://labs.sketchfab.com/experiments/video-textures/videos/runtastic.webm',
    camera: {
        "position": [0.47380569188722443, -24.291117279406077, 1.7677300681241275],
        "target": [0.000005142699927019269, -0.3250986610075804, 0.0890636007763596]
    }
}, {
    video: 'https://labs.sketchfab.com/experiments/video-textures/videos/facetune.webm',
    camera: {
        "position": [6.362053080095855, -13.570428558563714, -7.621101955228509],
        "target": [-0.3669375256516855, 0.6024138807750593, -0.07880321051119216]
    }
}, ];
var urlid = '5bcc0b3292f14202b96cfd1e34f790f6';

var iframe = document.querySelector('#api-frame');
var buttons = document.querySelectorAll('.app');
var form = document.querySelector('.custom-image');

var client = new Sketchfab('1.0.0', iframe);
// client._url = 'https://sketchfab-local.com/models/XXXX/embed';

setTimeout(function() {
    client.init(urlid, {

        continuousRender: 1,
        ui_infos: 0,
        ui_controls: 0,
        ui_stop: 0,

        success: function onInitSuccess(api) {
            // Augment API with some helpers
            api = augment.extend(api, SketchfabViewerPlusMixin);
            window.api = api;
            api.addEventListener('viewerready', function() {
                var container = document.querySelector('.apps');
                container.className = container.className + ' active';
            });
            api.start();
        },
        error: function onInitError() {
            throw new Error('Can not initialize viewer API');
        }
    });
}, 1000);

function swithToApp(app) {
    console.log('Switching app', app);
    var api = window.api;

    api.setCameraLookAt(app.camera.position, app.camera.target, 3);

    // @FIXME: shouldn't add texture if it has already been added
    api.addTexture(app.video, function(err, textureId) {
        api.getMaterialsByName(window.materialName, function(err, materials) {
            if (!err) {
                console.log(materials);
                //Diffuse
                materials[0].channels['DiffuseColor'].texture = {
                    uid: textureId
                };
                //Emission
                materials[0].channels['EmitColor'].enable = true;
                materials[0].channels['EmitColor'].factor = 1;
                materials[0].channels['EmitColor'].texture = {
                    uid: textureId
                };
                api.setMaterial(materials[0]);
            }
        });
    });
}

for (var i = 0; i < buttons.length; i++) {
    (function(i) {
        buttons[i].addEventListener('click', function() {
            swithToApp(window.apps[i]);
        }, false);
    })(i)
}

form.addEventListener('submit', function(e){
    e.preventDefault();
    var url = document.querySelector('.url').value;
    if (url.replace('\s') !== '') {
        console.log(url);
        swithToApp({
            video: url,
            camera: {
                "position": [0.47380569188722443, -24.291117279406077, 1.7677300681241275],
                "target": [0.000005142699927019269, -0.3250986610075804, 0.0890636007763596]
            }
        });
    }
}, false);
