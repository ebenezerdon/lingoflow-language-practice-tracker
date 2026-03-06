window.App = window.App || {};

(function() {
  'use strict';

  const STORAGE_KEY = 'lingoflow_data_v1';

  // Default initial state if none exists
  const DEFAULT_STATE = {
    words: [],
    activity: {}, // Format: "YYYY-MM-DD": number of words practiced
    streak: {
      current: 0,
      longest: 0,
      lastActiveDate: null
    },
    settings: {
      targetLanguage: 'Spanish',
      dailyGoal: 15
    }
  };

  // Seed data for a better first-time experience
  const SEED_DATA = {
    ...DEFAULT_STATE,
    words: [
      { id: App.Utils.generateId(), term: 'Desarrollo', translation: 'Development', lang: 'Spanish', context: 'El desarrollo de software es complejo.', level: 1, nextReview: App.Utils.getTodayString(), addedAt: new Date().toISOString() },
      { id: App.Utils.generateId(), term: 'Éxito', translation: 'Success', lang: 'Spanish', context: 'El éxito requiere esfuerzo.', level: 2, nextReview: App.Utils.getTodayString(), addedAt: new Date().toISOString() },
      { id: App.Utils.generateId(), term: 'Siempre', translation: 'Always', lang: 'Spanish', context: 'Siempre aprendo algo nuevo.', level: 3, nextReview: App.Utils.getTodayString(), addedAt: new Date().toISOString() },
      { id: App.Utils.generateId(), term: 'Cotidiano', translation: 'Everyday / Daily', lang: 'Spanish', context: 'Es parte de mi vida cotidiana.', level: 0, nextReview: App.Utils.getTodayString(), addedAt: new Date().toISOString() }
    ]
  };

  App.Data = {
    state: null,

    init: function() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.state = JSON.parse(stored);
          this._checkStreak();
        } catch (e) {
          console.error('Failed to parse stored data', e);
          this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
      } else {
        // Load seed data on very first visit
        this.state = JSON.parse(JSON.stringify(SEED_DATA));
        this.save();
      }
    },

    save: function() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    },

    // --- Vocabulary Methods ---
    getWords: function() {
      return this.state.words.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    },

    addWord: function(wordObj) {
      const newWord = {
        id: App.Utils.generateId(),
        term: wordObj.term,
        translation: wordObj.translation,
        lang: wordObj.lang || this.state.settings.targetLanguage,
        context: wordObj.context || '',
        level: 0, // 0 = new, 1-4 = increasing mastery
        nextReview: App.Utils.getTodayString(),
        addedAt: new Date().toISOString()
      };
      this.state.words.unshift(newWord);
      this.save();
      return newWord;
    },

    deleteWord: function(id) {
      this.state.words = this.state.words.filter(w => w.id !== id);
      this.save();
    },

    // --- Practice & SRS Logic ---
    getWordsToReview: function() {
      const today = App.Utils.getTodayString();
      // Simple SRS logic: return words where nextReview is today or in the past
      return this.state.words.filter(w => w.nextReview <= today);
    },

    processReviewSession: function(reviewedWordsResults) {
      const today = App.Utils.getTodayString();
      let count = 0;

      reviewedWordsResults.forEach(result => {
        const wordIndex = this.state.words.findIndex(w => w.id === result.id);
        if (wordIndex > -1) {
          let word = this.state.words[wordIndex];
          
          if (result.correct) {
            word.level = Math.min(4, word.level + 1);
            // SRS scheduling based on level
            const daysToAdd = [1, 3, 7, 14, 30][word.level];
            let nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + daysToAdd);
            word.nextReview = nextDate.toISOString().split('T')[0];
          } else {
            // Reset if wrong
            word.level = 0;
            word.nextReview = today;
          }
          count++;
        }
      });

      // Update Activity
      if (!this.state.activity[today]) {
        this.state.activity[today] = 0;
      }
      this.state.activity[today] += count;

      // Update Streak
      this._updateStreak(today);
      
      this.save();
      return count;
    },

    // --- Streak Logic ---
    _checkStreak: function() {
      const today = App.Utils.getTodayString();
      const lastActive = this.state.streak.lastActiveDate;
      
      if (!lastActive) return;
      
      // If last active was before yesterday, streak is broken
      if (lastActive !== today && lastActive !== App.Utils.getDaysAgoString(1)) {
        this.state.streak.current = 0;
        this.save();
      }
    },

    _updateStreak: function(today) {
      const lastActive = this.state.streak.lastActiveDate;
      
      if (lastActive === today) {
        // Already active today, streak doesn't increase
        return;
      }

      if (lastActive === App.Utils.getDaysAgoString(1)) {
        // Active yesterday, increase streak
        this.state.streak.current++;
      } else {
        // Streak was broken, start new
        this.state.streak.current = 1;
      }

      if (this.state.streak.current > this.state.streak.longest) {
        this.state.streak.longest = this.state.streak.current;
      }

      this.state.streak.lastActiveDate = today;
    },

    getHeatmapData: function() {
      // Generate last 60 days of activity
      const data = [];
      for (let i = 59; i >= 0; i--) {
        const dateStr = App.Utils.getDaysAgoString(i);
        const count = this.state.activity[dateStr] || 0;
        let level = 0;
        if (count > 0) level = 1;
        if (count >= 5) level = 2;
        if (count >= 15) level = 3;
        if (count >= 30) level = 4;
        
        data.push({
          date: dateStr,
          count: count,
          level: level
        });
      }
      return data;
    }
  };
})();