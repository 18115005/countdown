# 下班倒计时
## 基于 Cloudflare Worker 的服务，用于实现一个显示北京时间、倒计时和农历信息的网页。
### 1.实时显示北京时间
### 2.工作日倒计时
#### 根据当前时间计算距离上班（9:00）或下班（18:00）的时间：
#### 如果是周末（周六、周日）或特定节假日（元旦、劳动节、国庆节），显示“今天是休息日，开心玩耍！”。
#### 如果在上班前，显示距离上班剩余的小时和分钟。
#### 如果在工作时间内，显示距离下班剩余的小时和分钟。
#### 如果已下班，显示“已经下班啦！”。
#### 提供“隐藏倒计时”按钮，可切换倒计时的显示/隐藏状态。
### 3.农历信息展示
## 修改上下班时间
#### const openingTime = new Date();
#### openingTime.setHours(8, 30, 0, 0); // 上班时间改为 8:30
#### const closingTime = new Date();
#### closingTime.setHours(17, 30, 0, 0); // 下班时间改为 17:30
