var iframe = document.getElementById('api-frame');
var layer = document.querySelector('.annotations');
var description = document.querySelector('.description');
var uid = "02f12869e95e4695a15e3a611398742b";
var annotations = [
    {
        description: "Super Retina Display<br><br>With iPhone X, the device is the display. An all-new 5.8-inch Super Retina screen fills the hand and dazzles the eyes.",
        position: [14.857316885498108, -5.232388121090237, 258.77696053400024]
    },
    {
        description: `Face ID<br><br><iframe width="560" height="315" src="https://www.youtube.com/embed/Hn89qD03Tzc?rel=0&amp;controls=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`,
        position: [1.5648326275015627, 25.37509883399373, 498.31804266257825]
    },
    {
        description: `Camera with Portrait Lighting<br><br><iframe width="560" height="315" src="https://www.youtube.com/embed/6vbFe6F48Uo?rel=0&amp;controls=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`,
        position: [70.36475600233393, 54.608484280195285, 454.560193979834]
    },
    {
        description: `Wireless charging<br><br><img src="https://images.apple.com/v/iphone-x/e/images/overview/primary/wireless_charging_everywhere_large.jpg" alt="">`,
        position: [2.4582861194774366, -31.438133370661603, 5.928032031767785]
    },
];
var viewer = new AnnotatedViewer(iframe, layer, description, uid, annotations);
