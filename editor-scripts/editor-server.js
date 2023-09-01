((typeof module !== 'undefined' ? module : {}).exports = function () { var self={};
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 719:
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.INIT_ENTITIES_DELAY = exports.EDITOR_HEIGHT = exports.EDITOR_WIDTH = exports.EDITOR_SERVER_SCRIPT_URL = exports.EDITOR_CLIENT_SCRIPT_URL = exports.EDITOR_SOURCE_URL = exports.CHANNEL_NAME = void 0;
exports.CHANNEL_NAME = 'OVERTE_EDITOR_CHANNEL_{id}';
//export const EDITOR_SOURCE_URL = 'https://keeshii.github.io/overte-editor-app/';
//export const EDITOR_CLIENT_SCRIPT_URL = '';
//export const EDITOR_SERVER_SCRIPT_URL = '';
exports.EDITOR_SOURCE_URL = 'https://keeshii.github.io/overte-editor-app/';
exports.EDITOR_CLIENT_SCRIPT_URL = 'https://keeshii.github.io/editor-scripts/editor-client.js';
exports.EDITOR_SERVER_SCRIPT_URL = 'https://keeshii.github.io/editor-scripts/editor-server.js';
exports.EDITOR_WIDTH = 1.92;
exports.EDITOR_HEIGHT = 1.08;
exports.INIT_ENTITIES_DELAY = 500;


/***/ }),

/***/ 386:
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Editor = void 0;
var Editor = /** @class */ (function () {
    function Editor(params) {
        this.fileName = params.fileName.replace(/^atp:\/+/, '');
        this.content = '';
        this.scriptType = params.scriptType;
        this.editingEntityId = params.editingEntityId;
    }
    Editor.parseUserData = function (entityId) {
        var properties = Entities.getEntityProperties(entityId, ['userData']);
        var userData;
        try {
            userData = JSON.parse(properties.userData);
        }
        catch (e) {
            return;
        }
        return {
            fileName: userData.fileName,
            scriptType: userData.scriptType,
            editingEntityId: userData.editingEntityId
        };
    };
    ;
    Editor.prototype.applyUpdate = function (action) {
        var text = this.content;
        if (action.remove) {
            text = text.substring(0, action.position)
                + text.substring(action.position + action.remove);
        }
        if (action.insert) {
            text = text.substring(0, action.position)
                + String(action.insert)
                + text.substring(action.position);
        }
        if (text === this.content) {
            return false;
        }
        this.content = text;
        return true;
    };
    Editor.prototype.saveFile = function (callback) {
        if (!this.fileName) {
            return;
        }
        var self = this;
        var content = this.content;
        var fileName = this.fileName;
        Assets.putAsset({
            data: String(content),
            path: '/' + fileName
        }, function (error) {
            callback(error);
        });
    };
    ;
    Editor.prototype.loadFile = function (callback) {
        var self = this;
        Assets.getAsset({
            url: '/' + this.fileName,
            responseType: "text"
        }, function (error, result) {
            if (error) {
                return;
            }
            self.content = result.response;
            callback(self.content, 'atp:/' + self.fileName);
        });
    };
    ;
    Editor.prototype.runScript = function () {
        var timestamp;
        switch (this.scriptType) {
            case 'client':
                timestamp = Date.now();
                Entities.editEntity(this.editingEntityId, { scriptTimestamp: timestamp });
                break;
            case 'server':
                this.stopScript();
                break;
        }
    };
    ;
    Editor.prototype.stopScript = function () {
        Entities.reloadServerScripts(this.editingEntityId);
    };
    ;
    return Editor;
}());
exports.Editor = Editor;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
!function() {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EditorServer = void 0;
var constants_1 = __webpack_require__(719);
var editor_1 = __webpack_require__(386);
var EditorServer = /** @class */ (function () {
    function EditorServer() {
        this.channelName = constants_1.CHANNEL_NAME;
        this.remotelyCallable = [
            'initialize',
            'update',
            'save',
            'load',
            'runScript',
            'stopScript'
        ];
    }
    EditorServer.prototype.preload = function (entityId) {
        var _this = this;
        this.entityId = entityId;
        this.channelName = constants_1.CHANNEL_NAME.replace('{id}', entityId);
        Script.setTimeout(function () {
            var userData = editor_1.Editor.parseUserData(entityId);
            _this.editor = new editor_1.Editor(userData);
            _this.load(entityId, [undefined]);
        }, constants_1.INIT_ENTITIES_DELAY);
    };
    EditorServer.prototype.unload = function () { };
    EditorServer.prototype.initialize = function (_id, params) {
        var clientId = params[0];
        var content = this.editor.content;
        var fileName = this.editor.fileName;
        this.sendToClient(clientId, { type: 'SET_STATE', content: content, fileName: fileName, status: 'UNLOADED' });
    };
    EditorServer.prototype.update = function (_id, params) {
        var action;
        try {
            action = JSON.parse(params[1]);
        }
        catch (e) {
            return;
        }
        if (this.editor.applyUpdate(action)) {
            this.sendToAll(action);
        }
    };
    EditorServer.prototype.save = function (_id, params) {
        var _this = this;
        var clientId = params[0];
        var gameState = this.editor.saveFile(function (error) {
            if (error) {
                _this.sendToClient(clientId, { type: 'SHOW_MESSAGE', message: 'Error: ' + error });
                return;
            }
            _this.sendToClient(clientId, { type: 'SHOW_MESSAGE', message: 'File saved' });
        });
    };
    EditorServer.prototype.load = function (_id, params) {
        var _this = this;
        var clientId = params[0];
        this.editor.loadFile(function (content, fileName) {
            if (!clientId) {
                return;
            }
            _this.sendToAll({ type: 'SET_STATE', content: content, fileName: fileName });
            _this.sendToClient(clientId, { type: 'SHOW_MESSAGE', message: 'File loaded' });
        });
    };
    EditorServer.prototype.runScript = function (_id, params) {
        var _this = this;
        var clientId = params[0];
        this.editor.saveFile(function (error) {
            if (!error) {
                _this.editor.runScript();
            }
        });
    };
    EditorServer.prototype.stopScript = function (_id, params) {
        this.editor.stopScript();
    };
    EditorServer.prototype.callClient = function (clientId, methodName, params) {
        if (this.client) {
            this.client[methodName](this.entityId, params);
            return;
        }
        Entities.callEntityClientMethod(clientId, this.entityId, methodName, params);
    };
    EditorServer.prototype.sendToClient = function (clientId, action) {
        this.callClient(clientId, 'emitWebEvent', [JSON.stringify(action)]);
    };
    EditorServer.prototype.sendToAll = function (action) {
        Messages.sendMessage(this.channelName, JSON.stringify(action));
    };
    return EditorServer;
}());
exports.EditorServer = EditorServer;
exports["default"] = new EditorServer();

}();
var __webpack_export_target__ = self;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
return self["default"];});