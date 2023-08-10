"use strict"

(function() {
  
  var entityId, properties, isClient, scriptUrl;

  var EDITOR_SOURCE_URL = 'https://keeshii.github.io/overte-editor-app/';
  var EDITOR_CLIENT_SCRIPT_URL = 'https://keeshii.github.io/editor-scripts/editor-client.js';
  var ENTITY_ID_PLACEHOLDER = '{00000000-0000-0000-0000-000000000000}';
  var EDITOR_WIDTH = 1.92;
  var EDITOR_HEIGHT = 1.08;

  function downloadFileFromUrl(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, false);  // `false` makes the request synchronous
    request.send(null);
    if (request.status === 0 || request.status === 200) {
      return request.responseText;
    }
    return undefined;
  }

  function getFileNameFromUrl(url) {
    var name = url.replace(/.*\//, '');
    if (name === '') {
      name = 'file.js';
    }
    if (!name.endsWith('.js')) {
      name += '.js';
    }
    return name;
  }

  function prepareScriptToEdit(url, callback) {
    var fileName = 'file.js';

    // Script already in the Asset Server, just remember its name
    if (url.startsWith('atp:/')) {
      fileName = url.replace('atp:/', '');
      callback(fileName);
      return;
    }

    // Script will be copied to the Asset Server
    var proceed = Window.confirm("The script will be copied to the Asset Server and may overwrite some other files. Say YES if you want to proceed.");
    if (!proceed) {
      return;
    }

    var content = url;
    if (url.match(/(file|https?):\/\//)) {
      fileName = getFileNameFromUrl(url);

      content = downloadFileFromUrl(url);
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
      Entities.editEntity(entityId, isClient
        ? { script: 'atp:/' + fileName }
        : { serverScripts: 'atp:/' + fileName });
      callback(fileName);
    });
  }

  // Check permission
  if (!Entities.canRez()) {
    Window.alert("You have no rez permission on this domain");
    return;
  }
  if (!Entities.canWriteAssets()) {
    Window.alert("You have no permission to make changes to the asset server's assets");
    return;
  }

  // Choose entity
  entityId = Window.prompt('Enter the Entity UUID you want to edit', ENTITY_ID_PLACEHOLDER);
  if (!entityId) {
    return;
  }

  // Check if entity exists
  properties = Entities.getEntityProperties(entityId, ['id', 'script', 'serverScripts', 'locked']);
  if (properties.id !== entityId) {
    Window.alert("Entity not found");
    return;
  }
  if (properties.locked) {
    Window.alert("Entity is locked. You must unlock it first.");
    return;
  }

  // Server or Client Script?
  isClient = Window.confirm("Say YES, if you want to edit CLIENT script, or NO for SERVER script");
  scriptUrl = isClient ? properties.script : properties.serverScripts;

  // Ensure script is in the Asset Server
  // then spawn editor
  prepareScriptToEdit(scriptUrl, function(fileName) {
    var userData = {
      fileName: fileName,
      scriptType: isClient ? 'client' : 'server',
      editingEntityId: entityId,
      grabbableKey: {grabbable: false, triggerable: false}
    };

    var translation = Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.5, z: -3 });
    var position = Vec3.sum(MyAvatar.position, translation);

    Entities.addEntity({
      type: "Web",
      dpi: 20,
      position: position,
      rotation: MyAvatar.orientation,
      sourceUrl: EDITOR_SOURCE_URL,
      script: EDITOR_CLIENT_SCRIPT_URL,
      dimensions: { x: EDITOR_WIDTH, y: EDITOR_HEIGHT, z: 0.01 },
      userData: JSON.stringify(userData)
    });
  });

}());
