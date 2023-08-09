"use strict";

(function() {
  const EDITOR_CHANNEL_NAME = 'ue.ryuu.overte-editor';

  Script.include('./editor.js');

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
        this.editor.saveFile();
        break;
      case 'RELOAD':
        this.editor.loadFile(function(setStateAction) {
          self.sendToAll(setStateAction);
          self.sendToAll({ type: 'SHOW_MESSAGE', message: 'File loaded' });
        });
        break;
      case 'RUN':
        this.editor.runScript();
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
