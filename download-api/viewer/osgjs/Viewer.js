(function () {
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

    function defer() {
        var resolve, reject;
        var promise = new Promise(function () {
            resolve = arguments[0];
            reject = arguments[1];
        });
        return {
            resolve: resolve,
            reject: reject,
            promise: promise
        };
    };

    var isMobileDevice = function () {
        if (navigator.userAgent.match(/Mobile/i)) return true;
        if (navigator.userAgent.match(/Android/i)) return true;
        if (navigator.userAgent.match(/iPhone/i)) return true;
        if (navigator.userAgent.match(/iPad/i)) return true;
        if (navigator.userAgent.match(/iPod/i)) return true;
        if (navigator.userAgent.match(/BlackBerry/i)) return true;
        if (navigator.userAgent.match(/Windows Phone/i)) return true;

        return false;
    };

    var optionsURL = window.optionsURL;

    var PBRWorkflowVisitor = function () {
        this._workflow = [];
        osg.NodeVisitor.call(this);
    };

    PBRWorkflowVisitor.prototype = osg.objectInherit(osg.NodeVisitor.prototype, {
        apply: function (node) {
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
        getWorkflows: function () {
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

    var defaultEnvironment = 'viewer/osgjs/environments/parking.zip';
    var envURL = defaultEnvironment;
    if (optionsURL.env) {
        if (optionsURL.env.indexOf('http') !== -1) envURL = optionsURL.env;
        else envURL = 'textures/' + optionsURL.env;
    }
    var environment = envURL;
    var environmentList = [];
    var environmentMap = {};

    var Example = function () {
        this._shaderPath = 'viewer/osgjs/shaders/';

        this._config = {
            envRotation: Math.PI,
            lod: 0.01,
            albedo: '#c8c8c8',
            environmentType: 'cubemapSeamless',
            brightness: 1.0,
            normalAA: Boolean(optionsURL.normalAA === undefined ? true : optionsURL.normalAA),
            specularPeak: Boolean(
                optionsURL.specularPeak === undefined ? true : optionsURL.specularPeak
            ),
            occlusionHorizon: Boolean(
                optionsURL.occlusionHorizon === undefined ? true : optionsURL.occlusionHorizon
            ),

            roughness: 0.5,
            material: 'Gold',

            format: '',
            model: undefined,
            environment: '',
            mobile: isMobileDevice(),
            nb: 8,
            offset: 160
        };
        this._rootNode = new osg.Node();
        this._integrateBRDFTextureUnit = 14;
        this._materialDefines = [];
        this._shaderDefines = [];
        this._modelDefines = [];
        this._whenReadyDefer = defer();
        this._viewerReady = this._whenReadyDefer.promise;


        this._modelsLoaded = {};

        this._environmentTransformUniform = osg.Uniform.createMatrix4(
            osg.mat4.create(),
            'uEnvironmentTransform'
        );

        this._cubemapUE4 = {};

        this._shaders = [];

        this._currentEnvironment = undefined;

        // node that will contains models
        this._proxyRealModel = new osg.Node();
        this._proxyRealModel.setName('ProxyRealModel');

        // rotation of the environment geometry
        this._environmentTransformMatrix = undefined;

        this._envBrightnessUniform = osg.Uniform.createFloat1(1.0, 'uBrightness');

        this._normalAA = osg.Uniform.createInt1(0, 'uNormalAA');
        this._specularPeak = osg.Uniform.createInt1(
            this._config.specularPeak ? 1 : 0,
            'uSpecularPeak'
        );

        this._occlusionHorizon = osg.Uniform.createInt1(0, 'uOcclusionHorizon');

        // background stateSet
        this._backgroundStateSet = new osg.StateSet();

        window.printCurrentCamera = function () {
            var eye = osg.vec3.create();
            var target = osg.vec3.create();
            console.log(
                'target ' +
                this._viewer
                .getManipulator()
                .getTarget(target)
                .toString()
            );
            console.log(
                'eye ' +
                this._viewer
                .getManipulator()
                .getEyePosition(eye)
                .toString()
            );
        }.bind(this);
    };

    Example.prototype = {
        getRootNode: function () {
            return this._rootNode;
        },

        createEnvironment: function (urlOrZip, zipFileName) {
            var env = new window.Environment();

            var registerEnvironment = function (envReady) {
                var name = envReady.name;
                environmentMap[name] = envReady;
                environmentList.push(name);

                this._config.environment = name;
            }.bind(this);

            if (typeof urlOrZip === 'string') {
                var url = urlOrZip;
                return env.loadPackage(url).then(function () {
                    registerEnvironment(env);
                    return env;
                });
            }

            var zip = urlOrZip;
            return env.readZipContent(zip, zipFileName).then(function () {
                registerEnvironment(env);
                return env;
            });
        },

        updateConfigFromEnvironment: function (formatList) {
            if (formatList.indexOf(this._config.format) === -1) this._config.format = formatList[0];
        },

        setEnvironment: function (name) {
            if (environmentMap[name]) {
                this._currentEnvironment = environmentMap[name];
                this.updateConfigFromEnvironment(this._currentEnvironment.getFormatList());
                this.updateEnvironment();
            }
        },

        createTextureFromColor: function (colorArg, srgb, textureOutput) {
            var colorInput = colorArg;
            var albedo = new osg.Uint8Array(4);

            if (typeof colorInput === 'number') {
                colorInput = [colorInput];
            }
            var color = colorInput.slice(0);

            if (color.length === 3) color.push(1.0);

            if (color.length === 1) {
                color.push(color[0]);
                color.push(color[0]);
                color.push(1.0);
            }

            color.forEach(function (value, index) {
                if (srgb) albedo[index] = Math.floor(255 * linear2Srgb(value));
                else albedo[index] = Math.floor(255 * value);
            });

            var texture = textureOutput;
            if (!texture) texture = new osg.Texture();
            texture.setTextureSize(1, 1);
            texture.setImage(albedo);
            return texture;
        },

        getTexture1111: function () {
            if (!this._texture1111) this._texture1111 = this.createTextureFromColor(osg.vec4.ONE);
            return this._texture1111;
        },

        readShaders: function () {
            var shaderNames = [
                'math.glsl',
                'cubemapVertex.glsl',
                'cubemapFragment.glsl',
                'cubemapSampler.glsl',
                'panoramaVertex.glsl',
                'panoramaFragment.glsl',
                'panoramaSampler.glsl',

                'pbrReferenceFragment.glsl',
                'pbrReferenceVertex.glsl',
                'colorSpace.glsl',

                'pbr_ue4.glsl',

                'sphericalHarmonics.glsl',
                'sphericalHarmonicsVertex.glsl',
                'sphericalHarmonicsFragment.glsl'
            ];

            var shaders = shaderNames.map(
                function (arg) {
                    return this._shaderPath + arg;
                }.bind(this)
            );

            var promises = [];
            shaders.forEach(function (shader) {
                promises.push(osgDB.fileHelper.requestURI(shader));
            });

            return P.all(promises).then(function (args) {
                var shaderNameContent = {};
                shaderNames.forEach(function (name, idx) {
                    shaderNameContent[name] = args[idx];
                });

                shaderProcessor.addShaders(shaderNameContent);
            });
        },

        // config = {
        //     normalMap: false,
        //     glossinessMap: false,
        //     specularMap: false
        //     aoMap: false
        // }
        createShaderPBR: function (config) {
            var defines = [];

            this._materialDefines.forEach(function (d) {
                defines.push(d);
            });

            this._modelDefines.forEach(function (d) {
                defines.push(d);
            });

            if (config && config.noTangent === true) defines.push('#define NO_TANGENT');

            if (config && config.normalMap === true) defines.push('#define NORMAL');

            if (config && config.vertexColor === true) defines.push('#define VERTEX_COLOR');

            if (config && config.specularGlossinessMap === true)
                defines.push('#define SPECULAR_GLOSSINESS');

            if (config && config.emissiveMap === true) defines.push('#define EMISSIVE');

            if (config && config.specularMap === true) defines.push('#define SPECULAR');

            if (config && config.aoMap === true) defines.push('#define AO');

            if (config && config.environmentType === 'cubemapSeamless') {
                defines.push('#define CUBEMAP_LOD ');
            } else {
                defines.push('#define PANORAMA ');
            }

            defines.push('#define ' + config.format);

            if (config && config.mobile) {
                defines.push('#define MOBILE');
            }

            if (!this._shaderCache) this._shaderCache = {};

            var hash = defines.join();
            if (!this._shaderCache[hash]) {
                var vertexshader = shaderProcessor.getShader('pbrReferenceVertex.glsl');
                var fragmentshader = shaderProcessor.getShader(
                    'pbrReferenceFragment.glsl',
                    defines
                );

                var program = new osg.Program(
                    new osg.Shader('VERTEX_SHADER', vertexshader),
                    new osg.Shader('FRAGMENT_SHADER', fragmentshader)
                );

                this._shaderCache[hash] = program;
            }

            return this._shaderCache[hash];
        },

        updateEnvironmentBrightness: function () {
            var b = this._config.brightness;
            this._envBrightnessUniform.setFloat(b);
        },

        updateNormalAA: function () {
            var aa = this._config.normalAA ? 1 : 0;
            this._normalAA.setInt(aa);
        },

        updateSpecularPeak: function () {
            var aa = this._config.specularPeak ? 1 : 0;
            this._specularPeak.setInt(aa);
        },

        updateOcclusionHorizon: function () {
            var aa = this._config.occlusionHorizon ? 1 : 0;
            this._occlusionHorizon.setInt(aa);
        },

        updateEnvironmentRotation: function () {
            if (!this._environmentTransformMatrix) return;
            var rotation = this._config.envRotation;
            osg.mat4.fromRotation(this._environmentTransformMatrix, rotation, [0, 0, 1]);
        },

        createEnvironmentNode: function () {
            var scene = new osg.Node();

            // create the environment sphere
            var size = 500;
            //var geom = osg.createTexturedBoxGeometry( 0, 0, 0, size, size, size );

            // to use the same shader panorama
            var geom = osg.createTexturedSphereGeometry(size / 2, 20, 20);
            var ss = geom.getOrCreateStateSet();
            geom.getOrCreateStateSet().setAttributeAndModes(new osg.CullFace('DISABLE'));
            geom.getOrCreateStateSet().setAttributeAndModes(new osg.Depth('DISABLE'));
            geom.setBound(new osg.BoundingBox());

            ss.setRenderBinDetails(-1, 'RenderBin');

            var environmentTransform = this._environmentTransformUniform;

            var mt = new osg.MatrixTransform();
            mt.addChild(geom);

            var CullCallback = function () {
                this.cull = function (node, nv) {
                    // overwrite matrix, remove translate so environment is always at camera origin
                    osg.mat4.setTranslation(nv.getCurrentModelViewMatrix(), [0, 0, 0]);
                    var m = nv.getCurrentModelViewMatrix();

                    // add a rotation, because environment has the convention y up
                    var rotateYtoZ = osg.mat4.fromRotation(osg.mat4.create(), Math.PI / 2, [
                        1,
                        0,
                        0
                    ]);

                    osg.mat4.mul(environmentTransform.getInternalArray(), m, rotateYtoZ);
                    //osg.mat4.copy( environmentTransform.get() , m );
                    return true;
                };
            };
            mt.setCullCallback(new CullCallback());
            this._environmentTransformMatrix = mt.getMatrix();

            var cam = new osg.Camera();
            cam.setClearMask(0x0);
            cam.setReferenceFrame(osg.Transform.ABSOLUTE_RF);
            cam.addChild(mt);
            cam.setCullCallback(new CullCallback());

            var self = this;
            // the update callback get exactly the same view of the camera
            // but configure the projection matrix to always be in a short znear/zfar range to not vary depend on the scene size
            var info = {};
            var proj = [];
            var UpdateCallback = function () {
                this.update = function () {
                    var rootCam = self._viewer.getCamera();

                    osg.mat4.getPerspective(info, rootCam.getProjectionMatrix());
                    osg.mat4.perspective(
                        proj,
                        Math.PI / 180 * info.fovy,
                        info.aspectRatio,
                        1.0,
                        1000.0
                    );

                    cam.setProjectionMatrix(proj);
                    cam.setViewMatrix(rootCam.getViewMatrix());

                    return true;
                };
            };
            cam.addUpdateCallback(new UpdateCallback());

            scene.addChild(cam);
            scene.setNodeMask(0x4);
            scene.setName('EnvironementNode');
            return scene;
        },

        setModel: function (model) {
            if (!model) return;

            var gltfFileName = model.getName();
            this._modelsLoaded[gltfFileName] = model;
            this._config.model = gltfFileName;
            this._proxyRealModel.removeChildren();

            this._proxyRealModel.addChild(model);
            this._proxyRealModel.setNodeMask(~0x0);
            this._proxyRealModel.dirtyBound();

            var visitorWorkflow = new PBRWorkflowVisitor();
            model.accept(visitorWorkflow);

            var workflows = visitorWorkflow.getWorkflows();
            var tex1 = this.getTexture1111();
            for (var i = 0; i < workflows.length; ++i) {
                var normalMap = true;
                var emissive = true;
                var vertexColor = false;
                var stateSet = workflows[i].stateSet;
                var specularWorkflow = workflows[i].workflow === window.GLTF_PBR_SPEC_MODE;
                // Check we have textures, else generate 1x1 texture

                // From the spec:  If a texture is not given, all respective texture components
                // within this material model are assumed to have a value of 1.0.
                // If both factors and textures are present the factor value acts
                // as a linear multiplier for the corresponding texture values.
                if (stateSet.getTextureAttribute(2, 'Texture') === undefined) {
                    stateSet.setTextureAttributeAndModes(2, tex1);
                }
                if (stateSet.getTextureAttribute(3, 'Texture') === undefined) {
                    stateSet.setTextureAttributeAndModes(3, tex1);
                }
                if (stateSet.getTextureAttribute(5, 'Texture') === undefined) {
                    normalMap = false;
                }
                if (stateSet.getTextureAttribute(7, 'Texture') === undefined) {
                    emissive = false;
                }
                // Search for vertex colors in the model
                if (workflows[i].vertexColor === true) {
                    vertexColor = true;
                }
                var shaderConfig = {
                    normalMap: normalMap,
                    vertexColor: vertexColor,
                    noTangent: false,
                    specularGlossinessMap: specularWorkflow,
                    emissiveMap: emissive
                };

                var config = {
                    stateSet: workflows[i].stateSet,
                    config: shaderConfig
                };

                this._shaders.length = 0;
                this._shaders.push(config);
                this.updateShaderPBR();
            }

            this._viewer.getManipulator().computeHomePosition();
        },

        createSampleScene: function () {
            this._mainSceneNode.addChild(this._environmentGeometry);
            this._mainSceneNode.addChild(this._proxyRealModel);
            return this._mainSceneNode;
        },

        createShaderPanorama: function (defines) {
            var vertexshader = shaderProcessor.getShader('panoramaVertex.glsl');
            var fragmentshader = shaderProcessor.getShader('panoramaFragment.glsl', defines);

            var program = new osg.Program(
                new osg.Shader('VERTEX_SHADER', vertexshader),
                new osg.Shader('FRAGMENT_SHADER', fragmentshader)
            );

            return program;
        },

        createShaderCubemap: function (defines) {
            var vertexshader = shaderProcessor.getShader('cubemapVertex.glsl');
            var fragmentshader = shaderProcessor.getShader('cubemapFragment.glsl', defines);

            var program = new osg.Program(
                new osg.Shader('VERTEX_SHADER', vertexshader),
                new osg.Shader('FRAGMENT_SHADER', fragmentshader)
            );

            return program;
        },

        updateGlobalUniform: function (stateSet) {
            stateSet.addUniform(this._environmentTransformUniform);
            stateSet.addUniform(this._envBrightnessUniform);
            stateSet.addUniform(this._normalAA);
            stateSet.addUniform(this._specularPeak);
            stateSet.addUniform(this._occlusionHorizon);
        },

        setPanorama: function () {
            // set the stateSet of the environment geometry
            this.setSphericalEnv();

            var texture;

            texture = this._currentEnvironment.getPanoramaUE4()[this._config.format].getTexture();

            var stateSet = this._mainSceneNode.getOrCreateStateSet();
            var w = texture.getWidth();
            stateSet.addUniform(osg.Uniform.createFloat2([w, w / 2], 'uEnvironmentSize'));

            // x4 because the base is for cubemap
            var textures = this._currentEnvironment.getTextures('specular_ue4', 'luv', 'panorama');
            var textureConfig = textures[0];
            var minTextureSize = textureConfig.limitSize;

            var nbLod = Math.log(w) / Math.LN2;
            var maxLod = nbLod - Math.log(minTextureSize) / Math.LN2;

            stateSet.addUniform(osg.Uniform.createFloat2([nbLod, maxLod], 'uEnvironmentLodRange'));
            stateSet.addUniform(osg.Uniform.createInt1(0, 'uEnvironment'));

            this.updateGlobalUniform(stateSet);

            stateSet.setTextureAttributeAndModes(0, texture);
        },

        setCubemapSeamless: function () {
            this.setSphericalEnv();

            var envCubemap = this._currentEnvironment.getCubemapUE4();
            var texture = envCubemap[this._config.format].getTexture();

            var stateSet = this._mainSceneNode.getOrCreateStateSet();
            var w = texture.getWidth();

            var textures = this._currentEnvironment.getTextures('specular_ue4', 'luv', 'cubemap');
            var textureConfig = textures[0];
            var minTextureSize = textureConfig.limitSize;

            var nbLod = Math.log(w) / Math.LN2;
            var maxLod = nbLod - Math.log(minTextureSize) / Math.LN2;

            stateSet.addUniform(osg.Uniform.createFloat2([nbLod, maxLod], 'uEnvironmentLodRange'));
            stateSet.addUniform(osg.Uniform.createFloat2([w, w], 'uEnvironmentSize'));
            stateSet.addUniform(osg.Uniform.createInt1(0, 'uEnvironmentCube'));

            this.updateGlobalUniform(stateSet);

            stateSet.setTextureAttributeAndModes(0, texture);
        },

        setBackgroundEnvironment: function () {
            // set the stateSet of the environment geometry
            this._environmentStateSet.setAttributeAndModes(
                this.createShaderCubemap(['#define ' + this._config.format])
            );

            var backgroundCubemap = this._currentEnvironment.getBackgroundCubemap();
            var textureBackground = backgroundCubemap[this._config.format].getTexture();

            var w = textureBackground.getWidth();
            this._environmentStateSet.addUniform(
                osg.Uniform.createFloat2([w, w], 'uEnvironmentSize')
            );
            this._environmentStateSet.addUniform(osg.Uniform.createInt1(0, 'uEnvironmentCube'));
            this._environmentStateSet.setTextureAttributeAndModes(0, textureBackground);
        },

        setSphericalEnv: function () {
            this._environmentStateSet.addUniform(
                this._currentEnvironment.getSpherical()._uniformSpherical
            );
        },

        createScene: function () {
            this._environmentGeometry = this.createEnvironmentNode();
            this._environmentStateSet = this._environmentGeometry.getOrCreateStateSet();

            this._mainSceneNode = new osg.Node();

            var root = this._rootNode;

            var group = new osg.MatrixTransform();
            root.addChild(group);

            // add lod controller to debug
            this._lod = osg.Uniform.createFloat1(0.0, 'uLod');
            group.getOrCreateStateSet().addUniform(this._lod);

            if (!isMobileDevice()) {
                var integrateBRDFUniform = osg.Uniform.createInt1(
                    this._integrateBRDFTextureUnit,
                    'uIntegrateBRDF'
                );
                group.getOrCreateStateSet().addUniform(integrateBRDFUniform);
                this._stateSetBRDF = group.getOrCreateStateSet();
            }

            var promises = [];

            // precompute panorama
            P.all(promises).then(
                function () {
                    group.addChild(this.createSampleScene());

                    this.updateEnvironment();
                    // y up
                    osg.mat4.fromRotation(group.getMatrix(), -Math.PI / 2, [-1, 0, 0]);

                    var stateSet = root.getOrCreateStateSet();
                    stateSet.addUniform(
                        osg.Uniform.createInt(
                            window.METALLIC_ROUGHNESS_TEXTURE_UNIT,
                            'metallicRoughnessMap'
                        )
                    );
                    stateSet.addUniform(
                        osg.Uniform.createInt(window.NORMAL_TEXTURE_UNIT, 'normalMap')
                    );
                    stateSet.addUniform(
                        osg.Uniform.createInt(window.SPECULAR_TEXTURE_UNIT, 'specularMap')
                    );
                    stateSet.addUniform(
                        osg.Uniform.createInt(window.ALBEDO_TEXTURE_UNIT, 'albedoMap')
                    );

                    //PBR default uniforms
                    stateSet.addUniform(
                        osg.Uniform.createFloat4(
                            osg.vec4.fromValues(1.0, 1.0, 1.0, 1.0),
                            'uBaseColorFactor'
                        )
                    );
                    stateSet.addUniform(osg.Uniform.createFloat1(1.0, 'uMetallicFactor'));
                    stateSet.addUniform(osg.Uniform.createFloat1(1.0, 'uRoughnessFactor'));

                    //PBR default specular/glossiness
                    stateSet.addUniform(osg.Uniform.createFloat1(1.0, 'uGlossinessFactor'));
                    stateSet.addUniform(
                        osg.Uniform.createFloat3(osg.vec3.fromValues(1, 1, 1), 'uSpecularFactor')
                    );

                    this._viewer.getManipulator().computeHomePosition();
                }.bind(this)
            );

            return root;
        },

        run: function (canvas) {
            var viewer = (this._viewer = new osgViewer.Viewer(canvas, {
                preserveDrawingBuffer: true,
                premultipliedAlpha: false
            }));

            viewer.init();

            var gl = viewer.getState().getGraphicContext();
            console.log(gl.getSupportedExtensions());
            console.log(gl.getExtension('OES_texture_float'));
            var hasFloatLinear = gl.getExtension('OES_texture_float_linear');
            console.log(hasFloatLinear);
            var hasTextureLod = gl.getExtension('EXT_shader_texture_lod');
            console.log(hasTextureLod);

            var ready = [];

            ready.push(this.readShaders());
            // done outside
            //ready.push(this.createEnvironment(environment));

            P.all(ready).then(
                function () {
                    var root = this.createScene();
                    viewer.setSceneData(root);

                    viewer.setupManipulator();
                    viewer.getManipulator()._boundStrategy =
                        OSG.osgGA.Manipulator.COMPUTE_HOME_USING_BBOX;
                    viewer.getManipulator().computeHomePosition();
                    viewer.getManipulator().setComputeBoundNodeMaskOverride(0x0);

                    viewer.run();

                    osg.mat4.perspective(
                        viewer.getCamera().getProjectionMatrix(),
                        Math.PI / 180 * 30,
                        canvas.width / canvas.height,
                        0.1,
                        1000
                    );

                    if (!hasTextureLod) this._config.environmentType = 'panorama';

                    this.setEnvironment(environmentList[0]);

                    this.createSampleScene();

                    this._whenReadyDefer.resolve(this);
                }.bind(this)
            );
        },

        whenReady: function () {
            return this._viewerReady;
        },

        updateShaderPBR: function () {
            this._shaders.forEach(
                function (config) {
                    var stateSet = config.stateSet;

                    var shaderConfig = osg.objectMix({
                            environmentType: this._config.environmentType,
                            format: this._config.format,
                            mobile: this._config.mobile
                        },
                        config.config
                    );

                    var program = this.createShaderPBR(shaderConfig);

                    stateSet.setAttributeAndModes(program);
                }.bind(this)
            );
        },

        updateEnvironment: function () {
            if (!this._currentEnvironment) return;

            if (this._config.environmentType === 'cubemapSeamless') {
                this.setCubemapSeamless();
            } else {
                this.setPanorama();
            }

            if (!isMobileDevice())
                this._stateSetBRDF.setTextureAttributeAndModes(
                    this._integrateBRDFTextureUnit,
                    this._currentEnvironment.getIntegrateBRDF().getTexture()
                );

            this.setBackgroundEnvironment();
            this.updateEnvironmentRotation();
            this.updateShaderPBR();
        }
    };

    window.OSGJSExample = Example;
})();

var osg = window.OSG.osg;


var osgViewer = window.OSG.osgViewer;

var OSGJSViewer = {
    /**
     * Initializes the viewer
     */
    init: function () {

        window.App.setState({
            isLoading: true
        });

        this._promiseViewerReady = new Promise(function (resolveViewerReady, rejectViewerReady) {
            var viewerEl = document.querySelector('.viewer');
            viewerEl.innerHTML =
                '<div class="osgjsViewer"><div class="osgjsViewer__envs"></div><canvas></canvas></div>';

            var canvas = viewerEl.querySelector('canvas');
            var envsEl = viewerEl.querySelector('.osgjsViewer__envs');

            var example = new window.OSGJSExample();
            this._example = example;
            this._viewerEl = viewerEl;
            var promisesEnvs = [];
            [
                // 'unity_gareoult.zip',
                // 'unity_kirbycove.zip',
                'unity_muirwood.zip',
                'unity_seaside.zip',
                'unity_treasure_island.zip',
                'unity_trinitatis_church.zip'
            ].forEach(function (envURL) {
                var path = 'viewer/osgjs/environments/' + envURL;
                var promise = example.createEnvironment(path);
                promisesEnvs.push(promise);
                promise.then(function (env) {
                    var thumbnail = env.getThumbnailImage();

                    if (thumbnail) {
                        thumbnail.addEventListener('click', function () {
                            example.setEnvironment(env.name);
                        });
                        envsEl.appendChild(thumbnail);
                    }
                });
            });

            P.all(promisesEnvs).then(
                function () {
                    example.run(canvas);

                    // init custom animations...
                    example.whenReady().then(
                        function () {
                            var rootNode = example.getRootNode();
                            rootNode.addChild(window.CameraPlayer.debugNode);
                            rootNode.setName('SceneRootNode');
                            var cameraPlayer = new window.CameraPlayer(
                                rootNode,
                                example._viewer.getCamera(),
                                example._viewer.getManipulator()
                            );
                            this._cameraPlayer = cameraPlayer;
                            rootNode.addUpdateCallback(this._cameraPlayer);

                            window.startAnimation = function () {
                                cameraPlayer.start();
                            };

                            window.enableAnimation = function (state) {
                                cameraPlayer._enable = state;
                            };

                            var enableOrbitCamera = function () {
                                console.log('disable camera animation');
                                cameraPlayer._enable = false;
                            };

                            example._viewer
                                .getInputManager()
                                .group(osgViewer.InputGroups.ORBIT_MANIPULATOR)
                                .addMappings({
                                        onCursorDown: ['mousedown', 'touchstart']
                                    },
                                    enableOrbitCamera
                                );

                            window.App.setState({
                                isLoading: false
                            });
                            resolveViewerReady();
                        }.bind(this)
                    );

                }.bind(this)
            );
        }.bind(this));
    },

    /**
     * Loads a GLTF file
     * @param {Object} assetMap Key/value object. Filepaths are key, blob URLs are values.
     * @param {String} url Path of the root GLTF file
     */
    loadGltf: function (assetMap, url) {
        this._promiseViewerReady.then(function () {
            var example = this._example;
            var cameraPlayer = this._cameraPlayer;
            window.OSG.osgDB.fileHelper
                .resolveFilesMap(assetMap)
                .then(function (fm) {
                    return window.OSG.osgDB.readNodeURL(url, {
                        filesMap: fm
                    }).then(function (node) {
                        return example.whenReady().then(function () {
                            // console.time( 'build' );
                            var treeBuilder = new osg.KdTreeBuilder({
                                _numVerticesProcessed: 0,
                                _targetNumTrianglesPerLeaf: 50,
                                _maxNumLevels: 20
                            });
                            treeBuilder.apply(node);
                            example.setModel(node);
                            cameraPlayer.resetScene();
                            cameraPlayer.start();
                            return example;
                        });
                    });
                });
        }.bind(this));
    },

    /**
     * Renders the scene
     */
    render: function () {},

    loop: function () {},

    dispose: function () {
        this._example._viewer.setDone(true);
        this._viewerEl.innerHTML = '';
        this._cameraPlayer = undefined;
        this._example._viewer.getInputManager().setEnable('ui', false);
        this._example._viewer.getInputManager().setEnable('scene', false);
        this._example._viewer.dispose();
    }
};