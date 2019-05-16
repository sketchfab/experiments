var transmitToFrame = false;

var setRecordingTarget = function(recorder, apiSkfb) {
    //var rect = recorder.getBoundingClientRect();
    var apiMouseSend = function(type, e) {
        var options = {
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
        };
        apiSkfb[type](options);
    };

    recorder.addEventListener('mousemove', function(e) {
        if (!transmitToFrame) return;
        e.preventDefault();
        apiMouseSend('mouseMove', e);
    });

    recorder.addEventListener('mouseup', function(e) {
        if (!transmitToFrame) return;
        e.preventDefault();
        apiMouseSend('mouseUp', e);
    });

    recorder.addEventListener('mousedown', function(e) {
        if (!transmitToFrame) return;
        e.preventDefault();
        apiMouseSend('mouseDown', e);
    });

    recorder.addEventListener('click', function(e) {
        if (!transmitToFrame) return;
        e.preventDefault();
        apiMouseSend('mouseClick', e);
    });
    recorder.addEventListener('dblclick', function(e) {
        if (!transmitToFrame) return;
        e.preventDefault();
        apiMouseSend('mouseDblClick', e);
    });

    recorder.addEventListener('wheel', function(e) {
        if (!transmitToFrame) return;
        e.preventDefault();
        var options = {
            deltaX: e.deltaX,
            deltaY: -e.deltaY
        };
        apiSkfb.mouseWheel(options);
    });
    transmitToFrame = true;
};

var enableTransmitToIframe = function() {
    transmitToFrame = true;
};

var disableTransmitToIframe = function() {
    transmitToFrame = false;
};

var startRecording = function(apiSkfb) {
    // prevent sending mouse event during render :)
    apiSkfb.startRecord();
};

var endRecording = function(apiSkfb, App) {
    apiSkfb.endRecord(function(data) {
        App.recordedData = data;
    });
};
