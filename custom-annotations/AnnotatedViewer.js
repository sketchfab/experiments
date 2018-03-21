function distance3d(a, b) {
    return Math.sqrt(
        Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)
    );
}

function distance2d(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

var MIN_ANNOTATION_SCALE = 0.5;

function AnnotatedViewer(iframe, layer, description, uid, annotations) {
    this.el = iframe;
    this.layer = layer;
    this.description = description;

    this.uid = uid;
    this.annotations = annotations.map(function(annotation) {
        return {
            position3d: annotation.position,
            position2d: null,
            distance: null,
            description: annotation.description
        };
    });
    this.maxDistance = 0;
    this.annotationEls = null;
    this.camera = null;
    this.client = new Sketchfab(this.el);
    this.api = null;

    this.updateAnnotation = this.updateAnnotation.bind(this);
    this.onTick = this.onTick.bind(this);
    this.onUpdateCamera = this.onUpdateCamera.bind(this);
    this.onClick = this.onClick.bind(this);

    this.selectedAnnotation = null;

    this.screen = true;
    this.materialOff = null;
    this.materialOn = null;

    this.init();
}

AnnotatedViewer.prototype = {
    init: function() {
        this.client.init(this.uid, {
            ui_annotations: 0,
            annotations_visible: 0,
            ui_infos: 0,
            camera: 0,
            success: function onSuccess(api) {
                api.start();
                api.addEventListener(
                    'viewerready',
                    function() {
                        this.api = api;
                        this.onTick();
                        this._buildDOM();

                        api.getMaterialList(
                            function(err, materials) {
                                materials.forEach(
                                    function(material) {
                                        if (material.name === 'screen') {
                                            this.materialOn = material;
                                            this.materialOff = JSON.parse(JSON.stringify(material));
                                            this.materialOff.channels['AlbedoPBR'].color = [0,0,0];
                                            this.materialOff.channels['AlbedoPBR'].texture = null;
                                            this.materialOff.channels['EmitColor'].color = [0,0,0];
                                            this.materialOff.channels['EmitColor'].texture = null;
                                            this.toggleScreen();
                                        }
                                    }.bind(this)
                                );
                            }.bind(this)
                        );
                    }.bind(this)
                );
                api.addEventListener('click', this.onClick);
            }.bind(this),
            error: function onError() {
                console.log('Viewer error');
            }
        });
    },

    _buildDOM: function() {
        var html = this.annotations.map(function(annotation, i) {
            return `<span class="annotation" data-id="${i}" style="transform: translate(-100%, -100%)"></span>`;
        }).join('');
        this.layer.innerHTML = html;
        this.annotationEls = Array.from(this.layer.querySelectorAll('.annotation'));
    },

    onClick: function(e) {
        var closest = null;
        var maxDistance = +Infinity;
        var distance;
        for (var i = 0, l = this.annotations.length; i < l; i++) {
            distance = distance2d(this.annotations[i].position2d, e.position2D);
            if (distance < maxDistance) {
                closest = i;
                maxDistance = distance;
            }
        }

        if (maxDistance < 30) {
            this.selectedAnnotation = closest;
        } else {
            this.selectedAnnotation = null;
        }

        this.renderAnnotation();
    },

    toggleScreen: function() {
        this.screen = !this.screen;
        if (this.screen) {
            this.api.setMaterial(this.materialOn);
        } else {
            this.api.setMaterial(this.materialOff);
        }
    },

    renderAnnotation: function() {

        if (this.selectedAnnotation !== null) {

            if (this.selectedAnnotation === 0) {
                this.toggleScreen();
                return;
            }

            this.description.innerHTML = this.annotations[this.selectedAnnotation].description;
            if (this.description.className.indexOf(' --active') === -1) {
                this.description.className += ' --active';
            }
        } else {
            this.description.className = this.description.className.replace(' --active', '');
            this.description.innerHTML = '';
        }
    },

    onTick: function onTick() {
        this.annotations.forEach(this.updateAnnotation);
        this.updateCamera();
        requestAnimationFrame(this.onTick);
    },

    updateCamera: function() {
        this.api.getCameraLookAt(this.onUpdateCamera);
    },

    onUpdateCamera: function(err, camera) {
        this.camera = camera;
        this.maxDistance = 0;
        this.minDistance = +Infinity;
        for (var i = 0, l = this.annotations.length; i < l; i++) {
            this.annotations[i].distance = distance3d(
                this.annotations[i].position3d,
                camera.position
            );
            this.maxDistance = Math.max(this.maxDistance, this.annotations[i].distance);
            this.minDistance = Math.min(this.minDistance, this.annotations[i].distance);
        }
    },

    updateAnnotation: function updateAnnotation(annotation, i) {
        function setPosition(coord) {
            annotation.position2d = coord.canvasCoord;
            if (this.annotationEls) {
                var transform = `translate(${coord.canvasCoord[0]}px, ${coord.canvasCoord[1]}px)`;
                if (this.annotations[i].distance) {
                    var ratio =
                        this.annotations[i].distance / (this.maxDistance - this.minDistance);
                    transform += ` scale(${Math.max(MIN_ANNOTATION_SCALE, 1 - ratio)})`;
                }
                this.annotationEls[i].style.transform = transform;
            }
        }

        this.api.getWorldToScreenCoordinates(annotation.position3d, setPosition.bind(this));
    }
};
