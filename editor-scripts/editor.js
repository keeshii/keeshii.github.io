"use strict";

(function (global) {

  function Editor(params) {
    this.sendActionFn = null;
    this.sendAllActionFn = null;
    this.content = '';
    this.initialized = false;
    this.initializeTimeout = undefined;
    this.fileName = params.fileName;
    this.scriptType = params.scriptType;
    this.editingEntityId = params.editingEntityId;
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
    Script.infoMessage.connect(logInfoFn);
    Script.warningMessage.connect(logWarningFn);
    Script.errorMessage.connect(logErrorFn);
  };

  Editor.prototype.unsubscribe = function () {
    Script.infoMessage.disconnect(logInfoFn);
    Script.warningMessage.disconnect(logWarningFn);
    Script.errorMessage.disconnect(logErrorFn);
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
      self.sendToAll({ type: 'SHOW_MESSAGE', message: 'File saved' });
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
        console.log('RUN_SCRIPT ' + this.editingEntityId);
        Entities.editEntity(this.editingEntityId, { scriptTimestamp: timestamp });
        break;
      case 'server':
        Entities.reloadServerScripts(this.editingEntityId);
        break;
    }
  };

  Editor.prototype.stopScript = function() {
    this.sendAction({ type: 'SHOW_MESSAGE', message: "ERROR: Stop not implemented" });
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
    this.sendAction({ type: 'LOG_INFO', items: [ message, scriptName ] });
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

  global.Editor = Editor;

}(typeof module !== 'undefined' ? module.exports : new Function('return this;')()));
