var urlid = 'a3bf1ef217244749819f07375aef244b';
var win = document.querySelector('.window');
var iframe = document.querySelector('#api-frame');
var cameraPath = [
    [-4.349537900272518, -29.060665608067357, 170],
    [-28.48952178099544, -37.41630136425083, 8]
];

var cameraPosition = null;
var initialCameraPosition = null;
var initialTouch = null;
var isDragging = false;
var cameraSpeed = -0.001;
var cameraScrollSpeed = 1.5;

function updateCamera() {
    if (viewer.api && viewer.camera && cameraPosition) {
        viewer.api.setCameraLookAt(cameraPosition, viewer.camera.target, 0);
    }
    requestAnimationFrame(updateCamera);
}

var viewer = new Viewer(urlid, iframe, function() {
    cameraPosition = vec3.fromValues(
        viewer.camera.position[0],
        viewer.camera.position[1],
        viewer.camera.position[2]
    );

    // Rotate camera based on interaction
    win.addEventListener('touchstart', onPointerStart);
    win.addEventListener('mousedown', onPointerStart);
    win.addEventListener('touchmove', onPointerMove);
    win.addEventListener('mousemove', onPointerMove);
    win.addEventListener('touchend', onPointerEnd);
    win.addEventListener('mouseup', onPointerEnd);
    updateCamera();
});
var scrollWindow = new ScrollWindow(win, function(progress) {
    // Viewer visibility
    var viewerEl = document.querySelector('.viewer');
    if (progress < 10 || progress > 80) {
        viewerEl.classList.remove('visible');
    } else {
        viewerEl.classList.add('visible');
    }

    // Move camera on Z axis
    if (cameraPosition) {
        var cameraProgress = Math.min(100, progress * cameraScrollSpeed);
        cameraPosition[2] =
            cameraPath[0][2] + ((cameraPath[1][2] - cameraPath[0][2]) / 100) * cameraProgress;
    }
});

function onPointerStart(e) {
    if (!cameraPosition) {
        return;
    }
    var x = e.touches ? e.touches[0].screenX : e.screenX;
    var y = e.touches ? e.touches[0].screenY : e.screenY;
    isDragging = true;
    initialTouch = [x, y];
    initialCameraPosition = vec3.clone(cameraPosition);
}

function onPointerMove(e) {
    if (!cameraPosition) {
        return;
    }

    if (!isDragging) {
        return;
    }

    var x = e.touches ? e.touches[0].screenX : e.screenX;
    var y = e.touches ? e.touches[0].screenY : e.screenY;
    var delta = [x - initialTouch[0], y - initialTouch[1]];
    var angle = Math.PI * delta[0] * cameraSpeed;
    var out = vec3.create();
    var cameraTargetVec = vec3.create(
        viewer.camera.target[0],
        viewer.camera.target[1],
        viewer.camera.target[2]
    );
    vec3.rotateZ(out, initialCameraPosition, cameraTargetVec, angle);
    vec3.set(cameraPosition, out[0], out[1], cameraPosition[2]);
}

function onPointerEnd(e) {
    isDragging = false;
}
