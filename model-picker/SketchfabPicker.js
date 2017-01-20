var baseUrl = 'https://labs.sketchfab.com/experiments/model-picker/';

function SketchfabPicker() {
    this.childWindow = null;
    this.options;
    window.addEventListener('message', function( e ){
        this._onMessage( e );
    }.bind(this));
}
SketchfabPicker.prototype.pick = function( options ) {
    this.options = options;
    this.childWindow = window.open(baseUrl + 'model-picker.html', 'model-picker', 'width=640,height=400');
}
SketchfabPicker.prototype.close = function() {
    if (this.childWindow) {
        this.childWindow.close();
    }
}
SketchfabPicker.prototype._onMessage = function( e ) {
    var data = e.data;
    if (data.source && data.source === 'sketchfab-model-picker') {
        if (this.options.success) {
            this.options.success(data.model);
            this.close();
        }
    }
}
