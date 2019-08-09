(function(window) {
    'use strict';

    var playFrame = (function() {
        var cameraPosition = [0.0, 0.0, 0.0];
        var cameraTarget = [0.0, 0.0, 0.0];
        var event = {
            clientX: 0.0,
            clientY: 0.0,
            screenX: 0.0,
            screenY: 0.0,
            type: ''
        };
        return function(apiSkfb, dataRecorded, currentTime, currentPosition) {
            while (currentPosition < dataRecorded.length) {
                var timeStamp = dataRecorded[currentPosition];
                if (timeStamp > currentTime) break;
                var type = dataRecorded[currentPosition + 1];

                switch (type) {
                    case 1.0:
                        if (timeStamp === 0) {
                            cameraPosition[0] = dataRecorded[currentPosition + 2];
                            cameraPosition[1] = dataRecorded[currentPosition + 3];
                            cameraPosition[2] = dataRecorded[currentPosition + 4];

                            cameraTarget[0] = dataRecorded[currentPosition + 5];
                            cameraTarget[1] = dataRecorded[currentPosition + 6];
                            cameraTarget[2] = dataRecorded[currentPosition + 7];
                            apiSkfb.setCameraLookAt(cameraPosition, cameraTarget, 0);
                        }
                        break;

                    case 2.0:
                        event.clientX = dataRecorded[currentPosition + 2];
                        event.clientY = dataRecorded[currentPosition + 3];

                        event.ctrlKey = dataRecorded[currentPosition + 4];
                        event.shiftKey = dataRecorded[currentPosition + 5];
                        event.altKey = dataRecorded[currentPosition + 6];
                        apiSkfb.mouseClick(event);
                        break;

                    case 3.0:
                        event.deltaX = dataRecorded[currentPosition + 2];
                        event.deltaY = dataRecorded[currentPosition + 3];
                        apiSkfb.mouseWheel(event);
                        break;

                    case 4.0:
                        // only special mouse move, to prevent conflict between camera pos & camera drag
                        /*if (
                        dataRecorded[currentPosition + 4] ||
                        dataRecorded[currentPosition + 5] ||
                        dataRecorded[currentPosition + 6]
                    ) {*/
                        event.clientX = dataRecorded[currentPosition + 2];
                        event.clientY = dataRecorded[currentPosition + 3];

                        event.ctrlKey = dataRecorded[currentPosition + 4];
                        event.shiftKey = dataRecorded[currentPosition + 5];
                        event.altKey = dataRecorded[currentPosition + 6];
                        apiSkfb.mouseMove(event);
                        // }
                        break;

                    case 5.0:
                        event.clientX = dataRecorded[currentPosition + 2];
                        event.clientY = dataRecorded[currentPosition + 3];

                        event.ctrlKey = dataRecorded[currentPosition + 4];
                        event.shiftKey = dataRecorded[currentPosition + 5];
                        event.altKey = dataRecorded[currentPosition + 6];
                        apiSkfb.mouseDown(event);
                        break;

                    case 6.0:
                        event.clientX = dataRecorded[currentPosition + 2];
                        event.clientY = dataRecorded[currentPosition + 3];

                        event.ctrlKey = dataRecorded[currentPosition + 4];
                        event.shiftKey = dataRecorded[currentPosition + 5];
                        event.altKey = dataRecorded[currentPosition + 6];
                        apiSkfb.mouseUp(event);
                        break;

                    case 7.0:
                        event.clientX = dataRecorded[currentPosition + 2];
                        event.clientY = dataRecorded[currentPosition + 3];

                        event.ctrlKey = dataRecorded[currentPosition + 4];
                        event.shiftKey = dataRecorded[currentPosition + 5];
                        event.altKey = dataRecorded[currentPosition + 6];
                        apiSkfb.mouseDblClick(event);

                        break;

                    default:
                        console.log('error');
                }

                currentPosition += 8;

                if (currentPosition >= dataRecorded.length) {
                    return dataRecorded.length;
                }
            }

            return currentPosition;
        };
    })();

    window['playFrame'] = playFrame;
})(window);
