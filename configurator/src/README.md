# Sketchfab Viewer Configurator

This app allows the user to toggle on/off meshes in a scene.

## Build

* `npm install`
* `gulp`

## Configure the Configurator

In `src/js/config.js`
* Edit the urlid with the urlid of the model to be displayed
* Edit the prefix used to detect meshes used as options

## Try with any model

Append the `urlid` and a prefix to filter options like this:

```
index.html?urlid=c632823b6c204797bd9b95dbd9f53a06&prefix=seat
```
