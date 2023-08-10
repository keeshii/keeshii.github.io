"use strict";

(function() {
  const EDITOR_CHANNEL_NAME = 'ue.ryuu.overte-editor-{id}';

  // -------------------------------------

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

  // -------------------------------------

  function Editor(params) {
    this.sendActionFn = null;
    this.sendAllActionFn = null;
    this.content = '';
    this.initialized = false;
    this.initializeTimeout = undefined;
    this.fileName = params.fileName;
    this.scriptType = params.scriptType;
    this.editingEntityId = params.editingEntityId;
    this.wasRunning = false;
  }

  Editor.prototype.subscribe = function() {
    var self = this;
    this.logInfoFn = function (message, scriptName) {
      self.showLog('INFO', message, scriptName);
    };
    this.logWarningFn = function (message, scriptName) {
      self.showLog('WARNING', message, scriptName);
    };
    this.logErrorFn = function (message, scriptName) {
      self.showLog('ERROR', message, scriptName);
    };
    this.logExceptionFn = function (error) {
      self.showLog('ERROR', JSON.stringify(error));
    };
    Script.printedMessage.connect(this.logInfoFn);
    Script.infoMessage.connect(this.logInfoFn);
    Script.warningMessage.connect(this.logWarningFn);
    Script.errorMessage.connect(this.logErrorFn);
    Script.unhandledException.connect(this.logExceptionFn);
    this.statusMonitor = new ServerScriptStatusMonitor(this.editingEntityId, function(status) {
      self.updateScriptStatus(status);
    });
  };

  Editor.prototype.unsubscribe = function () {
    Script.printedMessage.disconnect(this.logInfoFn);
    Script.infoMessage.disconnect(this.logInfoFn);
    Script.warningMessage.disconnect(this.logWarningFn);
    Script.errorMessage.disconnect(this.logErrorFn);
    Script.unhandledException.disconnect(this.logExceptionFn);
    this.statusMonitor.stop();
  };

  Editor.prototype.setSendActionFn = function(callback) {
    this.sendActionFn = callback;
  };

  Editor.prototype.setSendAllActionFn = function(callback) {
    this.sendAllActionFn = callback;
  };

  Editor.prototype.initialize = function() {
    var self = this;
    this.initialized = false;

    this.initializeTimeout = Script.setTimeout(function () {
      self.loadFile(function(setStateAction) {
        self.sendAction(setStateAction);
        self.onMessageReceived(JSON.stringify(setStateAction));
      });
    }, 4000);

    this.sendToAll({ type: 'INITIALIZE_REQUEST' });
  };

  Editor.prototype.applyUpdate = function(action) {
    let text = this.content;
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

  Editor.prototype.saveFile = function(callback) {
    if (!this.fileName) {
      return;
    }
    var self = this;
    var content = this.content;
    var fileName = this.fileName.replace(/^atp:\//, '');

    Assets.putAsset({
      data: String(content),
      path: '/' + fileName
    }, function (error) {
      if (error) {
        self.sendAction({ type: 'SHOW_MESSAGE', message: 'ERROR: Data not uploaded or mapping not set' });
        return;
      }
      callback();
    });
  };

  Editor.prototype.loadFile = function(callback) {
    var self = this;
    Assets.getAsset({
      url: '/' + this.fileName,
      responseType: "text"
    }, function (error, result) {
      if (error) {
        self.sendAction({ type: 'SHOW_MESSAGE', message: "ERROR: Data not downloaded" });
        return;
      }
      self.content = result.response;
      callback(self.createSetStateAction());
    });
  };

  Editor.prototype.runScript = function() {
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

  Editor.prototype.stopScript = function() {
    this.sendAction({ type: 'SET_STATUS', status: 'PENDING' });
    this.wasRunning = true;
    Entities.reloadServerScripts(this.editingEntityId);
  };

  Editor.prototype.onMessageReceived = function(message) {
    var action, self = this;
    try {
      action = JSON.parse(message);
    } catch (e) {
      return;
    }
    switch (action.type) {
      case 'INITIALIZE_REQUEST':
        if (!this.initialized) {
          return;
        }
        this.initializeTimeout = Script.setTimeout(function() {
          var setStateAction = self.createSetStateAction();
          self.sendToAll(setStateAction);
        }, Math.random() * 3000);
        break;
      case 'SET_STATE':
        if (this.initializeTimeout) {
          Script.clearTimeout(this.initializeTimeout);
          this.initializeTimeout = undefined;
        }
        if (!this.initialized) {
          this.initialized = true;
        }
        this.content = action.content;
        break;
    }
  };

  Editor.prototype.createSetStateAction = function () {
    return {
      type: 'SET_STATE',
      content: this.content,
      fileName: 'atp:/' + this.fileName
    };
  };

  Editor.prototype.showLog = function (severity, message, scriptName) {
    if (severity === 'ERROR') {
      this.sendAction({ type: 'LOG_ERROR', error: message });
      return;
    }
    this.sendAction({ type: 'LOG_INFO', items: [message] });
  };

  Editor.prototype.sendAction = function(action) {
    if (this.sendActionFn) {
      this.sendActionFn(action);
    }
  };

  Editor.prototype.sendToAll = function(action) {
    if (this.sendAllActionFn) {
      this.sendAllActionFn(action);
    }
  };

  Editor.prototype.updateScriptStatus = function(status) {
    if (status.isRunning && status.status === 'running') {
      this.sendAction({ type: 'SET_STATUS', status: 'RUNNING' });
      this.wasRunning = true;
      return;
    }

    if (status.status === 'error_running_script' && this.wasRunning) {
      this.sendAction({ type: 'LOG_ERROR', error: status.errorInfo });
      this.sendAction({ type: 'SET_STATUS', status: 'UNLOADED' });
      this.wasRunning = false;
    }
  };

  // ---------------------------------------

  function EditorClient() {
    this.initializeCallbacks();
  };

  EditorClient.prototype.initializeCallbacks = function() {
    var self = this;
    this.webEventReceivedFn = function(id, message) {
      self.onWebEventReceived(id, message);
    };
    this.messageReceivedFn = function(channel, message, senderId, localOnly) {
      self.onMessageReceived(channel, message, senderId, localOnly);
    };
  };

  EditorClient.prototype.preload = function(entityId) {
    this.entityId = entityId;
    EDITOR_CHANNEL_NAME.replace('{id}', entityId);

    var userData = this.parseUserData();

    this.editor = new Editor(userData);
    this.editor.setSendActionFn(function (action) {
      Entities.emitScriptEvent(entityId, JSON.stringify(action));
    });
    this.editor.setSendAllActionFn(function (action) {
      Messages.sendMessage(EDITOR_CHANNEL_NAME, JSON.stringify(action));
    });

    Entities.webEventReceived.connect(this.webEventReceivedFn);
    Messages.subscribe(EDITOR_CHANNEL_NAME);
    Messages.messageReceived.connect(this.messageReceivedFn);
    this.editor.subscribe();
  };

  EditorClient.prototype.unload = function() {
    Entities.webEventReceived.disconnect(this.webEventReceivedFn);
    Messages.unsubscribe(EDITOR_CHANNEL_NAME);
    Messages.messageReceived.disconnect(this.messageReceivedFn);
    this.editor.unsubscribe();
  };

  EditorClient.prototype.onWebEventReceived = function(id, message) {
    var action, self = this;

    if (id !== this.entityId) {
      return;
    }

    try {
      action = JSON.parse(message);
    } catch (e) {
      return;
    }

    switch (action.type) {
      case 'INITIALIZE':
        this.editor.initialize();
        break;
      case 'UPDATE':
        if (this.editor.applyUpdate(action)) {
          this.sendToAll(action);
        }
        break;
      case 'SET_SCROLL':
        this.sendToAll(action);
        break;
      case 'SAVE':
        this.editor.saveFile(function () {
          self.sendToAll({ type: 'SHOW_MESSAGE', message: 'File saved' });
        });
        break;
      case 'RELOAD':
        this.editor.loadFile(function(setStateAction) {
          self.sendToAll(setStateAction);
          self.sendToAll({ type: 'SHOW_MESSAGE', message: 'File loaded' });
        });
        break;
      case 'RUN':
        this.editor.saveFile(function () {
          self.editor.runScript();
        });
        break;
      case 'STOP':
        this.editor.stopScript();
        break;
      case 'CLOSE':
        Entities.deleteEntity(this.entityId);
        break;
    }
  };

  EditorClient.prototype.onMessageReceived = function(channel, message, senderId, localOnly) {
    if (channel !== EDITOR_CHANNEL_NAME) {
      return;
    }
    this.editor.onMessageReceived(message);
    Entities.emitScriptEvent(this.entityId, message);
  };

  EditorClient.prototype.parseUserData = function() {
    var properties = Entities.getEntityProperties(this.entityId, ['userData']);
    var userData;
    try {
      userData = JSON.parse(properties.userData);
    } catch (e) {
      return;
    }
    return {
      fileName: userData.fileName,
      scriptType: userData.scriptType,
      editingEntityId: userData.editingEntityId
    };
  };

  EditorClient.prototype.sendToAll = function(action) {
    Messages.sendMessage(EDITOR_CHANNEL_NAME, JSON.stringify(action));
  };

  EditorClient.prototype.sendToWebView = function(action) {
    var message = JSON.stringify(action);
    Entities.emitScriptEvent(this.entityId, message);
  };

  return new EditorClient();
});
