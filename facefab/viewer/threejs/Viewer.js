//SETTINGS of this demo :
var SETTINGS = {
  rotationOffsetX: 0, //negative -> look upper. in radians
  cameraFOV: 40, //in degrees, 3D camera FOV
  pivotOffsetYZ: [0.2, 0.2], //XYZ of the distance between the center of the cube and the pivot
  detectionThreshold: 0.5, //sensibility, between 0 and 1. Less -> more sensitive
  detectionHysteresis: 0.1,
  scale: 1 //scale of the 3D cube
};

//some globalz :
var THREEVIDEOTEXTURE,
  THREERENDERER,
  THREEFACEOBJ3D,
  THREEFACEOBJ3DPIVOTED,
  THREESCENE,
  THREECAMERA,
  MOUTHOPENINGMATERIALS = [],
  TIGERMOUTHHIDEMESH = false;
var ISDETECTED = false;

var calibrate = false;

//callback : launched if a face is detected or lost.
function detect_callback(isDetected) {
  if (isDetected) {
    console.log("INFO in detect_callback() : DETECTED");
  } else {
    console.log("INFO in detect_callback() : LOST");
  }
}

function build_customMaskMaterial(textureURL) {
  var vertexShaderSource = THREE.ShaderLib.lambert.vertexShader;
  vertexShaderSource = vertexShaderSource.replace(
    "void main() {",
    "varying vec3 vPos; uniform float mouthOpening; void main(){ vPos=position;"
  );
  var glslSource = [
    "float isLowerJaw=step(position.y+position.z*0.2, 0.0);//-0.13);",
    //'transformed+=vec3(0., -0.1, 0.)*isLowerJaw*mouthOpening;'
    "float theta=isLowerJaw*mouthOpening*3.14/12.0;float thetSin = sin(theta):float thetCos= cos(theta);",
    "transformed.yz=mat2(thetCos, thetSin,-thetSin, thetCos)*transformed.yz;"
  ].join("\n");
  vertexShaderSource = vertexShaderSource.replace(
    "#include <begin_vertex>",
    "#include <begin_vertex>\n" + glslSource
  );

  var fragmentShaderSource = THREE.ShaderLib.lambert.fragmentShader;
  glslSource = [
    "float alphaMask=1.0;", //initialize the opacity coefficient (1.0->fully opaque)
    "vec2 pointToEyeL=vPos.xy-vec2(0.25,0.15);", //position of left eye
    "vec2 pointToEyeR=vPos.xy-vec2(-0.25,0.15);", //position of right eye
    "alphaMask*=smoothstep(0.05, 0.2, length(vec2(0.6,1.)*pointToEyeL));", //left eye fading
    "alphaMask*=smoothstep(0.05, 0.2, length(vec2(0.6,1.)*pointToEyeR));", //left eye fading
    "alphaMask=max(alphaMask, smoothstep(0.65, 0.75, vPos.z));", //force the nose opaque
    "float isDark=step(dot(texelColor.rgb, vec3(1.,1.,1.)), 1.0);",
    "alphaMask=mix(alphaMask, 1., isDark);", //only make transparent light parts'
    "vec2 uvVp=gl_FragCoord.xy/resolution;", //2D position in the viewport (between 0 and 1)
    "float scale=0.03/vPos.z;", //scale of the distorsion in 2D
    "vec2 uvMove=vec2(-sign(vPos.x), -1.5)*scale;", //video distorsion. the sign() distinguish between left and right face side
    "vec4 videoColor=texture2D(samplerVideo, uvVp+uvMove);",
    "float videoColorGS=dot(vec3(0.299, 0.587, 0.114),videoColor.rgb);", //grayscale value of the video pixel
    "videoColor.rgb=videoColorGS*vec3(1.5,0.6,0.0);", //color video with orange
    "gl_FragColor=mix(videoColor, gl_FragColor, alphaMask);" //mix video background with mask color
  ].join("\n");
  fragmentShaderSource = fragmentShaderSource.replace(
    "void main() {",
    "varying vec3 vPos; uniform sampler2D samplerVideo; uniform vec2 resolution; void main(){"
  );
  fragmentShaderSource = fragmentShaderSource.replace(
    "#include <dithering_fragment>",
    "#include <dithering_fragment>\n" + glslSource
  );

  var mat = new THREE.ShaderMaterial({
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    uniforms: Object.assign(
      {
        samplerVideo: { value: THREEVIDEOTEXTURE },
        resolution: {
          value: new THREE.Vector2(
            THREERENDERER.getSize().width,
            THREERENDERER.getSize().height
          )
        },
        mouthOpening: { value: 0 }
      },
      THREE.ShaderLib.lambert.uniforms
    ),
    lights: true,
    transparent: true
  });

  mat.extensions.derivatives = true;
  mat.derivatives = true;
  var texture = new THREE.TextureLoader().load(textureURL);
  mat.uniforms.map = { value: texture };
  mat.map = texture;

  MOUTHOPENINGMATERIALS.push(mat);
  return mat;
}

//build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec) {
  var gl = spec.GL;

  console.log(gl.getSupportedExtensions());
  console.log(gl.getExtension("OES_texture_float"));
  var hasFloatLinear = gl.getExtension("OES_texture_float_linear");
  console.log(hasFloatLinear);
  var hasTextureLod = gl.getExtension("EXT_shader_texture_lod");
  console.log(hasTextureLod);

  //INIT THE THREE.JS context
  THREERENDERER = new THREE.WebGLRenderer({
    context: spec.GL,
    canvas: spec.canvasElement
  });

  var gl = THREERENDERER.getContext();
  console.log(gl.getSupportedExtensions());
  console.log(gl.getExtension("OES_texture_float"));
  var hasFloatLinear = gl.getExtension("OES_texture_float_linear");
  console.log(hasFloatLinear);
  var hasTextureLod = gl.getExtension("EXT_shader_texture_lod");
  console.log(hasTextureLod);

  //COMPOSITE OBJECT WHICH WILL FOLLOW THE HEAD
  //in fact we create 2 objects to be able to shift the pivot point
  THREEFACEOBJ3D = new THREE.Object3D();
  THREEFACEOBJ3D.frustumCulled = false;
  THREEFACEOBJ3DPIVOTED = new THREE.Object3D();
  THREEFACEOBJ3DPIVOTED.frustumCulled = false;
  THREEFACEOBJ3DPIVOTED.position.set(
    0,
    -SETTINGS.pivotOffsetYZ[0],
    -SETTINGS.pivotOffsetYZ[1]
  );
  THREEFACEOBJ3DPIVOTED.scale.set(
    SETTINGS.scale,
    SETTINGS.scale,
    SETTINGS.scale
  );
  THREEFACEOBJ3D.add(THREEFACEOBJ3DPIVOTED);

  var loadTiger = false;
  if (loadTiger) {
    //LOAD THE TIGGER MESH
    var tigerMaskLoader = new THREE.BufferGeometryLoader();
    tigerMaskLoader.load("vendors/TigerHead.json", function(tigerMaskGeom) {
      var tigerFaceSkinMat = build_customMaskMaterial(
        "vendors/headTexture2.png"
      );
      var tigerEyesMat = build_customMaskMaterial("vendors/white.png");

      var whiskersMat = new THREE.MeshLambertMaterial({
        color: 0xffffff
      });
      var insideEarsMat = new THREE.MeshBasicMaterial({
        color: 0x331100
      });
      var tigerMaskMesh = new THREE.Mesh(tigerMaskGeom, [
        whiskersMat,
        tigerEyesMat,
        tigerFaceSkinMat,
        insideEarsMat
      ]);
      tigerMaskMesh.scale.set(2, 3, 2);
      tigerMaskMesh.position.set(0, 0.2, -0.48);

      //small black quad to hide inside the mouth
      //(visible only if the user opens the mouth)
      TIGERMOUTHHIDEMESH = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(0.5, 0.6),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      TIGERMOUTHHIDEMESH.position.set(0, -0.35, 0.5);
      THREEFACEOBJ3DPIVOTED.add(tigerMaskMesh, TIGERMOUTHHIDEMESH);
    });
  }

  //CREATE THE SCENE
  THREESCENE = new THREE.Scene();
  THREESCENE.add(THREEFACEOBJ3D);

  //AND THERE WAS LIGHT
  var ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  var dirLight = new THREE.DirectionalLight(0xff8833, 2);
  dirLight.position.set(0, 0.5, 1);

  THREESCENE.add(ambientLight, dirLight);

  //init video texture with red
  THREEVIDEOTEXTURE = new THREE.DataTexture(
    new Uint8Array([255, 0, 0]),
    1,
    1,
    THREE.RGBFormat
  );
  THREEVIDEOTEXTURE.needsUpdate = true;

  //CREATE THE VIDEO BACKGROUND
  var videoMaterial = new THREE.RawShaderMaterial({
    depthWrite: false,
    depthTest: false,
    vertexShader:
      "attribute vec2 position;\n\
            varying vec2 vUV;\n\
            void main(void){\n\
                gl_Position=vec4(position, 0., 1.);\n\
                vUV=0.5+0.5*position;\n\
            }",
    fragmentShader:
      "precision lowp float;\n\
            uniform sampler2D samplerVideo;\n\
            varying vec2 vUV;\n\
            void main(void){\n\
                gl_FragColor=texture2D(samplerVideo, vUV);\n\
            }",
    uniforms: {
      samplerVideo: { value: THREEVIDEOTEXTURE }
    }
  });

  videoMaterial.extensions.derivatives = true;
  videoMaterial.derivatives = true;

  var videoGeometry = new THREE.BufferGeometry();
  var videoScreenCorners = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
  videoGeometry.addAttribute(
    "position",
    new THREE.BufferAttribute(videoScreenCorners, 2)
  );
  videoGeometry.setIndex(
    new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1)
  );
  var videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
  videoMesh.onAfterRender = function() {
    //replace THREEVIDEOTEXTURE.__webglTexture by the real video texture
    THREERENDERER.properties.update(
      THREEVIDEOTEXTURE,
      "__webglTexture",
      spec.videoTexture
    );
    delete videoMesh.onAfterRender;
  };
  videoMesh.renderOrder = -1000; //render first
  videoMesh.frustumCulled = false;
  THREESCENE.add(videoMesh);

  //CREATE THE CAMERA
  var aspecRatio = spec.canvasElement.width / spec.canvasElement.height;
  THREECAMERA = new THREE.PerspectiveCamera(
    SETTINGS.cameraFOV,
    aspecRatio,
    0.1,
    100
  );
} //end init_threeScene()

var ThreeViewer = {
  init: function() {
    JEEFACEFILTERAPI.init({
      canvasId: "jeeFaceFilterCanvas",
      NNCpath: "vendors/", //root of NNC.json file
      callbackReady: function(errCode, spec) {
        if (errCode) {
          console.log("AN ERROR HAPPENS. SORRY BRO :( . ERR =", errCode);
          return;
        }

        console.log("INFO : JEEFACEFILTERAPI IS READY");
        init_threeScene(spec);

        var controls = new THREE.OrbitControls(
          THREECAMERA,
          document.getElementById("jeeFaceFilterCanvas")
        );
        controls.enableKeys = true;
        THREECAMERA.position.set(0, 0, 1.0);
        THREECAMERA.lookAt(0, 0, 0);
        controls.target = new THREE.Vector3(0, 0, 0);
        this.camera = THREECAMERA;
        controls.update();
        this.controls = controls;
      }.bind(this), //end callbackReady()

      //called at each render iteration (drawing loop)
      callbackTrack: function(detectState) {
        if (calibrate) {
          this.controls.update();
        } else {
          if (
            ISDETECTED &&
            detectState.detected <
              SETTINGS.detectionThreshold - SETTINGS.detectionHysteresis
          ) {
            //DETECTION LOST
            detect_callback(false);
            ISDETECTED = false;
          } else if (
            !ISDETECTED &&
            detectState.detected >
              SETTINGS.detectionThreshold + SETTINGS.detectionHysteresis
          ) {
            //FACE DETECTED
            detect_callback(true);
            ISDETECTED = true;
          }

          if (ISDETECTED) {
            //move the cube in order to fit the head
            var tanFOV = Math.tan(
              THREECAMERA.aspect * THREECAMERA.fov * Math.PI / 360
            ); //tan(FOV/2), in radians
            var W = detectState.s; //relative width of the detection window (1-> whole width of the detection window)
            var D = 1 / (2 * W * tanFOV); //distance between the front face of the cube and the camera

            //coords in 2D of the center of the detection window in the viewport :
            var xv = detectState.x;
            var yv = detectState.y;

            //coords in 3D of the center of the cube (in the view coordinates system)
            var z = -D - 0.5; // minus because view coordinate system Z goes backward. -0.5 because z is the coord of the center of the cube (not the front face)
            var x = xv * D * tanFOV;
            var y = yv * D * tanFOV / THREECAMERA.aspect;

            //move and rotate the cube
            THREEFACEOBJ3D.position.set(
              x,
              y + SETTINGS.pivotOffsetYZ[0],
              z + SETTINGS.pivotOffsetYZ[1]
            );
            THREEFACEOBJ3D.rotation.set(
              detectState.rx + SETTINGS.rotationOffsetX,
              detectState.ry,
              detectState.rz,
              "XYZ"
            );
          }

          //reinitialize the state of THREE.JS because JEEFACEFILTER have changed stuffs
          THREERENDERER.state.reset();

          if (ISDETECTED) {
            //update mouth opening
            var mouthOpening = (detectState.expressions[0] - 0.2) * 5;
            mouthOpening = Math.min(Math.max(mouthOpening, 0), 1);

            MOUTHOPENINGMATERIALS.forEach(function(mat) {
              mat.uniforms.mouthOpening.value = mouthOpening;
            });
            if (TIGERMOUTHHIDEMESH) {
              TIGERMOUTHHIDEMESH.scale.setY(1 + mouthOpening * 0.4);
            }
          }

          //TWEEN.update();
        }
        //trigger the render of the THREE.JS SCENE
        THREERENDERER.render(THREESCENE, THREECAMERA);
      }.bind(this) //end callbackTrack()
    }); //end JEEFACEFILTERAPI.init call
  }, //end init()

  _emptyScene: function() {
    this._hasAsset = false;
    for (var i = 0, l = THREEFACEOBJ3DPIVOTED.children.length; i < l; i++) {
      if (THREEFACEOBJ3DPIVOTED.children[i].name === "OSG_Scene") {
        THREEFACEOBJ3DPIVOTED.remove(THREEFACEOBJ3DPIVOTED.children[i]);
      }
    }
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
        //ThreeViewer.scene.add(gltf.scene);

        THREEFACEOBJ3DPIVOTED.add(gltf.scene);

        //Normalize scene scale
        var TARGET_SIZE = 3;
        var bbox = new THREE.Box3().setFromObject(gltf.scene);
        var maxSide = Math.max(
          bbox.max.x - bbox.min.x,
          bbox.max.y - bbox.min.y,
          bbox.max.z - bbox.min.z
        );
        var ratio = TARGET_SIZE / maxSide;
        gltf.scene.scale.set(ratio, ratio, ratio);

        //Center scene
        var centerX =
          bbox.min.x * ratio * -1 - (bbox.max.x - bbox.min.x) / 2 * ratio;
        var centerY = bbox.min.y * ratio * -1;
        var centerZ =
          bbox.min.z * ratio * -1 - (bbox.max.z - bbox.min.z) / 2 * ratio;
        gltf.scene.translateX(centerX);
        gltf.scene.translateY(centerY - 1.5);
        gltf.scene.translateZ(centerZ);

        //Update materials with env
        if (ThreeViewer.environment) {
          gltf.scene.traverse(function(node) {
            if (node.material && "envMap" in node.material) {
              node.material.envMap = ThreeViewer.environment;
              node.material.needsUpdate = true;
            }
          });
        }

        this._hasAsset = true;
      }.bind(this),
      undefined,
      function(error) {
        console.error(error);
      }
    );
  }
};
