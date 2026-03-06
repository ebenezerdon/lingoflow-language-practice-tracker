window.AppLLM = {
  engine: null,
  ready: false,
  modelId: localStorage.getItem('app.llm.model') || 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  _aborted: false,
  _loadingPromise: null,
  _lastProgress: 0,

  async load(modelId, updateProgress) {
    const id = modelId || this.modelId;
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported. Use Chrome/Edge 113+ or Firefox 118+.');
    }

    if (typeof updateProgress === 'function') {
      updateProgress(this._lastProgress || 0);
    }

    if (this.ready && this.engine && id === this.modelId) {
      this._lastProgress = 100;
      if (typeof updateProgress === 'function') updateProgress(100);
      return this.engine;
    }

    if (this._loadingPromise && id === this.modelId) {
      return this._loadingPromise;
    }

    this.modelId = id;
    localStorage.setItem('app.llm.model', id);
    this.ready = false;
    this._lastProgress = 1;
    if (typeof updateProgress === 'function') updateProgress(1);

    this._loadingPromise = (async () => {
      const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm@0.2.79');

      this.engine = await CreateMLCEngine(id, {
        useIndexedDBCache: true,
        initProgressCallback: (p) => {
          let percent = this._lastProgress || 1;
          if (p && typeof p === 'object' && 'progress' in p && typeof p.progress === 'number') {
            percent = Math.max(1, Math.floor(p.progress * 100));
          } else if (typeof p === 'number') {
            percent = Math.max(1, Math.floor(p * 100));
          } else if (p && typeof p === 'object' && typeof p.text === 'string') {
            percent = Math.max(this._lastProgress || 1, 1);
          }
          this._lastProgress = Math.min(100, percent);
          if (typeof updateProgress === 'function') updateProgress(this._lastProgress);
        },
      });

      this.ready = true;
      this._lastProgress = 100;
      if (typeof updateProgress === 'function') updateProgress(100);
      return this.engine;
    })();

    try {
      return await this._loadingPromise;
    } finally {
      this._loadingPromise = null;
    }
  },

  async generate(userText, { system = '', onToken } = {}) {
    if (!this.engine) throw new Error('Model not loaded');
    this._aborted = false;
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: userText });
    const stream = await this.engine.chat.completions.create({ messages, stream: true });
    for await (const chunk of stream) {
      if (this._aborted) break;
      const token = chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta ? chunk.choices[0].delta.content || '' : '';
      if (token && typeof onToken === 'function') onToken(token);
    }
  },

  stop() {
    this._aborted = true;
  },
};