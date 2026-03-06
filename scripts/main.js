$(function() {
  try {
    const hasApp = !!window.App;
    const hasData = hasApp && !!window.App.Data && typeof window.App.Data.init === 'function';
    const hasUI = hasApp && !!window.App.UI && typeof window.App.UI.init === 'function';

    if (!hasApp || !hasData || !hasUI) {
      console.error('[Contract] Missing App modules. Ensure helpers.js, data.js, and ui.js are loaded correctly.');
      return;
    }

    // Initialize Data (loads from LocalStorage or seeds)
    App.Data.init();

    // Initialize UI event bindings
    App.UI.init();

    // Initial Render
    App.UI.switchView('dashboard');

  } catch (e) {
    console.error('Initialization failed', e);
    $('body').prepend(`<div class="p-4 bg-red-100 text-red-700 m-4 rounded-lg">Failed to load application: ${e.message}</div>`);
  }
});