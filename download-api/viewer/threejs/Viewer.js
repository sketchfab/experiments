var ThreeViewer = {
    el: null,
    scene: null,
    camera: null,
    controls: null,
    renderer: null,

    /**
     * Initializes the Three.JS viewer
     */
    init: function() {
        ThreeViewer.el = document.querySelector('.viewer');
        var w = ThreeViewer.el.clientWidth;
        var h = ThreeViewer.el.clientHeight;

        ThreeViewer.scene = new THREE.Scene();
        ThreeViewer.scene.background = new THREE.Color(0x333333);

        // Lights
        var ambient = new THREE.AmbientLight(0x333333);
        var directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(2, 1, 0);
        ThreeViewer.scene.add(ambient);
        ThreeViewer.scene.add(directional);

        // Camera & controls
        var camera = new THREE.PerspectiveCamera(45, w / h, 0.001, 1000);
        ThreeViewer.scene.add(camera);
        var controls = new THREE.OrbitControls(camera, ThreeViewer.el);
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 2, 0);
        controls.target = new THREE.Vector3(0, 2, 0);
        ThreeViewer.camera = camera;
        ThreeViewer.controls = controls;

        ThreeViewer.renderer = new THREE.WebGLRenderer({ antialias: true });
        ThreeViewer.renderer.setPixelRatio(window.devicePixelRatio);
        ThreeViewer.renderer.setSize(w, h);
        ThreeViewer.renderer.gammaOutput = true;
        ThreeViewer.el.appendChild(ThreeViewer.renderer.domElement);

        //Environment
        var hdrUrls = ThreeViewer._genCubeUrls('./viewer/threejs/assets/pisaHDR/', '.hdr');
        var hdrCubeRenderTarget;
        new THREE.HDRCubeTextureLoader().load(THREE.UnsignedByteType, hdrUrls, function(
            hdrCubeMap
        ) {
            var pmremGenerator = new THREE.PMREMGenerator(hdrCubeMap);
            pmremGenerator.update(ThreeViewer.renderer);
            var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods);
            pmremCubeUVPacker.update(ThreeViewer.renderer);
            hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
            ThreeViewer.environment = hdrCubeRenderTarget.texture;
        });

        // Scene
        var geometry = new THREE.PlaneGeometry(10, 10, 10);
        var material = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geometry, material);
        plane.rotateX(Math.PI / 2);
        ThreeViewer.scene.add(plane);

        ThreeViewer.loop();

        window.addEventListener('resize', ThreeViewer.handleResize, false);
    },

    _genCubeUrls: function(prefix, postfix) {
        return [
            prefix + 'px' + postfix,
            prefix + 'nx' + postfix,
            prefix + 'py' + postfix,
            prefix + 'ny' + postfix,
            prefix + 'pz' + postfix,
            prefix + 'nz' + postfix
        ];
    },

    handleResize: function() {
        var w = ThreeViewer.el.clientWidth;
        var h = ThreeViewer.el.clientHeight;
        ThreeViewer.camera.aspect = w / h;
        ThreeViewer.camera.updateProjectionMatrix();

        ThreeViewer.renderer.setSize(w, h);
    },

    /**
     * Loads a GLTF file
     * @param {Object} assetMap Key/value object. Filepaths are key, blob URLs are values.
     * @param {String} url Path of the root GLTF file
     */
    loadGltf: function(assetMap, url) {
        ThreeViewer._emptyScene();

        // // Use a LoadingManager to map filepath to blob URLs
        // var manager = new THREE.LoadingManager();
        // manager.setURLModifier( function( url, path ) {
        //     console.log(url, path);
        //     var normalizedUrl = url.replace(/^(\.?\/)/, '');
        //     return assetMap[normalizedUrl];
        // } );
        // var loader = new THREE.GLTFLoader(manager);

        var loader = new THREE.GLTFLoader();
        url = assetMap[url];

        loader.load(
            url,
            function(gltf) {
                ThreeViewer.scene.add(gltf.scene);

                //Normalize scene scale
                var TARGET_SIZE = 5;
                var bbox = new THREE.Box3().setFromObject(gltf.scene);
                var maxSide = Math.max(
                    bbox.max.x - bbox.min.x,
                    bbox.max.y - bbox.min.y,
                    bbox.max.z - bbox.min.z
                );
                var ratio = TARGET_SIZE / maxSide;
                gltf.scene.scale.set(ratio, ratio, ratio);

                //Center scene
                var centerX = bbox.min.x * ratio * -1 - (bbox.max.x - bbox.min.x) / 2 * ratio;
                var centerY = bbox.min.y * ratio * -1;
                var centerZ = bbox.min.z * ratio * -1 - (bbox.max.z - bbox.min.z) / 2 * ratio;
                gltf.scene.translateX(centerX);
                gltf.scene.translateY(centerY);
                gltf.scene.translateZ(centerZ);

                //Update materials with env
                if (ThreeViewer.environment) {
                    gltf.scene.traverse(function(node) {
                        if (node.material && 'envMap' in node.material) {
                            node.material.envMap = ThreeViewer.environment;
                            node.material.needsUpdate = true;
                        }
                    });
                }
            },
            undefined,
            function(error) {
                console.error(error);
            }
        );
    },

    _emptyScene: function() {
        for (var i = 0, l = ThreeViewer.scene.children.length; i < l; i++) {
            if (ThreeViewer.scene.children[i].name === 'OSG_Scene') {
                ThreeViewer.scene.remove(ThreeViewer.scene.children[i]);
            }
        }
    },

    /**
     * Renders the scene
     */
    render: function() {
        ThreeViewer.renderer.render(ThreeViewer.scene, ThreeViewer.camera);
    },

    loop: function() {
        if (ThreeViewer.renderer) {
            ThreeViewer.render();
            requestAnimationFrame(ThreeViewer.loop);
        }
    },

    dispose: function() {
        function disposeNode(node) {
            var child;
            for (var i = node.children.length - 1; i >= 0; i--) {
                child = node.children[i];
                disposeNode(child);

                if (node.geometry) {
                    node.geometry.dispose();
                }
                if (node.material) {
                    node.material.dispose();
                }
                if (node.mesh) {
                    node.mesh.dispose();
                }
                if (node.texture) {
                    node.texture.dispose();
                }
                node.remove(child);
            }
        }

        disposeNode(ThreeViewer.scene);

        ThreeViewer.controls.dispose();
        ThreeViewer.controls = null;
        ThreeViewer.renderer = null;
        ThreeViewer.camera = null;
        ThreeViewer.scene = null;
        ThreeViewer.el.innerHTML = '';
        window.removeEventListener('resize', ThreeViewer.handleResize, false);
    }
};
