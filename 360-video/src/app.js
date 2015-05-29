var urlid = 'e737ff59da5745b9a53ed0c1a8ef106c';
var materialName = '01 - Default';

var iframe = document.querySelector('#api-frame');
var buttons = document.querySelectorAll('.app');
var form = document.querySelector('.custom-image');
var client = new Sketchfab('1.0.0', iframe);

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

setTimeout(function() {
    client.init(urlid, {

        continuousRender: 1,
        ui_infos: 0,
        ui_controls: 0,
        ui_stop: 0,
        camera: 0,
        cardboard: getParameterByName('cardboard') || 0,
        oculus: getParameterByName('oculus') || 0,

        success: function onInitSuccess(api) {
            // Augment API with some helpers
            api = augment.extend(api, SketchfabViewerPlusMixin);
            window.api = api;
            api.addEventListener('viewerready', function() {
                setVideo('https://sketchfab.github.io/experiments/360-video/videos/time-couch.webm');
            });
            api.start();
        },
        error: function onInitError() {
            throw new Error('Can not initialize viewer API');
        }
    });
}, 1000);

function setVideo(url) {
    var api = window.api;

    api.addTexture(url, function(err, textureId) {
        api.getMaterialsByName(materialName, function(err, materials) {
            if (!err) {
                //Diffuse
                materials[0].channels['DiffuseColor'].texture = {
                    uid: textureId
                };
                materials[0].channels['EmitColor'].texture = {
                    uid: textureId
                };
                api.setMaterial(materials[0]);
            }
        });
    });
}
