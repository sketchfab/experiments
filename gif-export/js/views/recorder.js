var setRecordingTarget = function(recorder) {
    var rect = recorder.getBoundingClientRect();
    var apiMouseSend = function(type, e) {
        var options = {
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX - rect.left,
            clientY: e.clientY - rect.top,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
        };
        apiSkfb[type](options, function() {
            recorder.focus();
        });

        recorder.focus();
    };

    recorder.addEventListener('mousemove', function(e) {
        apiMouseSend('mouseMove', e);
    });

    recorder.addEventListener('mouseup', function(e) {
        apiMouseSend('mouseUp', e);
    });

    recorder.addEventListener('mousedown', function(e) {
        apiMouseSend('mouseDown', e);
    });

    recorder.addEventListener('click', function(e) {
        apiMouseSend('mouseClick', e);
    });

    recorder.addEventListener('wheel', function(e) {
        var options = {
            deltaX: e.deltaX,
            deltaY: e.deltaY
        };
        apiSkfb.mouseWheel(options, function() {
            recorder.focus();
        });
        recorder.focus();
    });
    var keepFocus;
    keepFocus = function() {
        recorder.focus();
        requestAnimationFrame(keepFocus);
    };
    keepFocus();
};

var startRecording = function() {
    apiSkfb.startRecord();
};

var endRecording = function(App) {
    apiSkfb.endRecord(function(data) {
        App.recordData = data;
    });
};
