const API_KEY = "your_api";
const API_URL = `https://apis.tianapi.com/lunar/index?key=${API_KEY}`;

export default {
  async fetch(request, env) {
    if (!env.time2) {
      return new Response("KV Namespace 'time2' is not defined", { status: 500 });
    }

    try {
      function getBeijingDateInfo() {
        const now = new Date();
        const beijingOffset = 8 * 60 * 60 * 1000;
        const beijingTime = new Date(now.getTime() + beijingOffset);
        const endOfDay = new Date(beijingTime);
        endOfDay.setUTCHours(15, 59, 59, 999); // 北京时间23:59:59
        return {
          dateString: beijingTime.toISOString().split("T")[0],
          expirationTimestamp: Math.floor(endOfDay.getTime() / 1000)
        };
      }

      const { dateString, expirationTimestamp } = getBeijingDateInfo();
      const kvKey = "lunar_data_today";

      let cachedData = await env.time2.get(kvKey, { type: "json" });

      if (!cachedData) {
        console.log(`🔄 KV 无 ${dateString} 的数据，尝试获取 API...`);
        const apiResponse = await fetch(API_URL);
        if (!apiResponse.ok) {
          return new Response(`API 请求失败，状态码: ${apiResponse.status}`, { status: 500 });
        }
        const data = await apiResponse.json();
        console.log("API 返回数据:", JSON.stringify(data));
        if (!data || data.code !== 200) {
          return new Response(`API 响应错误: ${JSON.stringify(data)}`, { status: 500 });
        }

        await env.time2.put(kvKey, JSON.stringify(data.result), { expiration: expirationTimestamp });
        console.log(`✅ 数据已存入 KV（有效期至北京时间 ${new Date(expirationTimestamp * 1000).toLocaleString("zh-CN")}）`);
        cachedData = data.result;
      } else {
        console.log(`📌 读取 KV 缓存成功: ${dateString}`);
      }

      const acceptHeader = request.headers.get("Accept");
      if (acceptHeader && acceptHeader.includes("application/json")) {
        return new Response(JSON.stringify(cachedData), {
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        });
      }

      return new Response(
        `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>不想上班</title>
  <style>
    body {
      background-color: black;
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    #time { font-size: 6em; opacity: 1; }
    #yearEndCountdown { font-size: 2em; opacity: 0.9; } /* 年末倒计时 90% 透明度 */
    #countdown { font-size: 2em; opacity: 0.95; }
    #lunar { 
      font-size: 1.5em; 
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    #lunar .lunar-item { opacity: 0.85; }
    #lunar .shengxiao { opacity: 0.8; }
    #toggleButton {
      background: none;
      border: none;
      color: grey;
      font-size: 0.8em;
      cursor: pointer;
      margin-top: 10px;
    }
    #toggleButton:hover { color: white; }
  </style>
  <script>
    function toggleCountdown() {
      const countdownDiv = document.getElementById('countdown');
      const button = document.getElementById('toggleButton');
      if (countdownDiv.style.display === 'none') {
        countdownDiv.style.display = 'block';
        button.innerText = '隐藏倒计时';
      } else {
        countdownDiv.style.display = 'none';
        button.innerText = '显示倒计时';
      }
    }

    function updateTime() {
      const now = new Date();
      const beijingTime = now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
      document.getElementById('time').innerText = beijingTime;
      
      const day = now.getDay();
      const holidays = ["01-01", "05-01", "10-01", "10-02", "10-03"];
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const date = String(now.getDate()).padStart(2, "0");
      const today = month + "-" + date;
      
      if (day === 0 || day === 6 || holidays.includes(today)) {
        document.getElementById('countdown').innerText = "今天是休息日，开心玩耍！";
      } else {
        const openingTime = new Date();
        openingTime.setHours(9, 0, 0, 0);
        const closingTime = new Date();
        closingTime.setHours(18, 0, 0, 0);
        
        if (now < openingTime) {
          const diffToStart = openingTime - now;
          const hoursLeft = Math.floor(diffToStart / (1000 * 60 * 60));
          const minutesLeft = Math.floor((diffToStart % (1000 * 60 * 60)) / (1000 * 60));
          document.getElementById('countdown').innerText = \`还有\${hoursLeft}小时\${minutesLeft}分钟才上班！\`;
        } else if (now < closingTime) {
          const diffToEnd = closingTime - now;
          const hoursLeft = Math.floor(diffToEnd / (1000 * 60 * 60));
          const minutesLeft = Math.floor((diffToEnd % (1000 * 60 * 60)) / (1000 * 60));
          document.getElementById('countdown').innerText = \`还有\${hoursLeft}小时\${minutesLeft}分钟就下班了！\`;
        } else {
          document.getElementById('countdown').innerText = "已经下班啦！";
        }
      }

      // 计算本年剩余天数
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // 本年12月31日23:59:59
      const diffTime = yearEnd - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      document.getElementById('yearEndCountdown').innerText = 
        diffDays > 0 ? \`本年还剩 \${diffDays} 天\` : "今天是本年最后一天！";
    }

    fetch(window.location.href, { headers: { "Accept": "application/json" } })
      .then(response => response.json())
      .then(data => {
        const lunarDiv = document.getElementById('lunar');
        lunarDiv.innerHTML = '';
        
        const lunarItems = [
          { text: \`📅 农历：\${data.lubarmonth || '未知'}\${data.lunarday || '未知'}\`, class: 'lunar-item' },
          data.lunar_festival ? { text: \`农历节日：\${data.lunar_festival}\`, class: 'lunar-item' } : null,
          data.festival ? { text: \`节日：\${data.festival}\`, class: 'lunar-item' } : null,
          data.jieqi ? { text: \`🔆 节气：\${data.jieqi}\`, class: 'lunar-item' } : null,
          data.fitness ? { text: \`✅ 宜：\${data.fitness}\`, class: 'lunar-item' } : null,
          data.taboo ? { text: \`❌ 忌：\${data.taboo}\`, class: 'lunar-item' } : null,
          data.shengxiao ? { text: \`🐾 生肖：\${data.shengxiao}\`, class: 'lunar-item shengxiao' } : null
        ].filter(Boolean);

        lunarItems.forEach(item => {
          const div = document.createElement('div');
          div.textContent = item.text;
          div.className = item.class;
          lunarDiv.appendChild(div);
        });
      })
      .catch(error => console.error('Error fetching lunar data:', error));

    window.onload = function () {
      updateTime();
      setInterval(updateTime, 1000);
    };
  </script>
</head>
<body>
  <div id="time"></div>
  <div id="yearEndCountdown"></div> <!-- 本年剩余天数 -->
  <div id="countdown"></div>
  <div id="lunar"></div>
  <button id="toggleButton" onclick="toggleCountdown()">隐藏倒计时</button>
</body>
</html>`,
        { headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    } catch (error) {
      return new Response("API 请求错误: " + error.message, { status: 500 });
    }
  }
};
