var Search = {
  init: function() {
    var el = document.querySelector(".skfb-widget");
    var skfbWidget = new SketchfabImporter(el, {
      onModelSelected: function(result) {
        App.download(result.download);
      }
    });
  },

  render: function() {}
};
