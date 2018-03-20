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
        var camera = new BABYLON.ArcRotateCamera(
            'Camera',
            Math.PI / 2,
            Math.PI / 2,
            2,
            BABYLON.Vector3.Zero(),
            scene
        );
        camera.setPosition(new BABYLON.Vector3(0, 5, 10));
        camera.setTarget(new BABYLON.Vector3(0, 2, 0));
        camera.attachControl(BabylonViewer.canvas, false, false);

        var plane = new BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
        var light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene);
        var light2 = new BABYLON.PointLight('light2', new BABYLON.Vector3(0, 1, -1), scene);

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

        BABYLON.SceneLoader.ImportMesh(
            '',
            '',
            path,
            BabylonViewer.scene,
            function onSuccess() {
                console.log('Loaded');
            },
            function onProgress() {},
            function onError(e) {
                console.error(e);
            },
            '.gltf'
        );
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
