window.App = window.App || {};

(function() {
  'use strict';

  App.UI = {
    currentView: 'dashboard',
    isPracticing: false,
    practiceQueue: [],
    practiceCurrentIndex: 0,
    practiceResults: [],

    init: function() {
      // Bind Navigation
      $('.nav-item').on('click', function(e) {
        e.preventDefault();
        const view = $(this).data('view');
        if(view) App.UI.switchView(view);
      });

      // Bind Global Actions
      $('#btn-add-word').on('click', () => this.showAddWordModal());
      $('#modal-overlay, #btn-close-modal').on('click', (e) => {
        if (e.target === e.currentTarget) this.closeModal();
      });

      // Bind Form Submit
      $('#form-add-word').on('submit', (e) => {
        e.preventDefault();
        this.handleSaveWord();
      });

      // Bind AI context generator
      $('#btn-ai-context').on('click', () => this.generateAiContext());
    },

    switchView: function(viewId) {
      if (this.isPracticing && viewId !== 'practice') {
        if (!confirm('Abandon current practice session?')) return;
        this.endPracticeSession(false);
      }

      $('.nav-item').removeClass('bg-emerald-50 text-emerald-600').addClass('text-slate-600 hover:bg-slate-50');
      $(`.nav-item[data-view="${viewId}"]`).addClass('bg-emerald-50 text-emerald-600').removeClass('text-slate-600 hover:bg-slate-50');

      $('.view-section').addClass('hidden').removeClass('animate-fade-in');
      $(`#view-${viewId}`).removeClass('hidden').addClass('animate-fade-in');
      
      this.currentView = viewId;
      this.renderCurrentView();
    },

    renderCurrentView: function() {
      switch(this.currentView) {
        case 'dashboard': this.renderDashboard(); break;
        case 'vocabulary': this.renderVocabulary(); break;
        case 'insights': this.renderInsights(); break;
        case 'practice': 
          if (!this.isPracticing) this.renderPracticeLobby(); 
          break;
      }
    },

    // --- Dashboard View ---
    renderDashboard: function() {
      const words = App.Data.getWords();
      const reviewCount = App.Data.getWordsToReview().length;
      const streak = App.Data.state.streak.current;

      $('#dash-total-words').text(words.length);
      $('#dash-reviews').text(reviewCount);
      $('#dash-streak').text(streak);

      const recentContainer = $('#dash-recent-words');
      recentContainer.empty();
      
      const recent = words.slice(0, 5);
      if (recent.length === 0) {
        recentContainer.html(`<div class="text-center text-slate-400 py-6">No words added yet.</div>`);
      } else {
        recent.forEach(w => {
          recentContainer.append(`
            <div class="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
              <div>
                <span class="font-medium text-slate-800">${App.Utils.escapeHtml(w.term)}</span>
                <span class="text-slate-400 mx-2">→</span>
                <span class="text-slate-600">${App.Utils.escapeHtml(w.translation)}</span>
              </div>
              <div class="flex space-x-1">
                ${this.renderMasteryDots(w.level)}
              </div>
            </div>
          `);
        });
      }
    },

    renderMasteryDots: function(level) {
      let html = '';
      for (let i = 1; i <= 4; i++) {
        if (i <= level) html += `<div class="w-2 h-2 rounded-full bg-emerald-500"></div>`;
        else html += `<div class="w-2 h-2 rounded-full bg-slate-200"></div>`;
      }
      return html;
    },

    // --- Vocabulary View ---
    renderVocabulary: function() {
      const words = App.Data.getWords();
      const container = $('#vocab-list');
      container.empty();

      if (words.length === 0) {
        container.html(`
          <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-100">
            <div class="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              ${App.Icons.book}
            </div>
            <h3 class="text-lg font-medium text-slate-800 mb-1">Your vocabulary is empty</h3>
            <p class="text-slate-500 mb-6">Start adding words to build your personal dictionary.</p>
            <button onclick="App.UI.showAddWordModal()" class="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm">
              Add First Word
            </button>
          </div>
        `);
        return;
      }

      words.forEach((w, index) => {
        const delayClass = `stagger-${(index % 4) + 1}`;
        container.append(`
          <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 hover-card-lift animate-slide-up ${delayClass}">
            <div class="flex justify-between items-start gap-3 mb-4">
              <div>
                <h3 class="text-lg sm:text-xl font-bold text-slate-800 break-words">${App.Utils.escapeHtml(w.term)}</h3>
                <p class="text-emerald-600 font-medium">${App.Utils.escapeHtml(w.translation)}</p>
              </div>
              <button onclick="App.UI.deleteWord('${w.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-1" title="Delete">
                ${App.Icons.trash}
              </button>
            </div>
            ${w.context ? `<p class="text-sm text-slate-500 italic mb-4 bg-slate-50 p-2 rounded-lg break-words">\"${App.Utils.escapeHtml(w.context)}\"</p>` : ''}
            <div class="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
              <div class="flex space-x-1" title="Mastery Level">
                ${this.renderMasteryDots(w.level)}
              </div>
              <span class="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-md">
                ${w.lang}
              </span>
            </div>
          </div>
        `);
      });
    },

    deleteWord: function(id) {
      if (confirm('Are you sure you want to delete this word?')) {
        App.Data.deleteWord(id);
        this.renderVocabulary();
        App.Toast.show('Word deleted');
      }
    },

    // --- Modal Logic ---
    showAddWordModal: function() {
      $('#form-add-word')[0].reset();
      $('#modal-title').text('Add New Word');
      $('#ai-context-container').hide();
      $('#modal-overlay').removeClass('hidden').addClass('flex animate-fade-in');
      setTimeout(() => $('#word-term').focus(), 100);
    },

    closeModal: function() {
      $('#modal-overlay').addClass('hidden').removeClass('flex animate-fade-in');
    },

    handleSaveWord: function() {
      const term = $('#word-term').val().trim();
      const translation = $('#word-translation').val().trim();
      const context = $('#word-context').val().trim();

      if (!term || !translation) {
        App.Toast.show('Please fill in required fields', 'error');
        return;
      }

      App.Data.addWord({ term, translation, context });
      this.closeModal();
      App.Toast.show('Word added successfully');
      
      if (this.currentView === 'vocabulary' || this.currentView === 'dashboard') {
        this.renderCurrentView();
      }
    },

    // --- AI Context Generation ---
    generateAiContext: async function() {
      const term = $('#word-term').val().trim();
      if (!term) {
        App.Toast.show('Enter a word first to generate context.', 'error');
        return;
      }

      const btn = $('#btn-ai-context');
      const ogText = btn.html();
      btn.prop('disabled', true).html(`<svg class="animate-spin h-4 w-4 mr-2 inline" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Initializing AI...`);

      try {
        if (!window.AppLLM.ready) {
          // Show progress container in modal
          $('#ai-progress-container').removeClass('hidden');
          await window.AppLLM.load(null, (percent) => {
            $('#ai-progress-bar').css('width', `${percent}%`);
            if (percent === 100) $('#ai-progress-container').addClass('hidden');
          });
        }

        btn.html(`<svg class="animate-spin h-4 w-4 mr-2 inline" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...`);
        $('#word-context').val('');
        
        const prompt = `Write a short, simple, single example sentence in the native language using the word "${term}". Do not include translations or extra text. Just the sentence.`;
        
        await window.AppLLM.generate(prompt, {
          system: 'You are a helpful language teacher. Keep responses to a single short sentence.',
          onToken: (token) => {
            const current = $('#word-context').val();
            $('#word-context').val(current + token);
          }
        });
        App.Toast.show('Context generated!');
      } catch (e) {
        console.error(e);
        App.Toast.show('AI Error: ' + e.message, 'error');
        $('#ai-progress-container').addClass('hidden');
      } finally {
        btn.prop('disabled', false).html(ogText);
      }
    },

    // --- Practice View ---
    renderPracticeLobby: function() {
      const container = $('#view-practice');
      const toReview = App.Data.getWordsToReview();
      
      let html = `
        <div class="max-w-2xl mx-auto mt-8 sm:mt-12 text-center animate-slide-up px-2">
          <div class="w-24 h-24 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 class="text-2xl sm:text-3xl font-bold text-slate-800 mb-4">Ready to Practice?</h2>
      `;

      if (toReview.length === 0) {
        html += `
          <p class="text-slate-500 text-lg mb-8">You have no words scheduled for review right now. Great job!</p>
          <button onclick="App.UI.startPracticeSession(true)" class="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all">
            Practice Random Words Anyway
          </button>
        `;
      } else {
        html += `
          <p class="text-slate-500 text-lg mb-8">You have <span class="font-bold text-orange-500">${toReview.length}</span> words scheduled for review today based on spaced repetition.</p>
          <button onclick="App.UI.startPracticeSession(false)" class="w-full sm:w-auto bg-orange-500 text-white px-6 sm:px-8 py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-orange-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
            Start Review Session
          </button>
        `;
      }
      html += `</div>`;
      container.html(html);
    },

    startPracticeSession: function(forceRandom) {
      this.isPracticing = true;
      this.practiceResults = [];
      
      let pool = forceRandom ? App.Data.getWords() : App.Data.getWordsToReview();
      // Shuffle
      this.practiceQueue = pool.sort(() => 0.5 - Math.random()).slice(0, 15); // Max 15 per session
      this.practiceCurrentIndex = 0;

      if (this.practiceQueue.length === 0) {
        App.Toast.show('Not enough words to practice.', 'error');
        this.isPracticing = false;
        return;
      }

      this.renderPracticeCard();
    },

    renderPracticeCard: function() {
      const container = $('#view-practice');
      const word = this.practiceQueue[this.practiceCurrentIndex];
      const progress = ((this.practiceCurrentIndex) / this.practiceQueue.length) * 100;

      container.html(`
        <div class="max-w-xl mx-auto animate-fade-in px-1 sm:px-0">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
            <button onclick="App.UI.endPracticeSession(false)" class="text-slate-400 hover:text-slate-700 font-medium px-3 py-1 bg-white rounded-lg border border-slate-200">Quit</button>
            <div class="order-3 sm:order-2 basis-full sm:basis-auto flex-1 sm:mx-6">
              <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div class="h-full bg-orange-500 transition-all duration-500" style="width: ${progress}%"></div>
              </div>
            </div>
            <span class="text-slate-500 font-medium">${this.practiceCurrentIndex + 1} / ${this.practiceQueue.length}</span>
          </div>

          <div class="perspective-1000 mb-6 sm:mb-8" id="flashcard-container">
            <div id="flashcard-inner" class="relative w-full min-h-[18rem] h-[18rem] sm:h-80 transform-style-3d cursor-pointer" onclick="App.UI.flipCard()">
              <!-- Front -->
              <div class="absolute w-full h-full backface-hidden bg-white border-2 border-slate-100 rounded-3xl shadow-sm flex flex-col items-center justify-center p-8">
                <span class="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">${word.lang}</span>
                <h2 class="text-3xl sm:text-5xl font-bold text-slate-800 text-center break-words">${App.Utils.escapeHtml(word.term)}</h2>
                <p class="mt-8 text-slate-400 text-sm">Tap to reveal translation</p>
              </div>
              
              <!-- Back -->
              <div class="absolute w-full h-full backface-hidden bg-emerald-600 rounded-3xl shadow-lg flex flex-col items-center justify-center p-8 rotate-y-180">
                <h2 class="text-3xl sm:text-4xl font-bold text-white text-center mb-6 break-words">${App.Utils.escapeHtml(word.translation)}</h2>
                ${word.context ? `<p class="text-emerald-100 text-center italic">"${App.Utils.escapeHtml(word.context)}"</p>` : ''}
              </div>
            </div>
          </div>

          <div id="practice-controls" class="flex flex-col sm:flex-row gap-3 sm:gap-4 opacity-0 transition-opacity duration-300 pointer-events-none">
            <button onclick="App.UI.answerCard(false)" class="flex-1 bg-white border-2 border-red-200 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-50 hover:border-red-300 transition-colors">
              Hard / Incorrect
            </button>
            <button onclick="App.UI.answerCard(true)" class="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 shadow-md transition-colors">
              Got it right
            </button>
          </div>
        </div>
      `);
    },

    flipCard: function() {
      $('#flashcard-inner').toggleClass('rotate-y-180');
      $('#practice-controls').removeClass('opacity-0 pointer-events-none');
      // Remove click handler from card once flipped to avoid weird interactions
      $('#flashcard-inner').prop('onclick', null).off('click');
    },

    answerCard: function(correct) {
      const word = this.practiceQueue[this.practiceCurrentIndex];
      this.practiceResults.push({ id: word.id, correct: correct });

      this.practiceCurrentIndex++;
      if (this.practiceCurrentIndex >= this.practiceQueue.length) {
        this.endPracticeSession(true);
      } else {
        this.renderPracticeCard();
      }
    },

    endPracticeSession: function(completed) {
      this.isPracticing = false;
      if (completed && this.practiceResults.length > 0) {
        const count = App.Data.processReviewSession(this.practiceResults);
        App.Toast.show(`Session complete! Processed ${count} words.`);
        this.renderPracticeSummary();
      } else {
        this.renderPracticeLobby();
      }
    },

    renderPracticeSummary: function() {
      const container = $('#view-practice');
      const correctCount = this.practiceResults.filter(r => r.correct).length;
      const accuracy = Math.round((correctCount / this.practiceResults.length) * 100);

      container.html(`
        <div class="max-w-md mx-auto mt-8 sm:mt-12 text-center animate-slide-up bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-100">
          <div class="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 class="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Great Session!</h2>
          <p class="text-slate-500 mb-8">You reviewed ${this.practiceResults.length} words.</p>
          
          <div class="grid grid-cols-2 gap-4 mb-8">
            <div class="bg-slate-50 p-4 rounded-2xl">
              <div class="text-3xl font-bold text-slate-800 mb-1">${accuracy}%</div>
              <div class="text-xs text-slate-500 uppercase font-bold tracking-wider">Accuracy</div>
            </div>
            <div class="bg-orange-50 p-4 rounded-2xl">
              <div class="text-3xl font-bold text-orange-600 mb-1">+${this.practiceResults.length}</div>
              <div class="text-xs text-orange-500 uppercase font-bold tracking-wider">XP Gained</div>
            </div>
          </div>

          <button onclick="App.UI.switchView('dashboard')" class="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 transition-colors">
            Back to Dashboard
          </button>
        </div>
      `);
    },

    // --- Insights View ---
    renderInsights: function() {
      const container = $('#view-insights');
      const streak = App.Data.state.streak;
      const heatmapData = App.Data.getHeatmapData();

      let heatmapHtml = '';
      // Simple CSS grid for heatmap. 60 days approx 8.5 weeks. We'll do a simple wrap flex
      heatmapData.forEach(day => {
        heatmapHtml += `<div class="heatmap-cell" data-level="${day.level}" title="${day.date}: ${day.count} words"></div>`;
      });

      container.html(`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-slide-up">
          <!-- Streak Card -->
          <div class="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
            <div class="relative z-10">
              <div class="flex items-center space-x-3 mb-8">
                <div class="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  ${App.Icons.flame}
                </div>
                <h3 class="text-xl font-bold">Current Streak</h3>
              </div>
              <div class="flex items-end space-x-2">
                <span class="text-5xl sm:text-6xl font-black">${streak.current}</span>
                <span class="text-xl font-medium mb-1 opacity-80">days</span>
              </div>
              <p class="mt-4 text-orange-100 font-medium">Longest streak: ${streak.longest} days</p>
            </div>
            <!-- Decorative bg elements -->
            <div class="absolute -bottom-10 -right-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div class="absolute top-10 right-10 w-24 h-24 bg-yellow-300 opacity-20 rounded-full blur-xl"></div>
          </div>

          <!-- Stats Card -->
          <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
            <h3 class="text-xl font-bold text-slate-800 mb-6">Overall Progress</h3>
            <div class="space-y-6">
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-slate-500 font-medium">Total Words Learned</span>
                  <span class="font-bold text-slate-800">${App.Data.state.words.length}</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500" style="width: 100%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-slate-500 font-medium">Mastered Words (Level 4)</span>
                  <span class="font-bold text-slate-800">${App.Data.state.words.filter(w=>w.level===4).length}</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500" style="width: ${App.Data.state.words.length ? (App.Data.state.words.filter(w=>w.level===4).length / App.Data.state.words.length)*100 : 0}%"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Heatmap Card -->
          <div class="col-span-1 md:col-span-2 bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm">
            <h3 class="text-xl font-bold text-slate-800 mb-2">Activity Heatmap</h3>
            <p class="text-slate-500 text-sm mb-6">Your practice history over the last 60 days</p>
            <div class="flex flex-wrap gap-1.5 justify-start overflow-x-auto pb-1">
              ${heatmapHtml}
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2 mt-4 text-xs text-slate-400 font-medium">
              <span>Less</span>
              <div class="w-3 h-3 rounded-sm bg-[#e2e8f0]"></div>
              <div class="w-3 h-3 rounded-sm bg-[#a7f3d0]"></div>
              <div class="w-3 h-3 rounded-sm bg-[#34d399]"></div>
              <div class="w-3 h-3 rounded-sm bg-[#10b981]"></div>
              <div class="w-3 h-3 rounded-sm bg-[#059669]"></div>
              <span>More</span>
            </div>
          </div>
        </div>
      `);
    }
  };
})();