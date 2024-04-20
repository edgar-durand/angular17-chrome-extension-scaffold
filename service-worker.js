self.addEventListener('install', event => {
  console.log('Application installed...');
});

chrome.webNavigation.onErrorOccurred.addListener(function (details) {
  console.log('error details.........', details)
});

chrome.runtime.onMessage.addListener((messageReceived, sender, respond) => {
  console.log('Received message...', messageReceived);

  const handler = new Promise(async (resolve, reject) => {
    resolve({aknowledged: true});
  });

  handler.then(message => {
    respond(message)
  }).catch(error => {
    respond(error)
  });
  return true;
})

