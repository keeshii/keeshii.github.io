((typeof module !== 'undefined' ? module : {}).exports = function () { var self={};
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 778:
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConsoleMonitor = void 0;
var ConsoleMonitor = /** @class */ (function () {
    function ConsoleMonitor(callbackFn) {
        this.infoFn = function (message, scriptName) {
            callbackFn('INFO', message, scriptName);
        };
        this.warnFn = function (message, scriptName) {
            callbackFn('WARNING', message, scriptName);
        };
        this.errorFn = function (message, scriptName) {
            callbackFn('ERROR', message, scriptName);
        };
        this.exceptionFn = function (error) {
            callbackFn('ERROR', JSON.stringify(error));
        };
    }
    ConsoleMonitor.prototype.subscribe = function () {
        Script.printedMessage.connect(this.infoFn);
        Script.infoMessage.connect(this.infoFn);
        Script.warningMessage.connect(this.warnFn);
        Script.errorMessage.connect(this.errorFn);
        Script.unhandledException.connect(this.exceptionFn);
    };
    ;
    ConsoleMonitor.prototype.unsubscribe = function () {
        Script.printedMessage.disconnect(this.infoFn);
        Script.infoMessage.disconnect(this.infoFn);
        Script.warningMessage.disconnect(this.warnFn);
        Script.errorMessage.disconnect(this.errorFn);
        Script.unhandledException.disconnect(this.exceptionFn);
    };
    return ConsoleMonitor;
}());
exports.ConsoleMonitor = ConsoleMonitor;


/***/ }),

/***/ 232:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EditorWindowClient = void 0;
var console_monitor_1 = __webpack_require__(778);
var editor_1 = __webpack_require__(386);
var status_monitor_1 = __webpack_require__(510);
var EditorWindowClient = /** @class */ (function () {
    function EditorWindowClient(window, userData) {
        this.window = window;
        this.userData = userData;
        this.updateScriptStatus = function (status) {
            if (status.isRunning && status.status === 'running') {
                this.emitToWebView({ type: 'SET_STATUS', status: 'RUNNING' });
                this.wasRunning = true;
                return;
            }
            if (status.status === 'error_running_script' && this.wasRunning) {
                this.emitToWebView({ type: 'LOG_ERROR', error: status.errorInfo });
                this.emitToWebView({ type: 'SET_STATUS', status: 'UNLOADED' });
                this.wasRunning = false;
            }
        };
    }
    EditorWindowClient.prototype.preload = function () {
        var _this = this;
        this.editor = new editor_1.Editor(this.userData);
        this.webEventReceivedFn = function (message) { return _this.onWebEventReceived(message); };
        this.window.webEventReceived.connect(this.webEventReceivedFn);
        this.statusMonitor = new status_monitor_1.ServerScriptStatusMonitor(this.userData.editingEntityId, function (status) {
            _this.updateScriptStatus(status);
        });
        this.consoleMonitor = new console_monitor_1.ConsoleMonitor(function (type, message, scriptName) {
            _this.appendLog(type, message, scriptName);
        });
        this.consoleMonitor.subscribe();
    };
    EditorWindowClient.prototype.unload = function () {
        this.window.webEventReceived.disconnect(this.webEventReceivedFn);
        this.statusMonitor.stop();
        this.consoleMonitor.unsubscribe();
    };
    EditorWindowClient.prototype.onWebEventReceived = function (message) {
        var _this = this;
        var action;
        try {
            action = JSON.parse(message);
        }
        catch (e) {
            return;
        }
        switch (action.type) {
            case 'INITIALIZE':
                this.emitToWebView({ type: 'SET_TOOLBAR_BUTTONS', showClose: false, showOpenInEntity: true });
                this.editor.loadFile(function (content, fileName) {
                    _this.emitToWebView({ type: 'SET_STATE', content: content, fileName: fileName });
                });
                break;
            case 'UPDATE':
                this.editor.applyUpdate(action);
                this.emitToWebView(action);
                break;
            case 'SET_SCROLL':
                break;
            case 'SAVE':
                this.editor.saveFile(function (error) {
                    if (error) {
                        _this.emitToWebView({ type: 'SHOW_MESSAGE', message: 'Error: ' + error });
                        return;
                    }
                    _this.emitToWebView({ type: 'SHOW_MESSAGE', message: 'File saved' });
                });
                break;
            case 'RELOAD':
                this.editor.loadFile(function (content, fileName) {
                    _this.emitToWebView({ type: 'SET_STATE', content: content, fileName: fileName });
                    _this.emitToWebView({ type: 'SHOW_MESSAGE', message: 'File loaded' });
                });
                break;
            case 'RUN':
                this.editor.saveFile(function (error) {
                    if (!error) {
                        _this.editor.runScript();
                    }
                });
                break;
            case 'STOP':
                this.editor.stopScript();
                break;
            case 'OPEN_IN_ENTITY':
                this.window.close();
                break;
        }
    };
    EditorWindowClient.prototype.emitToWebView = function (action) {
        var message = JSON.stringify(action);
        this.window.emitScriptEvent(message);
    };
    EditorWindowClient.prototype.appendLog = function (severity, message, scriptName) {
        if (severity === 'ERROR') {
            this.emitToWebView({ type: 'LOG_ERROR', error: message });
            return;
        }
        this.emitToWebView({ type: 'LOG_INFO', items: [message] });
    };
    ;
    return EditorWindowClient;
}());
exports.EditorWindowClient = EditorWindowClient;


/***/ }),

/***/ 259:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EditorWindow = void 0;
var editor_window_client_1 = __webpack_require__(232);
var EDITOR_SOURCE_URL = 'https://keeshii.github.io/overte-editor-app/';
var EDITOR_WIDTH = 1.92;
var EDITOR_HEIGHT = 1.08;
var EditorWindow = /** @class */ (function () {
    function EditorWindow(entityId, isClient) {
        this.entityId = entityId;
        this.isClient = isClient;
    }
    EditorWindow.prototype.openEditor = function () {
        if (!Entities.canWriteAssets()) {
            Window.alert("You have no permission to make changes to the asset server's assets");
            return;
        }
        var entityId = this.entityId;
        var isClient = this.isClient;
        var properties = Entities.getEntityProperties(entityId, ['id', 'script', 'serverScripts', 'locked']);
        if (properties.id !== entityId) {
            Window.alert("Entity not found");
            return;
        }
        if (properties.locked) {
            Window.alert("Entity is locked. You must unlock it first.");
            return;
        }
        // Server or Client Script?
        var scriptUrl = isClient ? properties.script : properties.serverScripts;
        // Ensure script is in the Asset Server
        // then spawn editor
        this.prepareScriptToEdit(scriptUrl, function (fileName) {
            var userData = {
                fileName: fileName,
                scriptType: isClient ? 'client' : 'server',
                editingEntityId: entityId,
                grabbableKey: { grabbable: false, triggerable: false }
            };
            var translation = Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.5, z: -3 });
            var position = Vec3.sum(MyAvatar.position, translation);
            var overlayWebWindow = new OverlayWebWindow({
                title: "Script Editor",
                source: EDITOR_SOURCE_URL,
                width: EDITOR_WIDTH * 400,
                height: EDITOR_HEIGHT * 400
            });
            var client = new editor_window_client_1.EditorWindowClient(overlayWebWindow, userData);
            client.preload();
            var onClosed = function () {
                overlayWebWindow.closed.disconnect(onClosed);
                client.unload();
            };
            overlayWebWindow.closed.connect(onClosed);
        });
    };
    EditorWindow.prototype.downloadFileFromUrl = function (url) {
        var request = new XMLHttpRequest();
        request.open('GET', url, false); // `false` makes the request synchronous
        request.send(null);
        if (request.status === 0 || request.status === 200) {
            return request.responseText;
        }
        return undefined;
    };
    EditorWindow.prototype.getFileNameFromUrl = function (url) {
        var name = url.replace(/.*\//, '');
        if (name === '') {
            name = 'file.js';
        }
        if (!name.endsWith('.js')) {
            name += '.js';
        }
        return name;
    };
    EditorWindow.prototype.prepareScriptToEdit = function (url, callback) {
        var fileName = 'file.js';
        // Script already in the Asset Server, just remember its name
        if (url.match(/^atp:\//)) {
            fileName = url.replace('atp:/', '');
            callback(fileName);
            return;
        }
        // Script will be copied to the Asset Server
        var proceed = Window.confirm("The script will be copied to the Asset Server and may overwrite some other files. Say YES if you want to proceed.");
        if (!proceed) {
            return;
        }
        var content = url || ' ';
        if (url.match(/(file|https?):\/\//)) {
            fileName = this.getFileNameFromUrl(url);
            content = this.downloadFileFromUrl(url);
            if (content === undefined) {
                Window.alert("Unable to download the file.");
                return;
            }
        }
        Assets.putAsset({ data: String(content), path: '/' + fileName }, function (error) {
            if (error) {
                Window.alert("Cannot save file to Asset Server");
                return;
            }
            Entities.editEntity(this.entityId, this.isClient
                ? { script: 'atp:/' + fileName }
                : { serverScripts: 'atp:/' + fileName });
            callback(fileName);
        });
    };
    return EditorWindow;
}());
exports.EditorWindow = EditorWindow;


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


/***/ }),

/***/ 510:
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerScriptStatusMonitor = void 0;
var ServerScriptStatusMonitor = /** @class */ (function () {
    function ServerScriptStatusMonitor(entityId, statusCallback) {
        var self = this;
        this.entityID = entityId;
        this.active = true;
        this.sendRequestTimerID = null;
        var onStatusReceived = function (success, isRunning, status, errorInfo) {
            if (self.active) {
                statusCallback({
                    statusRetrieved: success,
                    isRunning: isRunning,
                    status: status,
                    errorInfo: errorInfo
                });
                self.sendRequestTimerID = Script.setTimeout(function () {
                    if (self.active) {
                        Entities.getServerScriptStatus(entityId, onStatusReceived);
                    }
                }, 1000);
            }
        };
        Entities.getServerScriptStatus(entityId, onStatusReceived);
    }
    ServerScriptStatusMonitor.prototype.stop = function () {
        this.active = false;
    };
    ;
    return ServerScriptStatusMonitor;
}());
exports.ServerScriptStatusMonitor = ServerScriptStatusMonitor;


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
var editor_window_1 = __webpack_require__(259);
(function () {
    var ENTITY_ID_PLACEHOLDER = '{00000000-0000-0000-0000-000000000000}';
    // Choose entity
    var entityId = Window.prompt('Enter the Entity UUID you want to edit', ENTITY_ID_PLACEHOLDER);
    if (!entityId) {
        return;
    }
    // Check if entity exists
    var properties = Entities.getEntityProperties(entityId, ['id', 'script', 'serverScripts', 'locked']);
    if (properties.id !== entityId) {
        Window.alert("Entity not found");
        return;
    }
    if (properties.locked) {
        Window.alert("Entity is locked. You must unlock it first.");
        return;
    }
    // Server or Client Script?
    var isClient = Window.confirm("Yes - client, No -server script");
    var editor = new editor_window_1.EditorWindow(entityId, isClient);
    editor.openEditor();
}());

}();
var __webpack_export_target__ = self;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
return self["default"];})()