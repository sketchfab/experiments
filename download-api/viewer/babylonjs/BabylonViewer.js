var BabylonViewer = {
    el: null,
    canvas: null,
    engine: null,
    scene: null,

    init: function() {
        BabylonViewer.el = document.querySelector('.viewer');
        var w = BabylonViewer.el.clientWidth;
        var h = BabylonViewer.el.clientHeight;

        BabylonViewer.canvas = document.createElement('CANVAS');
        BabylonViewer.canvas.width = w;
        BabylonViewer.canvas.height = h;
        BabylonViewer.canvas.setAttribute('touch-action', 'none');
        BabylonViewer.el.appendChild(BabylonViewer.canvas);

        var engine = new BABYLON.Engine(BabylonViewer.canvas, true, {
            enableOfflineSupport: false
        });
        var scene = new BABYLON.Scene(engine);
        scene.createDefaultEnvironment();

        var camera = new BABYLON.ArcRotateCamera(
            'Camera',
            Math.PI / 2,
            Math.PI / 2,
            1,
            BABYLON.Vector3.Zero(),
            scene
        );
        camera.lowerRadiusLimit = 0.001;
        camera.wheelPrecision = 50;
        camera.setPosition(new BABYLON.Vector3(0, 5, 10));
        camera.setTarget(new BABYLON.Vector3(0, 2, 0));
        camera.attachControl(BabylonViewer.canvas, false, false);

        BabylonViewer.engine = engine;
        BabylonViewer.scene = scene;
        BabylonViewer.loop();

        window.addEventListener('resize', BabylonViewer.handleResize, false);
    },

    handleResize: function() {
        BabylonViewer.canvas.width = BabylonViewer.el.clientWidth;
        BabylonViewer.canvas.height = BabylonViewer.el.clientHeight;

        if (BabylonViewer.engine) {
            BabylonViewer.engine.resize();
        }
    },

    loadGltf: function(assetMap, url) {
        var path = assetMap[url];

        this._emptyScene();

        BABYLON.SceneLoader.Append(
            '',
            path,
            BabylonViewer.scene,
            function onSuccess() {
                console.log('Loaded');

                //Normalize scene scale
                var bbox = BabylonViewer.scene.getWorldExtends();
                var TARGET_SIZE = 10;
                var largestSide = Math.max(
                    bbox.max.x - bbox.min.x,
                    bbox.max.y - bbox.min.y,
                    bbox.max.z - bbox.min.z
                );
                var ratio = TARGET_SIZE / largestSide;

                for (var i = 0, l = BabylonViewer.scene.meshes.length; i < l; i++) {
                    if (BabylonViewer.scene.meshes[i].id === 'RootNode (gltf orientation matrix)') {
                        BabylonViewer.scene.meshes[i].scaling.x = ratio;
                        BabylonViewer.scene.meshes[i].scaling.y = ratio;
                        BabylonViewer.scene.meshes[i].scaling.z = ratio;
                    }

                }
            },
            function onProgress() {},
            function onError(e) {
                console.error(e);
            },
            '.gltf'
        );
    },

    _emptyScene: function() {
        var model = BabylonViewer.scene.meshes.reduce(function(acc, cur){
            if (cur.id === 'RootNode (gltf orientation matrix)') {
                return cur;
            }
            return acc;
        }, null);

        if (model) {
            model.dispose();
        }
    },

    loop: function() {
        BabylonViewer.engine.runRenderLoop(function() {
            BabylonViewer.scene.render();
        });
    },

    dispose: function() {
        BabylonViewer.engine.stopRenderLoop();
        BabylonViewer.engine.dispose();
        BabylonViewer.scene.dispose();
        window.removeEventListener('resize', BabylonViewer.handleResize, false);
        BabylonViewer.el.innerHTML = '';
    }
};
