console.log('Service Worker Loaded...');
self.addEventListener('install', event => {
  // chrome.storage.local.clear();

  chrome.storage.local.set({['step']: 'IDLE'}, () => {});
  chrome.storage.local.set({['enabled-seat-crawler']: true}, () => {});
  chrome.storage.local.set({['pause-timer']: false}, () => {});

  chrome.storage.local.set({['tickets-timer']: []}, () => {});
  chrome.storage.local.set({['filters']: []}, () => {});
  chrome.storage.local.set({['event-name']: null}, () => {});
  chrome.storage.local.set({['event-url']: null}, () => {});
  chrome.storage.local.set({['selected-config']: []}, () => {});
  chrome.storage.local.set({['current-event-index']: []}, () => {});
  chrome.storage.local.set({['group-tabs']: null}, () => {});
  chrome.storage.local.set({['GET_GENERAL_CONFIG']: []}, () => {});
  chrome.storage.local.set({['tab-scoped-configs']: []}, () => {});

  chrome.storage.local.set({['tm-tabs']: {}}, () => {});

  console.log('Service Worker Installed... and clear storage');

  // Agregar la lógica de instalación aquí
});

// self.addEventListener('fetch', event => {
//   if (true) {
//     event.waitUntil(
//       self.clients.matchAll().then(clients => {
//         clients.forEach(client => {
//           console.log('client..........', client)
//           client.postMessage({ command: 'playAudio' });
//         });
//       })
//     );
//   }
// });

function refreshTabWithDelay(tabId, delay) {
  // Esperar el retraso especificado
  const to = setTimeout(function() {
    clearTimeout(to)
    // Refrescar el tab
    chrome.tabs.reload(tabId);
  }, delay);
}

// chrome.runtime.onInstalled.addListener(function() {
//   chrome.declarativeNetRequest.updateDynamicRules({
//     addRules: [
//       {
//         id: 'modify-response-body',
//         priority: 1,
//         action: {
//           type: 'modifyResponseBody',
//           data: {
//             regex: 'https://www.example.com/api/endpoint',
//             modifyInfo: {
//               operation: 'rewrite',
//               data: {
//                 content: 'New response body'
//               }
//             }
//           }
//         },
//         condition: {
//           urlFilter: 'https://www.example.com/api/endpoint'
//         }
//       }
//     ],
//     removeRuleIds: []
//   });
// });

// chrome.webRequest.onBeforeRequest.addListener(
//   function(details) {
//     if (details.url.startsWith('https://identity.ticketmaster.com/json/signed-in?hard=false')) {
//       // Realiza la solicitud a la URL original para obtener la respuesta
//       // const originalResponse = fetch(details.url);
//       // // Modifica la respuesta según sea necesario
//       // const modifiedResponse = originalResponse.then(response => {
//       //   if (response.ok) {
//       //     return response.json();
//       //   } else {
//       //     throw new Error('Error en la solicitud');
//       //   }
//       // }).then(data => {
//       //   // Modifica la respuesta según sea necesario
//       //   data.signedIn = true;
//       //   return data;
//       // });
//       // Devuelve la respuesta modificada al navegador
//       return {
//         // redirectUrl: 'data:application/json;charset=utf-8,' + encodeURIComponent(body),
//         redirectUrl: URL.createObjectURL(new Blob([JSON.stringify(modifiedResponse)], { type: 'application/json' }))
//       };
//     }
//   },
//   { urls: ['https://identity.ticketmaster.com/json/signed-in?hard=false'] },
//   []
// );

chrome.webNavigation.onErrorOccurred.addListener(function(details) {
  console.log('error details.........', details)
  if (details.error === "net::ERR_INTERNET_DISCONNECTED") {
    // Aquí puedes notificar o realizar acciones adicionales en tu extensión
    console.log("Se detectó una pérdida de conexión a Internet");
  }
  if (details.error !== "net::ERR_ABORTED") {
    refreshTabWithDelay(details.tabId, 3000);
  }
});

const delay = async (sec) => {
  return new Promise( resolve => {
    const tm = setTimeout(() => {
      clearTimeout(tm);
      resolve(true);
    }, sec * 1000)
  });
}
const getFromStorage = (key) => {
  return new Promise(resolve => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key])
    });
  })
}

const addTabToGroup = async (tabId, group) => {
  let groupTabs = await getFromStorage('group-tabs');
  if (groupTabs[group]) {
    groupTabs[group].tabsIds ??= [];
    if (!groupTabs[group].tabsIds.includes(tabId)) {
      groupTabs[group].tabsIds.push(tabId);
    }
  } else {
    groupTabs ??= {};
    groupTabs[group] = {
      tabsIds: [tabId],
      groupId: null,
      properties: {
        title: group,
        color: group === 'JOIN' ? "red" : group === 'TICKETS' ? "green" : "yellow",
      },
    };
  }

  console.log('groupTabs..........', groupTabs);

  chrome.tabs.group({ tabIds: groupTabs[group].tabsIds, groupId: groupTabs[group].groupId ?? undefined }, (groupId) => {
    groupTabs[group].groupId = groupId;
    chrome.tabGroups.update(groupTabs[group].groupId ?? groupId, groupTabs[group].properties, () => {
      console.log("Grupo actualizado con una etiqueta personalizada y color.");
      chrome.storage.local.set({['group-tabs']: groupTabs}, () => console.log('saved...', groupTabs));
    });
  });
}
chrome.runtime.onMessage.addListener(({type, payload}, sender, respond) => {
  console.log({type, payload})

  const handler = new Promise(async (resolve, reject) => {

    switch (type) {

      case  'SEND_EMAIL': {
        const {TOKEN, API_URL, ...rest} = payload;
        try {
          await fetch(`${API_URL}/api/email`, {
            method: 'POST',
            body: JSON.stringify(rest),
            headers: {
              'Content-Type': 'application/json',
              "auth": TOKEN,
            }
          });
          console.log('Email sent');
          resolve({message: 'Email sent', result: true});
        } catch (e) {
          reject({message: e.message, result: false})
        }
      }
        break;

      case  'ADD_TAB_TO_GROUP': {
        await addTabToGroup(sender.tab.id, payload.group);
        resolve(sender.tab.id);
      }
        break;

      case  'GET_CURRENT_TAB': {
        try {
          const currentTabId = sender.tab.id;
          console.log('Current tab id....', currentTabId)
          resolve(sender.tab);
        } catch (e) {
          reject({message: e.message, result: false})
        }
      }
        break;

      case  'CREATE_TABS': {
        try {
          // const promises = [];
          // for (const item of payload) {
          //   const promise = new Promise((resolve) => {
          //     chrome.tabs.create({ url: item.eventUrl, active: true }, (tab) => {
          //       item.tabId = tab.id;
          //       item.step = 'INITIAL';
          //       resolve(tab);
          //       // chrome.scripting.executeScript({
          //       //   target: { tabId: tab.id },
          //       //   args: [item],
          //       //   func: setTitleScript
          //       // });
          //       // function setTitleScript(item) {
          //       //   document.title = item.eventName.substring(0, 30) + ' | ' + item.eventLocation;
          //       // }
          //     });
          //   });
          //   promises.push(promise);
          // }

          let group_Id = null;

          function createTabsWithDelay(payload, index = 0) {
            if (index >= payload.length) {
              // Se han creado todas las pestañas
              return Promise.resolve();
            }

            const item = payload[index];

            return new Promise((resolve) => {
              chrome.tabs.create({ url: item.eventUrl, active: true }, (tab) => {
                payload[index].tabId = tab.id;
                payload[index].step = 'INITIAL';
                chrome.storage.local.set({['selected-config']: payload}, () => console.log('saved...', payload));

                chrome.tabs.group({ tabIds: [tab.id], groupId: group_Id ?? undefined }, (groupId) => {
                  group_Id = groupId;
                  const properties = {
                    title: "IN PROGRESS",
                    color: "yellow"
                  };
                  chrome.tabGroups.update(group_Id ?? groupId, properties, async () => {
                    let groupTabs = await getFromStorage('group-tabs');
                    groupTabs ??= {};
                    groupTabs['IN PROGRESS'] = {
                      tabsIds: groupTabs['IN PROGRESS']?.tabsIds?.length ?
                        [...groupTabs['IN PROGRESS'].tabsIds, tab.id] :
                        [tab.id],
                      groupId: group_Id,
                      properties,
                    }
                    // group-tabs
                    chrome.storage.local.set({['group-tabs']: groupTabs}, () => console.log('saved...', groupTabs));
                    console.log("Grupo actualizado con una etiqueta personalizada y color.");
                  });
                });
                // chrome.scripting.executeScript({
                //   target: { tabId: tab.id },
                //   args: [item],
                //   func: setTitleScript
                // });
                // function setTitleScript(item) {
                //   document.title = item.eventName.substring(0, 30) + ' | ' + item.eventLocation;
                // }

                setTimeout(() => {
                  resolve();
                }, 5000); // Retraso de 5 segundos entre cada creación de pestaña
              });
            }).then(() => {
              return createTabsWithDelay(payload, index + 1); // Llamada recursiva para crear la siguiente pestaña
            });
          }

          createTabsWithDelay(payload).then(() => {
            console.log('Tabs created', payload)
            resolve({message: 'Tabs created', result: true});
          });

          // Promise.all(promises)
          //   .then(() => {
          //     console.log('Tabs created', payload)
          //     chrome.storage.local.set({['selected-config']: payload}, () => console.log('saved...', payload));
          //     resolve({message: 'Tabs created', result: true});
          //   }).catch((error) => {
          //     console.log(error)
          //   })

          resolve({message: 'Tabs created', result: true});
        } catch (e) {
          reject({message: e.message, result: false})
        }
      }
        break;

      case  'SEND_NOTIFICATION': {
        const {TOKEN, API_URL, ...rest} = payload;
        try {
          await fetch(`${API_URL}/api/notification`, {
            method: 'POST',
            body: JSON.stringify(rest),
            headers: {
              'Content-Type': 'application/json',
              "auth": TOKEN,
            }
          });
          console.log('Email sent');
          resolve({message: 'Email sent', result: true});
        } catch (e) {
          reject({message: e.message, result: false})
        }
      }
        break;

      case  'GET_GENERAL_CONFIG': {
        const {TOKEN, API_URL} = payload;
        // Get all groups with events
        try {
          const response = await fetch(`${API_URL}/api/events/group`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              "auth": TOKEN,
            }
          });
          const result = await response.json();
          resolve(result);
        } catch (e) {
          reject(e)
        }
      }
        break;

      case  'DISABLE_EXTENSION': {
        chrome.management.getSelf(function(info) {
          // Deshabilita la extensión
          chrome.management.setEnabled(info.id, false, function() {
            // La extensión ahora está deshabilitada
            console.log('Extension disabled')
            resolve({message: 'Extension disabled', result: true});
          });
        });
      }
        break;

    }
    resolve(payload);

  });

  handler.then(message => {
    respond(message)
  }).catch(error => {
    respond(error)
  });
  return true;
})

