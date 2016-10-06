function AnimationControls(api, options) {

    // API
    if (!api) {
        throw new Error('No Viewer API available');
    }
    this.api = api;

    // Options
    var defaults = {
        autoplay: false,
        onStateChange: null,
        onTime:null
    };
    this.options = options;

    // State
    this.state = {
        isPlaying: false,
        time: 0,
        isPollingTime: true,
        currentAnimation: null
    };

    this.init();
}

AnimationControls.prototype.init = function() {
    if (!this.api) {
        return;
    }
    this.api.getAnimations(function(err, animations){
        if (animations.length > 0) {
            this.api.setCurrentAnimationByUID(animations[0][0]);
            this.state.currentAnimation = {
                uid: animations[0][0],
                duration: animations[0][2]
            }
            this.api.pause();
            this.api.seekTo(0);
            this.api.setCycleMode( 'one' );
            this.api.setSpeed( 1 );
            this._pollTime();

            if (this.options.autoplay) {
                this.play();
            }
        }
    }.bind(this));
}

AnimationControls.prototype._pollTime = function _pollTime() {
    this.api.getCurrentTime(function(err, time) {
        this.state.time = time;

        if (typeof this.options.onTime === 'function') {
            this.options.onTime( this.state.time );
        }

        if (this.state.isPollingTime) {
            requestAnimationFrame(function(){
                this._pollTime();
            }.bind(this));
        }
    }.bind(this));
}

AnimationControls.prototype.getState = function() {
    return this.state.isPlaying;
}

AnimationControls.prototype.getDuration = function() {
    if (this.state.currentAnimation && this.state.currentAnimation.duration) {
        return this.state.currentAnimation.duration;
    } else {
        return undefined;
    }
}

AnimationControls.prototype.play = function( silent ) {
    if (this.state.isPlaying) {
        return;
    }
    this.api.play();
    this.state.isPlaying = true;

    if (!silent) {
        if (typeof this.options.onStateChange === 'function') {
            this.options.onStateChange( this.state.isPlaying );
        }
    }
}

AnimationControls.prototype.pause = function( silent ) {
    if (!this.state.isPlaying) {
        return;
    }
    this.api.pause();
    this.state.isPlaying = false;

    if (!silent) {
        if (typeof this.options.onStateChange === 'function') {
            this.options.onStateChange( this.state.isPlaying );
        }
    }
}

AnimationControls.prototype.playPause = function() {
    if (this.state.isPlaying) {
        this.pause();
    } else {
        this.play();
    }
    return this.state;
}

AnimationControls.prototype.seekTo = function(seconds) {
    var wasPlaying = this.state.isPlaying;
    this.pause(true);
    this.api.seekTo(seconds, function(){
        if (wasPlaying) {
            this.play(true);
        }
    }.bind(this));
}
