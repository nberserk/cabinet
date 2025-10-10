Context:
1. this is Chrome extension
2. there are 2 components: daemon and client. daemon will interact with Chrome. client will call several APIs then daemon will return response
3. This spec doesn't include any UI components

requirements
1. when a client subscribes to daemon with a specific window, daemon will returns list of Chrome tab information so that a Client can build tab tree
2. The subscription happens per Chrome window
3. daemon just maintains subscribed client list only. it doesn't maintain any tab information.
4. Once it's subscribed, any changes of tab for the given window will be sent to a client
5. tab has parent/child relationshiop. same child will have same `openerTabId`
