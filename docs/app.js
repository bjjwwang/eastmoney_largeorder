// app.js

// 生成 secid，与 Python 脚本逻辑一致
function genSecid(code) {
  if (code.startsWith('000')) return `1.${code}`;
  if (code.startsWith('399')) return `0.${code}`;
  if (code.startsWith('6'))   return `1.${code}`;
  return `0.${code}`;
}

document.getElementById('fetchBtn').addEventListener('click', async () => {
  const code = document.getElementById('stockCode').value.trim();
  if (!/^\d{6}$/.test(code)) {
    alert('请输入有效的6位股票代码');
    return;
  }

  const secid = genSecid(code);

  // —— 1. 拉取当日行情并填充涨跌幅/振幅/换手率/流通市值 —— 
  try {
    // f3:涨跌幅(%×100)，f7:振幅(%×100)，f8:换手率(%×100)，f21:流通市值(元)
    const quoteUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f3,f7,f8,f21`;
    const quoteResp = await fetch(quoteUrl, {
      headers: {
        'Referer': 'http://quote.eastmoney.com',
        'User-Agent': 'Mozilla/5.0'
      },
      mode: 'cors'
    });
    if (!quoteResp.ok) throw new Error(`行情接口 HTTP ${quoteResp.status}`);
    const quoteJson = await quoteResp.json();
    const q = quoteJson.data || {};

    // 将百分比字段除以100，市值除以1e8得“亿元”
    document.getElementById('zdf').textContent  = ((q.f3  || 0) / 100).toFixed(2);
    document.getElementById('zf').textContent   = ((q.f7  || 0) / 100).toFixed(2);
    document.getElementById('hs').textContent   = ((q.f8  || 0) / 100).toFixed(2);
    document.getElementById('ltzj').textContent = ((q.f21 || 0) / 100000000).toFixed(2);
  } catch (e) {
    console.warn('行情接口失败，继续加载资金流向', e);
  }

  // —— 2. 拉取历史资金流向并渲染表格 —— 
  try {
    const url = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';
    const params = new URLSearchParams({
      lmt: '100000',
      klt: '101',
      secid,
      fields1: 'f1,f2,f3,f7',
      fields2: 'f51,f52,f53,f54,f55,f56'
    });
    const resp = await fetch(`${url}?${params}`, {
      headers: {
        'Referer': 'http://quote.eastmoney.com',
        'User-Agent': 'Mozilla/5.0'
      },
      mode: 'cors'
    });
    if (!resp.ok) throw new Error(`资金流接口 HTTP ${resp.status}`);
    const json = await resp.json();
    const klines = json.data?.klines;
    if (!klines) throw new Error('无资金流向数据返回');

    // 解析并倒序
    const rows = klines
      .map(line => {
        const [date, main, small, mid, large, superLarge] = line.split(',');
        return { date, vals: [main, small, mid, large, superLarge] };
      })
      .reverse();

    // 渲染表格
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    rows.forEach(({ date, vals }) => {
      const tr = document.createElement('tr');
      tr.insertCell().textContent = date;
      vals.forEach(v => {
        tr.insertCell().textContent = (parseFloat(v) / 10000).toFixed(2);
      });
      tbody.appendChild(tr);
    });
  } catch (e) {
    alert('资金流向查询失败：' + e.message);
    console.error(e);
  }
});
