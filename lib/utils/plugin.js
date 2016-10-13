/* eslint-disable global-require */
'use strict';

const npm = require('npm-programmatic');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');

const pluginsForHooks = {};

function getPluginPath(cagoOptions, pluginName) {
  return path.join(cagoOptions.locked.cagoPath, 'node_modules', pluginName);
}

function checkPlugins(cagoOptions, opts) {
  return new Promise((resolve, reject) => {
    const options = Object.assign({
      rejectOnMissing: true,
      loadPluginMetadata: false,
    }, opts);
    const plugins = Object.keys(cagoOptions.plugins);
    let allLoaded = false;
    const missingPlugins = [];
    if (plugins.length > 0) {
      plugins.forEach((pluginName) => {
        try {
          const pluginPath = getPluginPath(cagoOptions, pluginName);
          fs.statSync(pluginPath);
          if (options.loadPluginMetadata) {
            const plugin = require(pluginPath);
            if ({}.hasOwnProperty.call(pluginsForHooks, plugin.hook) === false) {
              pluginsForHooks[plugin.hook] = [];
            }
            pluginsForHooks[plugin.hook].push(pluginName);
          }
          allLoaded = true;
        } catch (err) {
          allLoaded = false;
          missingPlugins.push(pluginName);
        }
      });
      if (missingPlugins.length > 0 && options.rejectOnMissing) {
        return reject(`Missing plugins(s):\n\t${missingPlugins.join('\n\t')}`);
      }
    } else {
      allLoaded = true;
    }
    const ret = {
      checked: true,
      allLoaded,
    };
    if (missingPlugins.length > 0) {
      ret.missing = missingPlugins;
    }
    return resolve(ret);
  });
}

function installPlugins(cagoOptions) {
  return new Promise((resolve, reject) => {
    checkPlugins(cagoOptions, { rejectOnMissing: false, loadPluginMetadata: true })
      .then((results) => {
        if (
          results.allLoaded === false
          && results.missing.length > 0
        ) {
          const pluginList = [];
          results.missing.forEach((pluginName) => {
            pluginList.push(cagoOptions.plugins[pluginName]);
          });
          return npm.install(pluginList, {
            cwd: cagoOptions.locked.cagoPath,
          });
        }
        return Promise.resolve();
      })
      .then(() => {
        resolve({
          success: true,
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function setupPluginPaths(cagoOptions) {
  return new Promise((resolve) => {
    try {
      fs.statSync(cagoOptions.locked.cagoPath);
    } catch (e) {
      fs.mkdirSync(cagoOptions.locked.cagoPath);
    }
    resolve();
  });
}

function runPlugins(cagoOptions, hook) {
  return new Promise((resolve, reject) => {
    const pluginList = pluginsForHooks[hook] || [];
    if (pluginList.length > 0) {
      Promise.reduce(pluginList, (results, pluginName) => {
        const pluginPath = getPluginPath(cagoOptions, pluginName);
        const plugin = require(pluginPath);
        return plugin.run(Object.assign({}, cagoOptions), results);
      }, {})
      .then((results) => {
        resolve(results);
      })
      .catch((err) => {
        reject(err);
      });
    } else {
      reject(`No plugin setup for hook: ${hook}`);
    }
  });
}

module.exports = {
  getPluginPath,
  setupPluginPaths,
  checkPlugins,
  installPlugins,
  runPlugins,
  pluginsForHooks,
};
