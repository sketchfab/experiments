//from: http://stackoverflow.com/questions/25744984/implement-a-kalman-filter-to-smooth-data-from-deviceorientation-api
//from: https://github.com/itamarwe/kalman

/* Kalman Filter for smoothing out position and rotation tracking data from AR markers. */

var PoseFilter = function () {
    this.estimationCertainty = 1;
    this.rotationalVariance = 1 / 180 * Math.PI;; // radians
    this.positionalVariance = 2; // pixels
    this.systemRotationVariance = 0; // radians
    this.systemPositionVariance = 0; // radians

    this.initialPositionVelocity = 0;
    this.initialRotationVelocity = 0;

    this.lastPosition;
    this.lastRotation;

    this.rotationFilters = [];
    this.positionFilters = [];

    this.createSingleParameterFilter = function ( value, velocity, systemVariance ) {
        var x_0 = $V( [ value, velocity ] );
        var P_0 = $M( [
            [ this.estimationCertainty, 0 ],
            [ 0, this.estimationCertainty ]
        ] );
        var F_k = $M( [
            [ 1, 1 ],
            [ 0, 1 ]
        ] );
        var Q_k = $M( [
            [ systemVariance, 0 ],
            [ 0, systemVariance ]
        ] );
        var KM = new KalmanModel( x_0, P_0, F_k, Q_k );
        return KM;
    };

    this.createSingleParameterObservation = function ( value, velocity, measurementVariance ) {
        var z_k = $V( [ value, velocity ] );
        var H_k = $M( [
            [ 1, 0 ],
            [ 0, 1 ]
        ] );
        var R_k = $M( [
            [ measurementVariance, 0 ],
            [ 0, measurementVariance ]
        ] );
        var KO = new KalmanObservation( z_k, H_k, R_k );
        return KO;
    };

    this.updateSingleParameterKalmanModel = function ( filter, observation ) {
        filter.update( observation );
        var elements = filter.x_k.elements;
        return elements;
    };

    this.updateFilters = function ( filters, values, velocities, variance ) {
        var observations = [];
        var filtered = [];
        for ( var i = 0; i < values.length; i++ ) {
            observations.push( this.createSingleParameterObservation( values[ i ], velocities[ i ], variance ) );
            filtered.push( this.updateSingleParameterKalmanModel( filters[ i ], observations[ i ] ) );
        }

        return filtered;
    };

    this.fixSingleAxisRotation = function ( newRotation, oldRotation ) {
        var min, max, diff, fixed;

        diff = Math.abs( oldRotation - newRotation );
        if ( diff >= Math.PI ) {
            if ( newRotation > oldRotation ) {
                fixed = newRotation - ( 2 * Math.PI );
            } else fixed = newRotation + ( 2 * Math.PI );
        } else fixed = newRotation;
        return fixed;
    };

    this.fixRotation = function ( newRotation, oldRotation ) {
        // TODO: should be using quaternions
        var xFix = this.fixSingleAxisRotation( newRotation[ 0 ], oldRotation[ 0 ] );
        var yFix = this.fixSingleAxisRotation( newRotation[ 1 ], oldRotation[ 1 ] );
        var zFix = this.fixSingleAxisRotation( newRotation[ 2 ], oldRotation[ 2 ] );
        return [ xFix, yFix, zFix ];
    };

    this.extractFirstValues = function ( arrays ) {
        var values = [];
        for ( var i = 0; i < arrays.length; i++ ) {
            values.push( arrays[ i ][ 0 ] );
        }
        return values;
    };

    this.getLastPosition = function () {
        return this.extractFirstValues( this.lastPosition );
    };

    this.getLastRotation = function () {
        return this.extractFirstValues( this.lastRotation );
    };

    this.updateRotations = function ( rotations ) {
        var last = this.getLastRotation();
        //rotations = this.fixRotation( rotations, last );
        var velocities = this.computeRotationVelocities( rotations, last );
        var filtered = this.updateFilters( this.rotationFilters, rotations, velocities, this.rotationalVariance );
        this.lastRotation = filtered;
        return filtered;
    };

    this.updatePositions = function ( positions ) {
        var velocities = this.computePositionVelocities( positions );
        var filtered = this.updateFilters( this.positionFilters, positions, velocities, this.positionalVariance );
        this.lastPosition = filtered;
        //console.log(this.lastPosition);
        return filtered;
    };

    this.initializeFilters = function ( values, velocities, filters, variance ) {
        filters.length = 0;
        for ( var i = 0; i < values.length; i++ ) {
            var newFilter = this.createSingleParameterFilter( values[ i ], velocities[ i ], variance );
            filters.push( newFilter );
        }
    };

    this.initializePositionFilters = function ( positions ) {
        var velocities = [ this.initialPositionVelocity, this.initialPositionVelocity, this.initialPositionVelocity ];
        this.initializeFilters( positions, velocities, this.positionFilters, this.systemPositionVariance );
        var init = [];
        for ( var i = 0; i < positions.length; i++ ) {
            init.push( [ positions[ i ], this.initialPositionVelocity ] )
        }
        this.lastPosition = init;
    };

    this.initializeRotationFilters = function ( rotations ) {
        var velocities = [ this.initialRotationVelocity, this.initialRotationVelocity, this.initialRotationVelocity ];
        this.initializeFilters( rotations, velocities, this.rotationFilters, this.systemRotationVariance );
        var init = [];
        for ( var i = 0; i < rotations.length; i++ ) {
            init.push( [ rotations[ i ], this.initialRotationVelocity ] )
        }
        this.lastRotation = init;
    };

    this.computeVelocities = function ( values, last ) {
        var velocities = [];
        for ( var i = 0; i < values.length; i++ ) {
            velocities.push( values[ i ] - last[ i ] );
        }
        return velocities;
    };

    this.computePositionVelocities = function ( positions ) {
        return this.computeVelocities( positions, this.getLastPosition() );
    };

    this.computeRotationVelocities = function ( rotations ) {
        return this.computeVelocities( rotations, this.getLastRotation() );
    };
}
