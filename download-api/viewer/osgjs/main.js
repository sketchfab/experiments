(function() {
    'use strict';

    var P = window.P;
    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgViewer = OSG.osgViewer;
    var osgDB = OSG.osgDB;
    var osgUtil = OSG.osgUtil;
    var osgShader = OSG.osgShader;
    var $ = window.$;
    var Object = window.Object;

    var Environment = window.Environment;

    var CameraPresets = {
        CameraGold: {
            target: [80.0, 0.0, 80.0],
            eye: [80.0, -155.0, 120.0]
        },
        CameraMetal: {
            target: [80.0, 0.0, 40.0],
            eye: [80.0, -155.0, 80.0]
        },
        CameraCenter: {
            target: [80.0, 0.0, 20.0],
            eye: [80.0, -215.0, 20.0]
        },
        CameraPBR: {
            target: [160.0, 0.0, 80.0],
            eye: [160.0, -100.0, 80.0]
        },
        CameraSamples: {
            target: [46.0, 20.0, 80.0],
            eye: [46.0, -62.5, 80.0]
        }
    };

    var isMobileDevice = function() {
        if (navigator.userAgent.match(/Mobile/i)) return true;
        if (navigator.userAgent.match(/Android/i)) return true;
        if (navigator.userAgent.match(/iPhone/i)) return true;
        if (navigator.userAgent.match(/iPad/i)) return true;
        if (navigator.userAgent.match(/iPod/i)) return true;
        if (navigator.userAgent.match(/BlackBerry/i)) return true;
        if (navigator.userAgent.match(/Windows Phone/i)) return true;

        return false;
    };

    var optionsURL = {};
    (function(options) {
        var vars = [],
            hash;
        var indexOptions = window.location.href.indexOf('?');
        if (indexOptions < 0) return;

        var hashes = window.location.href.slice(indexOptions + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            var element = hash[0];
            vars.push(element);
            var result = hash[1];
            if (result === undefined) {
                result = '1';
            }
            options[element] = result;
        }
    })(optionsURL);

    var PBRWorkflowVisitor = function() {
        this._workflow = [];
        osg.NodeVisitor.call(this);
    };

    PBRWorkflowVisitor.prototype = osg.objectInherit(osg.NodeVisitor.prototype, {
        apply: function(node) {
            var data = node.getUserData();
            var vertexColor;
            if (data && data.pbrWorklow) {
                var stateSetWorkflow = {
                    stateSet: node.getOrCreateStateSet(),
                    workflow: data.pbrWorklow
                };
                // Need to store if model has vertexColors
                if (node instanceof osg.Geometry) {
                    vertexColor = node.getAttributes().Color !== undefined;
                    stateSetWorkflow.vertexColor = vertexColor;
                }
                this._workflow.push(stateSetWorkflow);
            }
            this.traverse(node);
        },
        getWorkflows: function() {
            return this._workflow;
        }
    });

    var shaderProcessor = new osgShader.ShaderProcessor();

    window.ALBEDO_TEXTURE_UNIT = 2;
    window.DIFFUSE_TEXTURE_UNIT = 2;
    window.METALLIC_ROUGHNESS_TEXTURE_UNIT = 3;
    window.SPECULAR_TEXTURE_UNIT = 4;
    window.NORMAL_TEXTURE_UNIT = 5;

    window.GLTF_PBR_SPEC_MODE = 'PBR_specular_glossiness';

    var modelList = ['sphere', 'model'];

    var defaultEnvironment = '../media/environments/parking.zip';
    var envURL = defaultEnvironment;
    if (optionsURL.env) {
        if (optionsURL.env.indexOf('http') !== -1) envURL = optionsURL.env;
        else envURL = 'textures/' + optionsURL.env;
    }
    var environment = envURL;
    var environmentList = [];
    var environmentMap = {};


    var dragOverEvent = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy';
    };

    var dropEvent = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files;
        if (files.length) this.handleDroppedFiles(files);
        else {
            var url = evt.dataTransfer.getData('text');
            if (url.indexOf('.zip') !== -1 || url.indexOf('.gltf') !== -1)
                this.handleDroppedURL(url);
            else osg.warn('url ' + url + ' not supported, drag n drop only valid zip files');
        }
    };

    window.addEventListener(
        'load',
        function() {
            var example = new Example();
            var canvas = $('#View')[0];
            example.run(canvas);

            $('#loading').hide();

            window.addEventListener('dragover', dragOverEvent.bind(example), false);
            window.addEventListener('drop', dropEvent.bind(example), false);

            var lastMousePosition = {
                x: 0
            };
            window.example = example;
            window.addEventListener(
                'mousemove',
                function(evt) {
                    var button = evt.which || evt.button;

                    if (evt.altKey && button) {
                        evt.stopPropagation();
                        var deltaX = evt.clientX - lastMousePosition.x;
                        example._config.envRotation += deltaX * 0.01;
                        example.updateEnvironmentRotation();
                    }

                    lastMousePosition.x = evt.clientX;
                },
                true
            );
        },
        true
    );
})();
