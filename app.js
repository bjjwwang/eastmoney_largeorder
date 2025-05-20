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
    const url = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';
    const params = new URLSearchParams({
      lmt: '100000', klt: '101', secid,
      fields1: 'f1,f2,f3,f7',
      fields2: 'f51,f52,f53,f54,f55,f56'
    });
    
    try {
      const resp = await fetch(`${url}?${params}`, { 
        headers: { 'Referer': 'http://quote.eastmoney.com', 'User-Agent': 'Mozilla/5.0' },
        mode: 'cors' 
      });  // :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const klines = json.data?.klines;
      if (!klines) throw new Error('无数据返回');
      
      // 解析并转换
      const rows = klines.map(line => {
        const [date, main, small, mid, large, superLarge] = line.split(',');
        return { date, vals: [main, small, mid, large, superLarge] };
      });
      // 倒序排列（最新在上） :contentReference[oaicite:2]{index=2}
      rows.reverse();
      
      // 渲染表格
      const tbody = document.querySelector('#dataTable tbody');
      tbody.innerHTML = '';
      rows.forEach(({ date, vals }) => {
        const tr = document.createElement('tr');  // :contentReference[oaicite:3]{index=3}
        tr.insertCell().textContent = date;
        vals.forEach(v => {
          // 转万元并保留两位
          const num = (parseFloat(v) / 10000).toFixed(2);
          tr.insertCell().textContent = num;
        });
        tbody.appendChild(tr);  // :contentReference[oaicite:4]{index=4}
      });
    } catch (e) {
      alert('查询失败：' + e.message);
      console.error(e);
    }
  });
  