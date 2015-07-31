'use strict';

var BezierEasing = require('bezier-easing');

var Animations = {

    turntable: function turntable(camera, i, total) {
        var inc = (2 * Math.PI) / total;
        var angle = inc * i;
        var distance = Math.sqrt(
            Math.pow(camera.target[0] - camera.position[0], 2) +
            Math.pow(camera.target[1] - camera.position[1], 2)
        );
        var x = distance * Math.cos(angle) + camera.target[0];
        var y = distance * Math.sin(angle) + camera.target[1];
        var position = [x, y, camera.position[2]];

        return {
            position: [x, y, camera.position[2]],
            target: camera.target.slice()
        };
    },

    zoom: function zoom(camera, i, total) {
        return {
            position: [10 * (total - i), 0, camera.position[2]],
            target: camera.target.slice()
        };
    },

    annotations: function annotations(camera, i, total, annotations) {

        var easing = BezierEasing(1.000, 0.000, 0.000, 1.000);
        var j = Math.min(Math.floor(i / total * annotations.length), annotations.length - 1);
        var substepPercent = i / total * annotations.length - j;

        var current = annotations[j];
        var next = annotations[j < annotations.length - 1 ? (j + 1) : 0];

        var distances = {
            position: [
                (next.eye[0] - current.eye[0]), (next.eye[1] - current.eye[1]), (next.eye[2] - current.eye[2]),
            ],
            target: [
                (next.target[0] - current.target[0]), (next.target[1] - current.target[1]), (next.target[2] - current.target[2]),
            ]
        };

        return {
            position: [
                current.eye[0] + distances.position[0] * easing(substepPercent),
                current.eye[1] + distances.position[1] * easing(substepPercent),
                current.eye[2] + distances.position[2] * easing(substepPercent),
            ],
            target: [
                current.target[0] + distances.target[0] * easing(substepPercent),
                current.target[1] + distances.target[1] * easing(substepPercent),
                current.target[2] + distances.target[2] * easing(substepPercent),
            ]
        };

    }
}

module.exports = Animations;
