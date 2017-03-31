(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["Sketchfab"] = factory();
	else
		root["Sketchfab"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/builds/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	eval("'use strict';\nvar APIClient = __webpack_require__( 1 );\n\nvar Sketchfab = function ( version, target ) {\n    this._target = target;\n    this._version = version || '1.0.0';\n    this._url = 'https://sketchfab.com/models/XXXX/embed';\n    this._client = undefined;\n    this._options = undefined;\n};\n\nSketchfab.prototype = {\n\n    getEmbedURL: function ( urlid, options ) {\n\n        var url = this._url + '?api_version=' + this._version + '&api_id=' + this._client.getIdentifier();\n\n        if ( options ) {\n\n            Object.keys( options ).forEach( function ( key ) {\n\n                // filter options\n                if ( options[ key ] === undefined ||\n                    options[ key ] === null ||\n                    typeof options[ key ] === 'function' ) {\n                    return;\n                }\n\n                url += '&' + key.toString() + '=' + options[ key ].toString();\n\n            } );\n        }\n\n        return url.replace( 'XXXX', urlid );\n    },\n\n    init: function ( urlid, options ) {\n\n        this._options = options;\n        this._client = new APIClient( this._target.contentWindow );\n        this._target.addEventListener( 'load', function () {\n\n            // load\n            this._client.use( this._version, function ( err, api ) {\n\n                if ( err )\n                    throw err;\n\n                this.success.call( this, api );\n\n            }.bind( this ) );\n\n\n        }.bind( this ), true );\n\n        this._target.src = this.getEmbedURL( urlid, options );\n\n    },\n\n    success: function ( api ) {\n        // api ready to use\n        if ( this._options.success && typeof this._options.success === 'function' ) {\n            this._options.success( api );\n        }\n\n    },\n    error: function ( api ) {\n        // api error\n        if ( this._options.error && typeof this._options.error === 'function' ) {\n            this._options.error( api );\n        }\n\n    }\n\n};\n\nmodule.exports = Sketchfab;\n\n\n/*****************\n ** WEBPACK FOOTER\n ** ./static/sources/sketchfab-viewer.js\n ** module id = 0\n ** module chunks = 0\n **/\n//# sourceURL=webpack:///./static/sources/sketchfab-viewer.js?");

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	eval("  'use strict';\n\n\n  var API = function ( members, apiClient ) {\n      // populate this with method\n      members.forEach( function ( name ) {\n\n          this[ name ] = function () {\n\n              var requestId = apiClient._requestIdCounter++;\n\n              var args = Array.prototype.slice.call( arguments );\n              var callback;\n\n              if ( args.length > 0 ) {\n\n                  var lastArg = args[ args.length - 1 ];\n\n                  if ( typeof lastArg === 'function' ) {\n                      callback = args.pop();\n                  }\n\n              }\n\n              // no callback no need to maintain a pending request\n              if ( callback )\n                  apiClient._pendingRequests[ requestId ] = callback.bind( this );\n\n              apiClient._target.postMessage( {\n                  type: 'api.request',\n                  instanceId: apiClient.getIdentifier(),\n                  requestId: requestId,\n                  member: name,\n                  arguments: args\n              }, '*' );\n\n          };\n      }, this );\n\n      this.addEventListener = function ( name, callback ) {\n\n          if ( !apiClient._eventListeners[ name ] )\n              apiClient._eventListeners[ name ] = [];\n\n          apiClient._eventListeners[ name ].push( callback );\n      };\n\n      this.removeEventListener = function ( name, callback ) {\n\n          if ( !apiClient._eventListeners[ name ] )\n              return;\n\n          var index = apiClient._eventListeners[ name ].indexOf( callback );\n          if ( index !== -1 ) {\n              apiClient._eventListeners[ name ].splice( index, 1 );\n          }\n      };\n  };\n\n\n  var APIClient = function ( target ) {\n\n      this._target = target;\n      this._requestIdCounter = 0;\n      this._pendingRequests = {};\n      this._eventListeners = {};\n      this._ready = false;\n\n      var identifier = Math.random().toString();\n      this._identifier = identifier.substr( identifier.indexOf( '.' ) + 1 );\n\n      this.listenServer();\n  };\n\n\n  APIClient.prototype = {\n\n      getIdentifier: function () {\n          return this._identifier;\n      },\n\n      use: function ( version, callback ) {\n\n          this._version = version;\n\n          // we need to delay this call to be sure the server is ready\n          var initializeAPI = function ( version, callback ) {\n\n              var requestId = this._requestIdCounter++;\n\n              // function to initialize the api when the server will answer\n              this._pendingRequests[ requestId ] = function ( err, instanceId, members ) {\n\n                  if ( err ) {\n                      callback.call( this, err );\n                  } else {\n                      callback.call( this, null, new API( members, this ) );\n                  }\n\n              }.bind( this );\n\n              this._target.postMessage( {\n                  type: 'api.initialize',\n                  requestId: requestId,\n                  name: version\n              }, '*' );\n\n          }.bind( this );\n\n\n          var callInitAPI = function () {\n\n              initializeAPI( version, callback );\n\n          }.bind( this );\n\n          // if the api is ready we can execute now the initialize.\n          // If not we will intialize the api after the server part is ready.\n          // see the code in the message function\n          if ( this._ready )\n              callInitAPI();\n          else\n              this.initAPI = callInitAPI;\n      },\n\n\n      listenServer: function () {\n\n          window.addEventListener( 'message', function ( e ) {\n\n              if ( e.data.type !== 'api.ready' &&\n                  e.data.type !== 'api.initialize.result' &&\n                  e.data.type !== 'api.request.result' &&\n                  e.data.type !== 'api.event' )\n                  return;\n\n              if ( e.data.instanceId !== this.getIdentifier() )\n                  return;\n\n              // initialize the api only when the server is ready\n              if ( e.data.type === 'api.ready' ) {\n\n                  if ( !this._ready ) {\n\n                      this._ready = true;\n\n                      // it's possible client has not yet called use\n                      // so it means that initAPI is undefined\n                      if ( this.initAPI )\n                          this.initAPI();\n                  }\n              }\n\n              // if it's an event dont check the request\n              if ( e.data.type === 'api.event' ) {\n\n                  var args = e.data.results;\n                  var eventName = args[ 0 ];\n\n                  // handle listener that listen all or * events\n                  if ( this._eventListeners[ '*' ] || this._eventListeners.all ) {\n                      [ '*', 'all' ].forEach( function ( eventAll ) {\n\n                          if ( this._eventListeners[ eventAll ] ) {\n                              this._eventListeners[ eventAll ].forEach( function ( callback ) {\n                                  // callback is used as this to maintain a potential callback\n                                  // where the user would binded its own this\n                                  callback.apply( callback, args );\n                              } );\n                          }\n\n                      }, this );\n                      return;\n                  }\n\n                  // for localised listener ( not all events )\n                  var argumentsWithoutEventName = args.slice( 1 );\n                  if ( this._eventListeners[ eventName ] ) {\n\n                      // execute all callback listening eventName\n                      this._eventListeners[ eventName ].forEach( function ( callback ) {\n                          // callback is used as this to maintain a potential callback\n                          // where the user would binded its own this\n                          callback.apply( callback, argumentsWithoutEventName );\n                      } );\n\n                  }\n\n              } else {\n\n                  if ( !this._pendingRequests[ e.data.requestId ] )\n                      return;\n\n                  this._pendingRequests[ e.data.requestId ].apply( null, e.data.results );\n              }\n\n          }.bind( this ) );\n\n      }\n\n  };\n\n  module.exports = APIClient;\n\n\n/*****************\n ** WEBPACK FOOTER\n ** ./static/sources/apis/viewer/lib/APIClient.js\n ** module id = 1\n ** module chunks = 0\n **/\n//# sourceURL=webpack:///./static/sources/apis/viewer/lib/APIClient.js?");

/***/ }
/******/ ])
});
;