// override.js — 更新版：更快的 urgent 执行 + 更稳健的 key 正则（防止长句内误替换）
(function(){
  // -------- 配置 --------
  const LONG_TEXT_THRESHOLD = 80; // 超过此字符数的文本容器/单节点将跳过替换（可按需调整）
  let M = {
    "Playground": "沙盒 (Playground)",
    "Gallery": "画廊",
    "Run": "运行",
    "Save": "保存",
    "Settings": "设置"
  };

  // -------- 工具函数 --------
  function escapeRe(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE','INPUT','SELECT','OPTION']);
  const BLOCK_PARENT_TAGS = new Set(['P','DIV','SECTION','ARTICLE','LI','TD','TH','HEADER','FOOTER','MAIN','ASIDE','NAV','FIGURE','FIGCAPTION','BLOCKQUOTE','PRE']);

  function isInsideSkipTag(node){
    let el = node && (node.nodeType === 1 ? node : node.parentElement);
    while(el){
      if(el.tagName && SKIP_TAGS.has(el.tagName)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function findNearestTextContainer(node){
    if(!node) return null;
    let el = node.nodeType === 3 ? node.parentElement : (node.nodeType === 1 ? node : node.parentElement);
    while(el){
      if(el.tagName && BLOCK_PARENT_TAGS.has(el.tagName)) return el;
      if(!el.parentElement) return el;
      el = el.parentElement;
    }
    return null;
  }

  function shouldSkipByContainer(node){
    if(!node) return false;
    if(isInsideSkipTag(node)) return true;
    const container = findNearestTextContainer(node);
    if(!container) return false;
    const text = (container.textContent || '').trim();
    if(!text) return false;
    return text.length > LONG_TEXT_THRESHOLD;
  }

  // -------- 构建更稳健的正则 --------
  let entries = [];
  function makeRegexForKey(k){
    const esc = escapeRe(k);
    // 首选：尝试用 Unicode 属性和 lookbehind/lookahead 限定左右为非字母数字下划线
    // 例如：(?<![\p{L}\p{N}_])key(?![\p{L}\p{N}_])
    try{
      // 'u' required for \p, 'i' for case-insensitive, 'g' for global
      return new RegExp('(?<![\\p{L}\\p{N}_])' + esc + '(?![\\p{L}\\p{N}_])', 'giu');
    }catch(e){
      // 某些环境可能不支持 \p or lookbehind；退回到较宽松但安全的回退策略
      if(/^[A-Za-z0-9_]+$/.test(k)){
        // 纯单词（ASCII）使用单词边界 \b
        return new RegExp('\\b' + esc + '\\b', 'gi');
      } else {
        // 否则回退到最简单的字面全局替换（保留原行为）
        return new RegExp(esc, 'gi');
      }
    }
  }

  function rebuildEntries(){
    entries = Object.keys(M)
      .sort((a,b)=>b.length - a.length) // 长词先替换，避免被短词覆盖
      .map(k=>{
        const re = makeRegexForKey(k);
        return { key: k, value: M[k], re };
      });
  }
  rebuildEntries();

  function replaceString(s){
    if(!s) return s;
    let out = String(s);
    for(const e of entries){
      try{ out = out.replace(e.re, e.value); }catch(err){}
    }
    return out;
  }

  // -------- 原始保存（以便 disable 恢复） --------
  const savedTextNodes = new Map();    // TextNode -> original string
  const savedElements = new Map();     // Element -> { innerText?: orig, attrs?: {name:orig} }

  function saveTextNodeOriginal(node){
    if(!node || node.nodeType !== 3) return;
    if(savedTextNodes.has(node)) return;
    savedTextNodes.set(node, node.nodeValue);
  }
  function saveElementOriginal(el){
    if(!el || el.nodeType !== 1) return;
    if(savedElements.has(el)) return;
    const store = {};
    store.innerText = el.childElementCount === 0 ? el.innerText : undefined;
    store.attrs = {};
    savedElements.set(el, store);
  }
  function restoreAllOriginals(){
    try{
      for(const [node,orig] of Array.from(savedTextNodes.entries())){
        try{ node.nodeValue = orig; }catch(e){}
      }
      savedTextNodes.clear();
      for(const [el,store] of Array.from(savedElements.entries())){
        try{
          if(store && typeof store.innerText === 'string') el.innerText = store.innerText;
          if(store && store.attrs){
            for(const [name, val] of Object.entries(store.attrs)){
              if(val === null) el.removeAttribute(name);
              else el.setAttribute(name, val);
            }
          }
        }catch(e){}
      }
      savedElements.clear();
    }catch(e){
      console.error('override restore error', e);
    }
  }

  // -------- 翻译函数（包含容器级长句跳过） --------
  function translateTextNode(node){
    if(!node || node.nodeType !== 3) return;
    if(shouldSkipByContainer(node)) return;
    if(isInsideSkipTag(node)) return;
    const txt = String(node.nodeValue || '');
    if(!txt) return;
    if(txt.length > LONG_TEXT_THRESHOLD) return;
    const orig = txt;
    const replaced = replaceString(orig);
    if(replaced !== orig){
      saveTextNodeOriginal(node);
      node.nodeValue = replaced;
    }
  }

  function translateAttributes(el){
    if(!el || el.nodeType !== 1) return;
    if(isInsideSkipTag(el)) return;
    const attrs = ["placeholder","title","alt","aria-label","value"];
    for(const a of attrs){
      try{
        if(el.hasAttribute && el.hasAttribute(a)){
          const v = el.getAttribute(a);
          if(v){
            if(String(v).length > LONG_TEXT_THRESHOLD) continue;
            const nv = replaceString(v);
            if(nv !== v){
              if(!savedElements.has(el)) saveElementOriginal(el);
              const store = savedElements.get(el);
              if(store && store.attrs && !(a in store.attrs)) store.attrs[a] = v;
              el.setAttribute(a, nv);
            }
          }
        }
      }catch(e){}
    }
  }

  function translateElement(el){
    if(!el || el.nodeType !== 1) return;
    if(shouldSkipByContainer(el)) return;
    if(isInsideSkipTag(el)) return;
    try{
      if(el.childElementCount === 0){
        const txt = el.innerText || '';
        if(!txt) return;
        if(txt.length > LONG_TEXT_THRESHOLD) return;
        const r = replaceString(txt);
        if(r !== txt){
          if(!savedElements.has(el)) saveElementOriginal(el);
          const store = savedElements.get(el);
          if(store && store.innerText === undefined) store.innerText = txt;
          el.innerText = r;
        }
      } else {
        if(el.childElementCount <= 8){
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
          let n;
          while(n = walker.nextNode()){
            translateTextNode(n);
          }
        }
      }
    }catch(e){}
    translateAttributes(el);
  }

  function walkAndTranslate(root){
    if(!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while(n = walker.nextNode()) translateTextNode(n);
    const els = root.querySelectorAll('*');
    for(const el of els) translateElement(el);
  }

  // -------- Observer 与调度（urgent 支持） --------
  let observer = null;
  const pending = new Set();
  let scheduled = false;
  let enabled = false;
  let navigationDetected = false;

  function enqueueNodeForTranslate(node, urgent){
    if(!node) return;
    if(isInsideSkipTag(node)) return;
    if(urgent){
      try{
        if(node.nodeType === 3) translateTextNode(node);
        else if(node.nodeType === 1){
          translateElement(node);
          if(node.childElementCount > 8) walkAndTranslate(node);
        } else if(node.querySelectorAll){
          walkAndTranslate(node);
        }
      }catch(e){}
      return;
    }
    pending.add(node);
    scheduleProcess();
  }

  function scheduleProcess(urgent){
    if(urgent){
      if(scheduled === 'urgent') return;
      scheduled = 'urgent';
      // 尽量在微任务中立刻执行，减少浏览器在下一次 paint 前出现未翻译文本的机会
      Promise.resolve().then(()=>{
        try{ processPending({force:true}); }catch(e){ console.error(e); } finally { scheduled = false; }
      });
      return;
    }
    if(scheduled) return;
    scheduled = true;
    const runner = () => { scheduled = false; processPending({force:false}); };
    // 尽量在下一帧前运行（比 requestIdleCallback 更接近 render 时机）
    if(typeof requestAnimationFrame !== 'undefined'){
      try{ requestAnimationFrame(runner); }catch(e){ setTimeout(runner, 50); }
    } else if('requestIdleCallback' in window){
      try{ requestIdleCallback(runner, {timeout:200}); }catch(e){ setTimeout(runner, 50); }
    } else { setTimeout(runner, 50); }
  }

  function processPending(opts){
    opts = opts || {};
    try{ if(observer && observer.disconnect) observer.disconnect(); }catch(e){}
    try{
      if(pending.size === 0 || opts.force){
        walkAndTranslate(document.body);
      } else {
        for(const node of Array.from(pending)){
          try{
            if(!node) continue;
            if(node.nodeType === 3) translateTextNode(node);
            else if(node.nodeType === 1){
              translateElement(node);
              if(node.childElementCount > 8) walkAndTranslate(node);
              else {
                const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
                let n;
                while(n = walker.nextNode()) translateTextNode(n);
              }
            } else {
              if(node.querySelectorAll) walkAndTranslate(node);
            }
          }catch(e){}
        }
      }
    }catch(e){ console.error("override processPending error:", e); }
    finally{
      pending.clear();
      try{ if(observer && observer.observe) observer.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['title','placeholder','alt','aria-label','value'] }); }catch(e){}
    }
  }

  function createObserver(){
    if(observer) try{ observer.disconnect(); }catch(e){}
    observer = new MutationObserver((mutations)=>{
      let smallCount = 0;
      for(const m of mutations){
        try{
          if(m.type === 'characterData' && m.target) {
            enqueueNodeForTranslate(m.target, false);
            smallCount++;
          }
          else if(m.addedNodes && m.addedNodes.length){
            for(const n of m.addedNodes){
              if(!n) continue;
              if(n.nodeType === 3) { enqueueNodeForTranslate(n, true); smallCount++; }
              else if(n.nodeType === 1){
                if(n.childElementCount === 0 || (n.textContent && n.textContent.length < 200)){
                  enqueueNodeForTranslate(n, true); smallCount++;
                } else {
                  enqueueNodeForTranslate(n, false);
                }
              } else {
                enqueueNodeForTranslate(n, false);
              }
            }
          }
          else if(m.type === 'attributes' && m.target){
            enqueueNodeForTranslate(m.target, false);
            smallCount++;
          }
        }catch(e){}
      }
      if(mutations.length > 8 || smallCount > 6 || navigationDetected) scheduleProcess(true);
      else scheduleProcess(false);
    });
  }

  function runTranslator(){
    if(enabled) return;
    enabled = true;
    createObserver();
    try{ walkAndTranslate(document.body); }catch(e){}
    pending.add(document.body);
    scheduleProcess(false);
    try{ observer.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['title','placeholder','alt','aria-label','value'] }); }catch(e){}
  }

  function stopTranslator(restoreOriginals=true){
    if(!enabled) return;
    enabled = false;
    try{ if(observer) observer.disconnect(); }catch(e){}
    pending.clear();
    scheduled = false;
    navigationDetected = false;
    if(restoreOriginals) restoreAllOriginals();
  }

  // -------- 路由变化检测（SPA） --------
  function onRouteChangeImmediate(){
    if(!enabled) return;
    navigationDetected = true;
    try{ walkAndTranslate(document.body); }catch(e){}
    pending.add(document.body);
    scheduleProcess(true);
    setTimeout(()=>{ navigationDetected = false; }, 700);
  }

  function interceptHistory(){
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function(...args){
      const res = origPush.apply(this, args);
      try{ onRouteChangeImmediate(); }catch(e){}
      return res;
    };
    history.replaceState = function(...args){
      const res = origReplace.apply(this, args);
      try{ onRouteChangeImmediate(); }catch(e){}
      return res;
    };
    window.addEventListener('popstate', ()=>{ try{ onRouteChangeImmediate(); }catch(e){} }, {passive:true});
    window.addEventListener('hashchange', ()=>{ try{ onRouteChangeImmediate(); }catch(e){} }, {passive:true});
    document.addEventListener('click', (ev)=>{
      try{
        const a = ev.target && (ev.target.closest ? ev.target.closest('a') : null);
        if(a && a.href && a.origin === location.origin){
          setTimeout(()=>{ try{ onRouteChangeImmediate(); }catch(e){} }, 0);
        }
      }catch(e){}
    }, true);
  }

  // expose controls
  window.__AG_STUDIO_TRANSLATOR = {
    enable: function(cfg){
      if(cfg && cfg.mappingObj) { M = Object.assign({}, M, cfg.mappingObj); rebuildEntries(); }
      runTranslator();
      interceptHistory();
    },
    disable: function(restoreAll){
      stopTranslator(!!restoreAll);
    },
    rebuild: function(mapping){
      if(mapping){ M = Object.assign({}, M, mapping); rebuildEntries(); }
    },
    _debug: { LONG_TEXT_THRESHOLD }
  };
})();
