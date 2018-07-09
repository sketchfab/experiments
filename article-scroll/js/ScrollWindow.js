/**
 * ScrollWindow
 * Object that tells how much a DOM element is visibled depending on page scroll
 * Callback will receive a numeric value: 0 means scroll is at the top of the element, 100 means scroll is at the bottom of the element.
 * @param {Element} windowEl DOM element to track
 * @param {function} onProgressCallback Callback invoked with how much the scroll has passed the element.
 */
function ScrollWindow(windowEl, onProgressCallback) {
    this.windowEl = windowEl;
    this.onProgressCallback = onProgressCallback;
    this.init();
}

ScrollWindow.prototype = {
    isTicking: false,
    progress: 0,
    init: function() {
        window.addEventListener('scroll', this.requestTick.bind(this), false);
        this.boundUpdateScrollProgress = this.updateScrollProgress.bind(this);
        this.requestTick();
    },

    _getScrollY: function getScrollY() {
        return window.pageYOffset !== undefined
            ? window.pageYOffset
            : (document.documentElement || document.body.parentNode || document.body).scrollTop;
    },

    _getViewportHeight: function() {
        return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    },

    updateScrollProgress: function() {
        this.isTicking = false;

        var el = this.windowEl;
        var viewportHeight = this._getViewportHeight();
        var scroll = this._getScrollY();
        var bodyRect = document.body.getBoundingClientRect();
        var rect = el.getBoundingClientRect();
        var middleScroll = scroll + viewportHeight / 2;
        var rangeStart = rect.top - bodyRect.top;
        var rangeEnd = rect.top - bodyRect.top + rect.height;
        this.progress = (100 * (middleScroll - rangeStart)) / (rangeEnd - rangeStart);
        this.onProgress();
    },

    requestTick: function() {
        if (!this.isTicking) {
            requestAnimationFrame(this.boundUpdateScrollProgress);
        }
        this.isTicking = true;
    },

    onProgress: function() {
        if (this.onProgressCallback) {
            this.onProgressCallback(this.progress);
        }
    }
};
