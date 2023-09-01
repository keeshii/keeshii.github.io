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
        this.status = 'UNLOADED';
        var onStatusReceived = function (success, isRunning, status, errorInfo) {
            if (self.active) {
                statusCallback({
                    statusRetrieved: success,
                    isRunning: isRunning,
                    status: status,
                    errorInfo: errorInfo
                });
                self.status = isRunning ? 'RUNNING' : 'UNLOADED';
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
exports.EditorClient = void 0;
var console_monitor_1 = __webpack_require__(778);
var constants_1 = __webpack_require__(719);
var editor_1 = __webpack_require__(386);
var status_monitor_1 = __webpack_require__(510);
var EditorClient = /** @class */ (function () {
    function EditorClient() {
        this.channelName = 'OVERTE_EDITOR_CHANNEL_{id}';
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
        this.initializeCallbacks();
        this.remotelyCallable = [
            'emitWebEvent'
        ];
    }
    ;
    EditorClient.prototype.initializeCallbacks = function () {
        var _this = this;
        this.webEventReceivedFn = function (id, message) {
            _this.onWebEventReceived(id, message);
        };
        this.messageReceivedFn = function (channel, message, senderId, localOnly) {
            _this.onMessageReceived(channel, message, senderId, localOnly);
        };
    };
    ;
    EditorClient.prototype.preload = function (entityId) {
        var _this = this;
        this.entityId = entityId;
        this.channelName = constants_1.CHANNEL_NAME.replace('{id}', entityId);
        Entities.webEventReceived.connect(this.webEventReceivedFn);
        Messages.subscribe(this.channelName);
        Messages.messageReceived.connect(this.messageReceivedFn);
        Script.setTimeout(function () {
            var userData = editor_1.Editor.parseUserData(entityId);
            _this.statusMonitor = new status_monitor_1.ServerScriptStatusMonitor(userData.editingEntityId, function (status) {
                _this.updateScriptStatus(status);
            });
            _this.consoleMonitor = new console_monitor_1.ConsoleMonitor(function (type, message, scriptName) {
                _this.appendLog(type, message, scriptName);
            });
            _this.consoleMonitor.subscribe();
        }, constants_1.INIT_ENTITIES_DELAY);
    };
    EditorClient.prototype.unload = function () {
        Entities.webEventReceived.disconnect(this.webEventReceivedFn);
        Messages.unsubscribe(this.channelName);
        Messages.messageReceived.disconnect(this.messageReceivedFn);
        if (this.statusMonitor) {
            this.statusMonitor.stop();
        }
        if (this.consoleMonitor) {
            this.consoleMonitor.unsubscribe();
        }
    };
    EditorClient.prototype.emitWebEvent = function (_id, params) {
        var message = params[0];
        Entities.emitScriptEvent(this.entityId, message);
    };
    EditorClient.prototype.onWebEventReceived = function (id, message) {
        var action;
        if (id !== this.entityId) {
            return;
        }
        try {
            action = JSON.parse(message);
        }
        catch (e) {
            return;
        }
        switch (action.type) {
            case 'INITIALIZE':
                this.emitToWebView({ type: 'SET_TOOLBAR_BUTTONS', showClose: true, showOpenInEntity: false });
                this.callServer('initialize');
                break;
            case 'UPDATE':
                this.callServer('update', [JSON.stringify(action)]);
                break;
            case 'SET_SCROLL':
                this.sendToAll(action);
                break;
            case 'SAVE':
                this.callServer('save');
                break;
            case 'RELOAD':
                this.callServer('load');
                break;
            case 'RUN':
                this.callServer('runScript');
                break;
            case 'STOP':
                this.callServer('stopScript');
                break;
            case 'CLOSE':
                Entities.deleteEntity(this.entityId);
                break;
        }
    };
    EditorClient.prototype.onMessageReceived = function (channel, message, senderId, localOnly) {
        if (channel !== this.channelName) {
            return;
        }
        Entities.emitScriptEvent(this.entityId, message);
    };
    ;
    EditorClient.prototype.sendToAll = function (action) {
        Messages.sendMessage(this.channelName, JSON.stringify(action));
    };
    EditorClient.prototype.callServer = function (method, params) {
        if (params === void 0) { params = []; }
        params.unshift(MyAvatar.sessionUUID);
        Entities.callEntityServerMethod(this.entityId, method, params);
    };
    EditorClient.prototype.emitToWebView = function (action) {
        var message = JSON.stringify(action);
        Entities.emitScriptEvent(this.entityId, message);
    };
    EditorClient.prototype.appendLog = function (severity, message, scriptName) {
        if (severity === 'ERROR') {
            this.emitToWebView({ type: 'LOG_ERROR', error: message });
            return;
        }
        this.emitToWebView({ type: 'LOG_INFO', items: [message] });
    };
    ;
    return EditorClient;
}());
exports.EditorClient = EditorClient;
exports["default"] = new EditorClient();

}();
var __webpack_export_target__ = self;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
return self["default"];});