(function() {
    var DEBUG_CAMERA_GEOMETRY =
        window.optionsURL.debug !== undefined ? window.optionsURL.debug : false;

    var CAMERA_DURATION = 10.0;

    var osg = window.OSG.osg;

    // var CameraData = {
    //     duration: 1,
    //     start: {
    //         eye: [],
    //         target: []
    //     },
    //     end: {
    //         eye: [],
    //         target: []
    //     }
    // };

    var FindVisitor = function() {
        osg.NodeVisitor.call(this);
        this._nodes = [];
        this.apply = function(node) {
            if (node instanceof osg.Transform) {
                this._nodes.push(node);
            }
            this.traverse(node);
        };
    };
    FindVisitor.prototype = osg.NodeVisitor.prototype;

    var createRandomCameraData = function(bbox) {
        var center = osg.vec3.create();
        bbox.center(center);

        var size2 = bbox.radius2();
        var size = bbox.radius();

        var eyeStart = osg.vec3.create();
        var eyeEnd = osg.vec3.create();
        osg.vec3.random(eyeStart, size);
        osg.vec3.random(eyeEnd, size);

        eyeStart[2] /= 3.0;
        eyeEnd[2] /= 3.0;
        osg.vec3.add(eyeStart, eyeStart, center);
        osg.vec3.add(eyeEnd, eyeEnd, center);

        var data = {
            duration: CAMERA_DURATION,
            start: {
                eye: eyeStart,
                target: osg.vec3.clone(center)
            },
            end: {
                eye: eyeEnd,
                target: osg.vec3.clone(center)
            }
        };
        return data;
    };

    var Intersection = function(intersection) {
        this._point = osg.vec3.create();
        this._normal = osg.vec3.create();
        osg.vec3.transformMat4(
            this._point,
            intersection._localIntersectionPoint,
            intersection._matrix
        );

        var rotationOnly = osg.quat.create();
        osg.mat4.getRotation(rotationOnly, intersection._matrix);
        osg.vec3.transformQuat(this._normal, intersection._localIntersectionNormal, rotationOnly);
    };

    var lineSegmentIntersector = new window.OSG.osgUtil.LineSegmentIntersector();
    var intersectionVisitor = new window.OSG.osgUtil.IntersectionVisitor();
    intersectionVisitor.setTraversalMask(0x1);
    intersectionVisitor.setIntersector(lineSegmentIntersector);

    var sampleFace = function(scene, u, v, w, start, samples, pointOfInterests, checkOnlyFront) {
        var rayStart = osg.vec3.create();
        var rayEnd = osg.vec3.create();

        for (var i = 0; i < samples.length; i++) {
            // raystart = start + u * sample[i][0] + v * sample[i][1]
            osg.vec3.scaleAndAdd(rayStart, start, u, samples[i][0]);
            osg.vec3.scaleAndAdd(rayStart, rayStart, v, samples[i][1]);

            // rayend = raystart + w
            osg.vec3.add(rayEnd, rayStart, w);

            lineSegmentIntersector.reset();
            intersectionVisitor.reset();
            osg.NodeVisitor.prototype.reset.call(intersectionVisitor);
            lineSegmentIntersector.set(rayStart, rayEnd, 1e-5);

            scene.accept(intersectionVisitor);
            var results = lineSegmentIntersector.getIntersections();
            //console.log(i, results.length);
            // it means that we will not intersect with triangles at 5% in each direction of the bounding box
            // it avoids to hit all grounds shadow (not interesting)
            var threshold = 0.05;

            let min, max;
            min = 1.0;
            max = 0.0;
            let backIntersection, frontIntersection;
            backIntersection = undefined;
            frontIntersection = undefined;
            for (var j = 0; j < results.length; j++) {
                var intersection;
                intersection = results[j];
                var ratio;
                ratio = intersection._ratio;
                if (ratio < threshold || ratio > 1.0 - threshold) continue;

                if (intersection._backface) {
                    if (ratio > max) {
                        max = intersection._ratio;
                        backIntersection = intersection;
                    }
                } else {
                    if (ratio < min) {
                        min = intersection._ratio;
                        frontIntersection = intersection;
                    }
                }
            }
            if (!checkOnlyFront && backIntersection) {
                var backInt = new Intersection(backIntersection);
                pointOfInterests.push(backInt);
                if (DEBUG_CAMERA_GEOMETRY) addDebugLines(rayEnd, backInt._point, 1.0, 0.0, 0.0);
            }
            if (frontIntersection) {
                var frontInt = new Intersection(frontIntersection);
                pointOfInterests.push(frontInt);
                if (DEBUG_CAMERA_GEOMETRY) addDebugLines(rayStart, frontInt._point, 1.0, 0.0, 0.0);
            }
        }
    };

    var SampleScene = function(scene) {
        var nbSamples = 32;
        var pointOfInterests = [];

        var radicalInverse = function(a) {
            a = ((a << 16) | (a >>> 16)) >>> 0;
            a = (((a & 1431655765) << 1) | ((a & 2863311530) >>> 1)) >>> 0;
            a = (((a & 858993459) << 2) | ((a & 3435973836) >>> 2)) >>> 0;
            a = (((a & 252645135) << 4) | ((a & 4042322160) >>> 4)) >>> 0;
            return ((((a & 16711935) << 8) | ((a & 4278255360) >>> 8)) >>> 0) / 4294967296;
        };

        var hammersley2d = function(o, N, sample) {
            return osg.vec2.set(sample, o / N, radicalInverse(o));
        };

        var samples = [];
        for (let i = 0; i < nbSamples; i++) {
            var sample = osg.vec2.create();
            hammersley2d(i, nbSamples, sample);
            samples.push(sample);
        }

        var bbox = getSceneBoundingBox();
        if (DEBUG_CAMERA_GEOMETRY) addDebugBoundingBox(bbox);

        var u, v, w, start;
        // sample from y to -y
        u = osg.vec3.fromValues(bbox.xMin() - bbox.xMax(), 0.0, 0.0);
        v = osg.vec3.fromValues(0.0, 0.0, bbox.zMax() - bbox.zMin());
        w = osg.vec3.fromValues(0.0, bbox.yMin() - bbox.yMax(), 0.0);
        start = osg.vec3.fromValues(bbox.xMax(), bbox.yMax(), bbox.zMin());
        sampleFace(scene, u, v, w, start, samples, pointOfInterests);
        //console.log('founds 0 ', pointOfInterests.length);

        // sample from x to -x
        u = osg.vec3.fromValues(0.0, bbox.yMax() - bbox.yMin(), 0.0);
        v = osg.vec3.fromValues(0.0, 0.0, bbox.zMax() - bbox.zMin());
        w = osg.vec3.fromValues(bbox.xMin() - bbox.xMax(), 0.0, 0.0);
        start = osg.vec3.fromValues(bbox.xMax(), bbox.yMin(), bbox.zMin());
        sampleFace(scene, u, v, w, start, samples, pointOfInterests);
        // console.log('founds 1 ', pointOfInterests.length);

        // sample from z to -z
        u = osg.vec3.fromValues(bbox.xMax() - bbox.xMin(), 0.0, 0.0);
        v = osg.vec3.fromValues(0.0, bbox.yMax() - bbox.yMin(), 0.0);
        w = osg.vec3.fromValues(0.0, 0.0, bbox.zMin() - bbox.zMax());
        start = osg.vec3.fromValues(bbox.xMin(), bbox.yMin(), bbox.zMax());
        sampleFace(scene, u, v, w, start, samples, pointOfInterests, true);

        // console.log('founds 2 ', pointOfInterests.length);
        return pointOfInterests;
    };

    var addDebugBoundingBox = function(bbox) {
        var min = bbox.getMin();
        var max = bbox.getMax();
        var vec = osg.vec3.create();
        osg.vec3.sub(vec, max, min);

        var r = 0;
        var g = 0;
        var b = 1;

        addDebugLines(min, [min[0] + vec[0], min[1], min[2]], r, g, b);
        addDebugLines(min, [min[0], min[1] + vec[1], min[2]], r, g, b);
        addDebugLines(min, [min[0], min[1], min[2] + vec[2]], r, g, b);
        addDebugLines(max, [max[0] - vec[0], max[1], max[2]], r, g, b);
        addDebugLines(max, [max[0], max[1] - vec[1], max[2]], r, g, b);
        addDebugLines(max, [max[0], max[1], max[2] - vec[2]], r, g, b);
    };

    var addDebugSphere = function(position, size) {
        var mt = new osg.MatrixTransform();
        osg.mat4.fromTranslation(mt.getMatrix(), position);
        var sphere = osg.createTexturedSphereGeometry(size);
        mt.addChild(sphere);
        debugNode.addChild(mt);
    };

    //https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array#2450976
    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    };

    var sortPointOfInterest = function(scene, interests) {
        let bbox = getSceneBoundingBox();
        let center = osg.vec3.create();
        bbox.center(center);
        // var filterArray = interests.filter(function(element) {
        //     if (element._point[2] > center[2]) return true;
        //     return false;
        // });
        // if (filterArray.length < 10) filterArray = interests;

        let sortByHeight = function(a, b) {
            return b._point[2] - a._point[2];
        };
        interests.sort(sortByHeight);
        let filterArray = shuffle(interests);

        // set max number of interest point
        let MAX_POI = 64;
        if (filterArray.length > MAX_POI) filterArray.length = MAX_POI;

        if (DEBUG_CAMERA_GEOMETRY) {
            var size = bbox.radius() * 0.01;
            for (let i = 0; i < filterArray.length; i++) {
                addDebugSphere(filterArray[i]._point, size);
            }
        }

        return filterArray;
    };

    var TravelingMinDistanceRatio = window.TravelingMinDistanceRatio || 0.4;
    var TravelingMaxDistanceFromPOI = 2;

    var findTraveling = function(scene, interests) {
        // try to find nearest axis point of interests with a minimum distance
        var sceneSize = getSizeScene(scene);
        var size = sceneSize * 0.02; // 2%
        var distMin = sceneSize * TravelingMinDistanceRatio;

        var bbox = getSceneBoundingBox();
        var pp0 = osg.vec3.create();
        var pp1 = osg.vec3.create();

        var traveling = [];
        for (let j = 0; j < interests.length; j++) {
            var source = interests[j];
            for (let i = j + 1; i < interests.length; i++) {
                var candidate = interests[i];
                var dist = osg.vec3.dist(source._point, candidate._point);
                if (dist < distMin) continue;

                // check normals in the same direction
                var dot = osg.vec3.dot(source._normal, candidate._normal);
                if (dot <= 0) continue;
                let normal = osg.vec3.create();
                osg.vec3.add(normal, source._normal, candidate._normal);
                osg.vec3.normalize(normal, normal);

                // check the camera will not be under the minimum up position (like under the floor)
                var sizeWithRatio = size * TravelingMaxDistanceFromPOI;
                var normalSized = osg.vec3.scale(pp0, normal, sizeWithRatio);
                osg.vec3.add(pp1, candidate._point, normalSized);
                osg.vec3.add(pp0, source._point, normalSized);
                if (pp1[2] < bbox.zMin() || pp0[2] < bbox.zMin()) continue;

                traveling.push({
                    p0: source._point,
                    p1: candidate._point,
                    normal: normal
                });
            }
        }
        console.log(traveling);
        console.log('found traveling ', traveling.length);
        return traveling;
    };

    var SceneBoundingBox;
    var indexInterest = 0;
    var cameraDataAnimations = null;
    var cameraDataIndex = 0;
    var pointsOfInterests = null;

    var setCameraData = function(data) {
        cameraDataAnimations = data;
        cameraDataIndex = 0;
    };
    var getCameraData = function() {
        return cameraDataAnimations;
    };

    var setInterests = function(poi) {
        pointsOfInterests = poi;
    };
    var getInterests = function() {
        return pointsOfInterests;
    };

    var getNextCameraData = function() {
        console.log('return ', cameraDataIndex, ' cameraData');
        let cameraData = getCameraData()[cameraDataIndex];
        cameraDataIndex = (cameraDataIndex + 1) % getCameraData().length;
        return cameraData;
    };

    let MAX_CAMERA_MOTION = 32;
    let MAX_CAMERA_TRAVELING = Math.floor(MAX_CAMERA_MOTION * 3 / 5);
    var randomArray = [];
    for (let i = 0; i < MAX_CAMERA_MOTION; i++) {
        if (i < MAX_CAMERA_TRAVELING) {
            randomArray.push(1);
        } else {
            randomArray.push(0);
        }
    }
    randomArray = shuffle(randomArray);

    var createCameraDataFromScene = function(scene) {
        setCameraData(null);
        if (DEBUG_CAMERA_GEOMETRY) debugReset();

        osg.time('generate point of interests');
        var poi = SampleScene(scene);

        // sort point of interests
        poi = sortPointOfInterest(scene, poi);

        setInterests(poi);

        let cameraDataArray = [];

        let travelingArray = poi.length ? findTraveling(scene, poi) : [];
        console.log('number of poi', poi.length);
        let lastTravelingIndex = 0;

        let statsNbTraveling = 0;
        let statsNbFocus = 0;
        let statsNbRandom = 0;
        for (let i = 0; i < MAX_CAMERA_MOTION; i++) {
            // from 2 to 1
            let distanceFactor = 1.0 + (1.0 - i / MAX_CAMERA_MOTION);

            let generatedTraveling = false;
            let generatedFocusPOI = false;

            if (i < poi.length) {
                let useTraveling = randomArray[i] > 0;

                if (!travelingArray.length) useTraveling = false;

                if (useTraveling) {
                    for (let j = lastTravelingIndex; j < travelingArray.length; j++) {
                        let cameraData = generateTraveling(
                            scene,
                            travelingArray[j].p0,
                            travelingArray[j].p1,
                            travelingArray[j].normal,
                            distanceFactor
                        );
                        if (cameraData) {
                            lastTravelingIndex = j + 1;
                            cameraDataArray.push(cameraData);
                            generatedTraveling = true;
                            statsNbTraveling++;
                            break;
                        }
                    }
                    if (!generatedTraveling) {
                        lastTravelingIndex = travelingArray.length;
                    }
                }
                if (!generatedTraveling) {
                    let cameraData = computeEyeFromInteresectionAndNormal(
                        scene,
                        poi[i],
                        distanceFactor
                    );
                    if (cameraData) {
                        cameraDataArray.push(cameraData);
                        generatedFocusPOI = true;
                        statsNbFocus++;
                    }
                }
            }

            if (!generatedTraveling && !generatedFocusPOI) {
                cameraDataArray.push(createRandomCameraData(getSceneBoundingBox()));
                statsNbRandom++;
            }
        }
        console.log(
            'generated camera motions, nbTraveling',
            statsNbTraveling,
            'nbFocus',
            statsNbFocus,
            'nbRandom',
            statsNbRandom
        );
        setCameraData(cameraDataArray);
        osg.timeEnd('generate point of interests');
    };

    var getSceneBoundingBox = function() {
        return SceneBoundingBox;
    };

    var getSizeScene = function(scene) {
        var bbox = getSceneBoundingBox();
        var max = bbox.getMax();
        var min = bbox.getMin();
        var vec = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
        var dist = Math.min(vec[0], vec[1]);
        dist = Math.min(dist, vec[2]);
        return dist;
    };

    var checkIntersection = function(scene, p0, p1) {
        lineSegmentIntersector.reset();
        lineSegmentIntersector.set(p0, p1);
        intersectionVisitor.reset();
        scene.accept(intersectionVisitor);

        if (lineSegmentIntersector.getIntersections().length)
            return lineSegmentIntersector.getIntersections();
        return null;
    };

    var generateTraveling = function(scene, p0, p1, normal, distanceFactor) {
        var size = getSizeScene(scene);
        var distanceFromPointOfInterest = (distanceFactor || 1.0) * size;

        var startEye = osg.vec3.create();
        var stopEye = osg.vec3.create();

        osg.vec3.scaleAndAdd(startEye, p0, normal, distanceFromPointOfInterest);
        osg.vec3.scaleAndAdd(stopEye, p1, normal, distanceFromPointOfInterest);

        if (DEBUG_CAMERA_GEOMETRY) {
            addDebugLines(startEye, stopEye, 0, 1, 0);
        }

        var intersect = checkIntersection(scene, startEye, stopEye);
        if (intersect) {
            console.log('intersection, invalid traveling');
            return undefined;
        }

        var speedRange = window.speedRange || {
            min: 0.6,
            max: 0.8
        };

        var min = (speedRange.min * size) / CAMERA_DURATION;
        var max = (speedRange.max * size) / CAMERA_DURATION;

        var dist = osg.vec3.dist(startEye, stopEye);
        var speed = dist / CAMERA_DURATION;

        if (speed > max) {
            // let's adjust destinationn if 10% more than max
            let ratio = (speed - max) / max;
            if (ratio < 0.2) {
                console.log('adjust stop eye ', speed, max, ratio);
                let newStopEye = osg.vec3.create();
                stopEye = osg.vec3.lerp(newStopEye, startEye, stopEye, 1.0 - ratio);
            } else {
                console.log('too fast for travel motion ', speed, max, ratio);
                return undefined;
            }
        } else if (speed < min) {
            console.log('too slow for travel motion ', speed, min);
            return undefined;
        }

        //console.log('speed ', speed, min, max);

        var data = {
            duration: CAMERA_DURATION,
            start: {
                eye: startEye,
                target: p0
            },
            end: {
                eye: stopEye,
                target: p1
            }
        };
        return data;
    };

    var computeEyeFromInteresectionAndNormal = function(scene, intersection, distanceFactor) {
        var point = intersection._point;
        var normal = intersection._normal;

        if (normal[2] > 0.98) {
            // we dont want 0,0,1 vector, so use another one instead
            normal[0] = 0.1;
            normal[1] = 0.1;
            normal[2] = 0.9;
            osg.vec3.normalize(normal, normal);
        }

        var bbox = getSceneBoundingBox();

        // generate traveling a % of the radius of the scene
        var size = getSizeScene(scene) * distanceFactor;

        var up = osg.vec3.fromValues(0, 0, 1);
        var xAxis = osg.vec3.create();
        osg.vec3.cross(xAxis, normal, up);
        osg.vec3.normalize(xAxis, xAxis);

        var alignedNormal = osg.vec3.create();
        osg.vec3.cross(alignedNormal, up, xAxis);

        var quat = osg.quat.create();
        osg.quat.setAxisAngle(quat, xAxis, Math.PI / 6);
        osg.vec3.transformQuat(alignedNormal, alignedNormal, quat);
        normal = alignedNormal;

        // intersection is the point of intereset
        //                o     .
        //               /a\    |
        //              /   \   | N , size / 2
        //             /     \  v
        //            s<--d-->t
        //              size
        // angle a is fixed so d too, we need to compute the length of N to respect
        // the fixed contraints
        //
        // tan a/2 * b / 2 = N
        // Math.tan(a/2) * (size / 2) = N

        // startEye = point + N * distance - (xAxis * size * 0.5)
        // stopEye = point + N * distance + (xAxis * size * 0.5)
        var startEye = osg.vec3.create();
        var stopEye = osg.vec3.create();

        var centerEye = osg.vec3.create();
        var xAxisSized = osg.vec3.create();
        osg.vec3.scale(xAxisSized, xAxis, size / 2.0);
        osg.vec3.scaleAndAdd(centerEye, point, normal, size / 2.0);

        osg.vec3.add(startEye, centerEye, xAxisSized);
        osg.vec3.sub(stopEye, centerEye, xAxisSized);

        if (DEBUG_CAMERA_GEOMETRY) {
            addDebugLines(point, startEye);
            addDebugLines(point, stopEye);
            addDebugLines(startEye, stopEye);
        }

        var intersect = checkIntersection(scene, startEye, stopEye);
        if (intersect) {
            console.log('intersection, invalid path');
            return undefined;
        }

        var data = {
            duration: CAMERA_DURATION,
            start: {
                eye: startEye,
                target: osg.vec3.clone(point)
            },
            end: {
                eye: stopEye,
                target: osg.vec3.clone(point)
            }
        };
        return data;
    };

    // Needs to debug camera position

    var debugNode = new osg.Node();
    debugNode.setNodeMask(0x2);
    var debugIntersectionsGeometry;
    if (DEBUG_CAMERA_GEOMETRY) {
        debugIntersectionsGeometry = new osg.Geometry();
        debugIntersectionsGeometry.setName('debugGeometryLines');
        debugIntersectionsGeometry.setBound(new osg.BoundingBox());
        debugNode.addChild(debugIntersectionsGeometry);
    }

    var debugGeometryReset = function() {
        var geom = debugIntersectionsGeometry;
        if (!geom.getVertexAttributeList().Vertex) {
            var maxNbLines = 4000;
            var vt = new Float32Array(5 * maxNbLines * 2 * 3);
            var vc = new Float32Array(5 * maxNbLines * 2 * 3);
            var bf = new osg.BufferArray(osg.BufferArray.ARRAY_BUFFER, vt, 3);
            var bc = new osg.BufferArray(osg.BufferArray.ARRAY_BUFFER, vc, 3);
            geom.setVertexAttribArray('Vertex', bf);
            geom.setVertexAttribArray('Color', bc);
            geom.getPrimitiveSetList().push(new osg.DrawArrays(osg.primitiveSet.LINES, 0, 0));

            var shader = (function() {
                var vertexshader = [
                    '#ifdef GL_ES',
                    'precision highp float;',
                    '#endif',
                    'attribute vec3 Vertex;',
                    'attribute vec3 Color;',
                    'uniform mat4 uModelViewMatrix;',
                    'uniform mat4 uProjectionMatrix;',
                    'varying vec3 colors;',
                    '',
                    'void main(void) {',
                    '  colors = Color;',
                    '  gl_Position = uProjectionMatrix * (uModelViewMatrix * vec4(Vertex, 1.0));',
                    '}'
                ].join('\n');

                var fragmentshader = [
                    '#ifdef GL_ES',
                    'precision highp float;',
                    '#endif',
                    'varying vec3 colors;',

                    'void main(void) {',
                    'gl_FragColor = vec4(colors,1.0);',
                    '}'
                ].join('\n');

                var program = new osg.Program(
                    new osg.Shader('VERTEX_SHADER', vertexshader),
                    new osg.Shader('FRAGMENT_SHADER', fragmentshader)
                );

                return program;
            })();
            geom.getOrCreateStateSet().setAttribute(shader);
        }
        var vts = geom.getVertexAttributeList().Vertex.getElements();
        var drawArrays = geom.getPrimitiveSetList()[0];
        drawArrays.setCount(0);
        geom.dirtyBound();
        geom.setBound(new osg.BoundingBox());
    };

    var debugSphereReset = function() {
        debugNode.removeChildren();
        debugNode.addChild(debugIntersectionsGeometry);
    };

    var addDebugLines = function(p0, p1, ri, gi, bi) {
        var r = ri !== undefined ? ri : 0.0;
        var g = gi !== undefined ? gi : 0.0;
        var b = bi !== undefined ? bi : 0.0;

        var geom = debugIntersectionsGeometry;
        var vertexes = geom.getVertexAttributeList().Vertex.getElements();
        var colors = geom.getVertexAttributeList().Color.getElements();
        var drawArrays = geom.getPrimitiveSetList()[0];

        var i = drawArrays.getCount() / 2;
        vertexes[i * 2 * 3] = p0[0];
        vertexes[i * 2 * 3 + 1] = p0[1];
        vertexes[i * 2 * 3 + 2] = p0[2];

        vertexes[i * 2 * 3 + 3] = p1[0];
        vertexes[i * 2 * 3 + 4] = p1[1];
        vertexes[i * 2 * 3 + 5] = p1[2];

        colors[i * 2 * 3] = r;
        colors[i * 2 * 3 + 1] = g;
        colors[i * 2 * 3 + 2] = b;

        colors[i * 2 * 3 + 3] = r;
        colors[i * 2 * 3 + 4] = g;
        colors[i * 2 * 3 + 5] = b;

        drawArrays.setCount((i + 1) * 2);
        geom.getVertexAttributeList().Vertex.dirty();
        geom.getVertexAttributeList().Color.dirty();
        geom.dirty();
    };

    var addDebugIntersections = function(intersections) {
        var geom = debugIntersectionsGeometry;
        var vertex = osg.vec3.create();
        var normal = osg.vec3.create();
        var vn = osg.vec3.create();
        for (var i = 0; i < intersections.length; i++) {
            var intersection = intersections[i];
            osg.vec3.transformMat4(
                vertex,
                intersection._localIntersectionPoint,
                intersection._matrix
            );
            osg.vec3.copy(normal, intersection._localIntersectionNormal, intersection._matrix);
            osg.vec3.scaleAndAdd(vn, vertex, normal, 10.0);
            addDebugLines(vertex, vn);
        }
    };

    var CameraPlayer = function(rootNode, camera, manipulator) {
        this._rootNode = rootNode;
        this._camera = camera;
        this._eye = osg.vec3.create();
        this._target = osg.vec3.create();
        this._enable = false;
        this._manipulator = manipulator;
        this._preciseBoundingBoxVisitor = new osg.ComputePreciseBoundsVisitor();
        this._state = CameraPlayer.STOP;

        this.start = function(cameraData) {
            var path = cameraData;
            if (!path) {
                path = this._computeNewPath();
            }
            this._cameraData = path;
            this._startNextFrame = true;
            this._enable = true;
        };

        this.update = function(node, nv) {
            var t = nv.getFrameStamp().getSimulationTime();

            if (!this._cameraData) return true;

            // trigger a start animation on next update
            if (this._startNextFrame) {
                this._startNextFrame = false;
                this._startTime = t;
            }

            var dt = this.updateCamera(t);

            if (this._state === CameraPlayer.END) this.start();

            if (!this._enable) return true;
            osg.mat4.lookAt(this._camera.getViewMatrix(), this._eye, this._target, [0, 0, 1]);

            if (this._manipulator) this.syncManipulator(this._manipulator);

            return true;
        };

        this._computeNewPath = function() {
            return getNextCameraData();

            // if (!this._finder) {
            //     var finder = new FindVisitor();
            //     this._rootNode.accept(finder);
            //     console.log(finder._nodes);
            //     this._finder = finder;
            // }
            return cameraData;
        };

        this.updateCamera = function(t) {
            this._state = CameraPlayer.PLAYING;
            var dt = (t - this._startTime) / this._cameraData.duration;
            if (dt > 1.0) {
                this._state = CameraPlayer.END;
            }
            dt = Math.max(Math.min(1.0, dt), 0.0);
            osg.vec3.lerp(this._eye, this._cameraData.start.eye, this._cameraData.end.eye, dt);
            osg.vec3.lerp(
                this._target,
                this._cameraData.start.target,
                this._cameraData.end.target,
                dt
            );
            return dt;
        };
        this.syncManipulator = function(manipulator) {
            manipulator.setTarget(this._target);
            manipulator.setEyePosition(this._eye);
        };

        this.resetScene = function() {
            debugReset();
            indexInterest = 0;

            this._preciseBoundingBoxVisitor.reset();
            this._preciseBoundingBoxVisitor.setTraversalMask(1);
            this._rootNode.accept(this._preciseBoundingBoxVisitor);
            SceneBoundingBox = this._preciseBoundingBoxVisitor.getPreciseBoundingBox();
            createCameraDataFromScene(this._rootNode);
        };
    };
    CameraPlayer.STOP = 0;
    CameraPlayer.PLAYING = 1;
    CameraPlayer.END = 2;

    CameraPlayer.debugNode = debugNode;

    var debugReset = function() {
        if (!DEBUG_CAMERA_GEOMETRY) return;

        debugGeometryReset();
        debugSphereReset();
    };

    window.CameraPlayer = CameraPlayer;
})();
