var CAMERA_DELTA = 0.00001;

var SketchfabViewerPlusMixin = {
    _skfbPlus: {
        timer: null,
        camera: null,
        cameraHash: null,
        previousCamera: {
            position: [0, 0, 0],
            target: [0, 0, 0]
        },
        annotations: null
    },
    getAnnotations: function(urlid, callback) {
        if (this._skfbPlus.annotations === null) {
            qwest.get('https://sketchfab.com/i/models/' + urlid + '/hotspots')
                .then(function(response) {
                    this._skfbPlus.annotations = response.results;
                    callback(this._skfbPlus.annotations);
                }.bind(this))
                .catch(function(e, url) {
                    this._skfbPlus.annotations = [];
                    callback(this._skfbPlus.annotations);
                }.bind(this));
        } else {
            callback(this._skfbPlus.annotations);
        }
    },
    goToAnnotation: function(index) {
        if (index < this._skfbPlus.annotations.length) {
            var annotation = this._skfbPlus.annotations[index];
            this.setCameraLookAt(annotation.eye, annotation.target);
        }
    },

    startCameraPolling: function() {
        var CAMERA_POLLING_INTERVAL = 1000;
        this._skfbPlus.timer = setInterval(function() {
            this.getCameraLookAt(function(dummy, camera) {
                this._skfbPlus.camera = camera;
                this._onCameraPolled();
            }.bind(this));
        }.bind(this), CAMERA_POLLING_INTERVAL);
    },

    _onCameraPolled: function() {
        // CAMERA_THRESHOLD = 10e9;
        // var camera = {
        //     position:[
        //         Math.round(this._skfbPlus.camera.position[0] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
        //         Math.round(this._skfbPlus.camera.position[1] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
        //         Math.round(this._skfbPlus.camera.position[2] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
        //     ],
        //     target:[
        //         Math.round(this._skfbPlus.camera.target[0] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
        //         Math.round(this._skfbPlus.camera.target[1] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
        //         Math.round(this._skfbPlus.camera.target[2] * CAMERA_THRESHOLD) / CAMERA_THRESHOLD,
        //     ]
        // };
        // var hash = JSON.stringify(camera);
        // if ( this._skfbPlus.cameraHash && this._skfbPlus.cameraHash === hash ) {
        //     console.log('idle');
        // } else {
        //     this._skfbPlus.cameraHash = hash;
        //     console.log('moving');
        // }

        var camera = this._skfbPlus.camera;
        var previousCamera = this._skfbPlus.previousCamera;

        var positionDistance = vec3.distance(
            vec3.fromValues(camera.position[0], camera.position[1], camera.position[2]),
            vec3.fromValues(previousCamera.position[0], previousCamera.position[1], previousCamera.position[2])
        );
        var targetDistance = vec3.distance(
            vec3.fromValues(camera.target[0], camera.target[1], camera.target[2]),
            vec3.fromValues(previousCamera.target[0], previousCamera.target[1], previousCamera.target[2])
        );

        this._skfbPlus.previousCamera = camera;
        var totalDistance = positionDistance + targetDistance;
        if (totalDistance < CAMERA_DELTA) {
            console.log('idle');
        } else {
            console.log('moving');
        }
    },

    getMaterialsByName: function(name, callback) {

        // Search material
        var materialsReady = function(name, materials, callback) {
            var match = [];
            for (var i = 0, l = materials.length; i < l; i++) {
                if (materials[i].name === name) {
                    match.push(materials[i]);
                }
            }

            if (match.length) {
                callback(null, match);
            } else {
                callback(new Error('Material not found'));
            }
        };

        this.getMaterialList(function(err, materials) {

            if (err) {
                callback(new Error('Can not get materials'));
            } else {
                this._skfbPlus.materials = materials;
                materialsReady(name, this._skfbPlus.materials, callback);
            }

        }.bind(this));

    }
}
