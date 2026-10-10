'use strict';
// ===== Игровые данные =====
const STAGES = [
  {name:'Бомж', emoji:'🧔', need:0, tap:1, c:['#3a2a4a','#5b3f2e','#1c1426'], scene:'🏚️ 🗑️ 🐈 📦 🌧️', quote:'Главное — начать. Даже с бутылки.'},
  {name:'Сборщик бутылок', emoji:'🍾', need:300, tap:2, c:['#2b5876','#4e4376','#1b1033'], scene:'🍾 🥫 🛒 🗑️ 🌆', quote:'Каждая бутылка — шаг к мечте!'},
  {name:'Дворник', emoji:'🧹', need:5e3, tap:5, c:['#11998e','#38ef7d','#0b3d3a'], scene:'🧹 🍂 🌳 🏘️ ☀️', quote:'Чистый двор — чистая карма.'},
  {name:'Курьер', emoji:'🛵', need:6e4, tap:15, c:['#f7971e','#ffd200','#6b3a00'], scene:'🛵 📦 🏙️ 🚦 🍕', quote:'Скорость — мой второй доход.'},
  {name:'Продавец шаурмы', emoji:'🌯', need:8e5, tap:50, c:['#ff512f','#dd2476','#4a0b1f'], scene:'🌯 🔥 🥙 🧅 🌃', quote:'Шаурма — это искусство.'},
  {name:'Владелец ларька', emoji:'🏪', need:1.2e7, tap:200, c:['#00c6ff','#0072ff','#06204d'], scene:'🏪 🥤 🍫 🚬 🌇', quote:'Свой бизнес! Пусть маленький.'},
  {name:'Сеть кафе', emoji:'☕', need:2.5e8, tap:1e3, c:['#8e2de2','#ff6a88','#2a0845'], scene:'☕ 🍰 🥐 🏙️ ✨', quote:'Одна точка — хорошо, сто — лучше.'},
  {name:'Бизнесмен', emoji:'💼', need:6e9, tap:5e3, c:['#0f2027','#2c5364','#00d2ff'], scene:'💼 🏢 📈 🚘 🌃', quote:'Время — деньги. Мои — дорогие.'},
  {name:'Олигарх', emoji:'🛥️', need:2e11, tap:2.5e4, c:['#b8860b','#ffd700','#3d2b00'], scene:'🛥️ 🏰 🍾 🚁 🌊', quote:'Яхта? Которая из?'},
  {name:'Миллиардер', emoji:'👑', need:1e13, tap:1.5e5, c:['#f953c6','#b91d73','#ffd700'], scene:'👑 🏝️ ✈️ 💎 🚀', quote:'Мир — моя площадка.'},
];

// [id, name, emoji, baseCost, baseRev per cycle, cycle seconds]
const BUSINESSES = [
  ['kiosk','Ларёк с семечками','🌻',50,3,1.5],
  ['wash','Автомойка','🚿',600,30,3],
  ['shawa','Шаурмичная','🌯',7e3,250,6],
  ['cafe','Кафе','☕',8e4,2e3,12],
  ['shop','Магазин','🛒',1e6,1.8e4,24],
  ['taxi','Такси-парк','🚕',1.4e7,1.6e5,48],
  ['mall','Торговый центр','🏬',2e8,1.5e6,96],
  ['plant','Завод','🏭',3e9,1.5e7,192],
  ['it','IT-компания','💻',5e10,1.5e8,384],
  ['bank','Банк','🏦',9e11,1.6e9,768],
  ['oil','Нефтяная вышка','🛢️',1.8e13,1.8e10,1536],
  ['space','Космическая корпорация','🚀',4e14,2e11,3072],
].map(([id,name,emoji,cost,rev,time])=>({id,name,emoji,cost,rev,time,mgrCost:cost*40}));
const BIZ_GROWTH = 1.12;
const MILESTONES = [10,25,50,100,150,200,300,400,500];

// Улучшения: type tap (mult), auto (taps/s), global (mult), crit (chance), ipsTap (% of ips per tap), golden (freq)
const UPGRADES = [
  {id:'t1',type:'tap',v:2,cost:100,name:'Крепкие руки',emoji:'💪',desc:'Сила тапа x2'},
  {id:'a1',type:'auto',v:1,cost:250,name:'Друг-бомж',emoji:'🧑‍🦳',desc:'+1 авто-тап в секунду'},
  {id:'t2',type:'tap',v:2,cost:1500,name:'Рабочие перчатки',emoji:'🧤',desc:'Сила тапа x2'},
  {id:'c1',type:'crit',v:0.05,cost:5e3,name:'Счастливая монетка',emoji:'🍀',desc:'Шанс крита +5% (крит x10)'},
  {id:'a2',type:'auto',v:4,cost:2e4,name:'Бригада',emoji:'👷',desc:'+4 авто-тапа в секунду'},
  {id:'t3',type:'tap',v:3,cost:5e4,name:'Тележка',emoji:'🛒',desc:'Сила тапа x3'},
  {id:'p1',type:'ipsTap',v:0.02,cost:1.5e5,name:'Харизма',emoji:'😎',desc:'Тап даёт +2% от дохода в секунду'},
  {id:'g1',type:'global',v:2,cost:1e6,name:'Бизнес-курсы',emoji:'📚',desc:'Весь доход бизнесов x2'},
  {id:'t4',type:'tap',v:3,cost:3e6,name:'Велосипед',emoji:'🚲',desc:'Сила тапа x3'},
  {id:'gb',type:'golden',v:1,cost:8e6,name:'Нюх на удачу',emoji:'👃',desc:'Золотые бутылки появляются чаще'},
  {id:'a3',type:'auto',v:20,cost:5e7,name:'Роботы-помощники',emoji:'🤖',desc:'+20 авто-тапов в секунду'},
  {id:'g2',type:'global',v:3,cost:1e8,name:'MBA',emoji:'🎓',desc:'Весь доход бизнесов x3'},
  {id:'c2',type:'crit',v:0.05,cost:5e8,name:'Подкова',emoji:'🧲',desc:'Шанс крита +5%'},
  {id:'p2',type:'ipsTap',v:0.05,cost:2e9,name:'Связи в верхах',emoji:'🤝',desc:'Тап даёт ещё +5% от дохода в секунду'},
  {id:'t5',type:'tap',v:5,cost:1e10,name:'Личный водитель',emoji:'🚘',desc:'Сила тапа x5'},
  {id:'g3',type:'global',v:2,cost:5e10,name:'Офшоры',emoji:'🏝️',desc:'Весь доход бизнесов x2'},
  {id:'g4',type:'global',v:3,cost:2e12,name:'Лоббисты',emoji:'🏛️',desc:'Весь доход бизнесов x3'},
  {id:'t6',type:'tap',v:10,cost:5e12,name:'Золотой палец',emoji:'👆',desc:'Сила тапа x10'},
  {id:'g5',type:'global',v:5,cost:1e14,name:'Искусственный интеллект',emoji:'🧠',desc:'Весь доход бизнесов x5'},
  {id:'g6',type:'global',v:10,cost:5e15,name:'Колонизация Марса',emoji:'🪐',desc:'Весь доход бизнесов x10'},
];

const LIFE = [
  {cat:'home',id:'h0',name:'Коробка',emoji:'📦',cost:0,bonus:0},
  {cat:'home',id:'h1',name:'Подвал',emoji:'🕳️',cost:2e3,bonus:5},
  {cat:'home',id:'h2',name:'Комната в общаге',emoji:'🛏️',cost:5e4,bonus:10},
  {cat:'home',id:'h3',name:'Квартира',emoji:'🏢',cost:2e6,bonus:20},
  {cat:'home',id:'h4',name:'Загородный дом',emoji:'🏡',cost:1e8,bonus:35},
  {cat:'home',id:'h5',name:'Вилла',emoji:'🏰',cost:1e10,bonus:60},
  {cat:'home',id:'h6',name:'Собственный остров',emoji:'🏝️',cost:2e12,bonus:100},
  {cat:'car',id:'v0',name:'Ноги',emoji:'🦶',cost:0,bonus:0},
  {cat:'car',id:'v1',name:'Самокат',emoji:'🛴',cost:500,bonus:3},
  {cat:'car',id:'v2',name:'Жигули',emoji:'🚗',cost:3e4,bonus:8},
  {cat:'car',id:'v3',name:'Солярис',emoji:'🚙',cost:1e6,bonus:15},
  {cat:'car',id:'v4',name:'BMW M5',emoji:'🏎️',cost:8e7,bonus:30},
  {cat:'car',id:'v5',name:'Lamborghini',emoji:'🦄',cost:5e9,bonus:50},
  {cat:'car',id:'v6',name:'Яхта',emoji:'🛥️',cost:5e11,bonus:80},
  {cat:'car',id:'v7',name:'Частный самолёт',emoji:'✈️',cost:5e13,bonus:120},
  {cat:'wear',id:'w0',name:'Обноски',emoji:'🧦',cost:0,bonus:0},
  {cat:'wear',id:'w1',name:'Спортивка «Адидас»',emoji:'👟',cost:1e3,bonus:4},
  {cat:'wear',id:'w2',name:'Джинсы и кожанка',emoji:'🧥',cost:2e4,bonus:8},
  {cat:'wear',id:'w3',name:'Деловой костюм',emoji:'👔',cost:1e6,bonus:15},
  {cat:'wear',id:'w4',name:'Брендовый костюм',emoji:'🕴️',cost:5e7,bonus:25},
  {cat:'wear',id:'w5',name:'Бриллиантовые запонки',emoji:'💎',cost:3e9,bonus:40},
  {cat:'wear',id:'w6',name:'Золотые часы',emoji:'⌚',cost:3e11,bonus:60},
];
const LIFE_CATS = [['home','🏠 Жильё'],['car','🚗 Транспорт'],['wear','👔 Стиль']];

const STOCKS = [
  {id:'shaw',name:'Шаурма Инк',emoji:'🌯',p:50,vol:0.04},
  {id:'apple',name:'ЯБлоко',emoji:'🍎',p:300,vol:0.03},
  {id:'gas',name:'НефтьГаз',emoji:'🛢️',p:1200,vol:0.025},
  {id:'space',name:'КосмоРу',emoji:'🚀',p:5000,vol:0.05},
  {id:'coin',name:'БомжКоин',emoji:'🪙',p:10,vol:0.12},
];

const SLOT_SYMS = ['🍒','🍋','🔔','🍾','💰','💎','7️⃣'];

// Достижения: [id, emoji, name, desc, check(S)]
const ACHIEVEMENTS = [
  ['tap1','👆','Первый шаг','Сделай первый тап',S=>S.taps>=1],
  ['tap100','✋','Трудяга','100 тапов',S=>S.taps>=100],
  ['tap1k','🦾','Железная рука','1 000 тапов',S=>S.taps>=1000],
  ['tap10k','⚡','Тап-машина','10 000 тапов',S=>S.taps>=1e4],
  ['e1k','💵','Первая тысяча','Заработай 1K ₽',S=>S.lifetime>=1e3],
  ['e1m','💰','Миллионер','Заработай 1M ₽',S=>S.lifetime>=1e6],
  ['e1b','🤑','Миллиардер','Заработай 1B ₽',S=>S.lifetime>=1e9],
  ['e1t','🌍','Триллионер','Заработай 1T ₽',S=>S.lifetime>=1e12],
  ['biz1','🏪','Предприниматель','Купи первый бизнес',S=>Object.values(S.biz).some(b=>b.lvl>0)],
  ['biz100','🏗️','Магнат','100 уровней бизнесов в сумме',S=>Object.values(S.biz).reduce((a,b)=>a+b.lvl,0)>=100],
  ['mgr1','🧑‍💼','Начальник','Найми первого менеджера',S=>Object.values(S.biz).some(b=>b.mgr)],
  ['mgrAll','🏢','Корпорация','Найми всех менеджеров',S=>BUSINESSES.every(b=>S.biz[b.id]&&S.biz[b.id].mgr)],
  ['st3','🛵','В движении','Стань курьером',S=>S.stage>=3],
  ['st6','☕','Сетевик','Открой сеть кафе',S=>S.stage>=6],
  ['st9','👑','Король жизни','Стань миллиардером',S=>S.stage>=9],
  ['island','🏝️','Робинзон-люкс','Купи свой остров',S=>!!S.life.h6],
  ['jackpot','🎰','Джекпот!','Выбей три семёрки',S=>S.stats.jackpots>=1],
  ['cups','🥤','Глаз-алмаз','Выиграй в напёрстки',S=>S.stats.cupWins>=1],
  ['stock','📈','Волк с Уолл-стрит','Заработай на бирже',S=>S.stats.stockProfit>0],
  ['gold10','🍾','Золотоискатель','Поймай 10 золотых бутылок',S=>S.stats.golden>=10],
  ['combo','🔥','Комбо-мастер','Набери комбо x50',S=>S.stats.maxCombo>=50],
  ['daily7','📅','Постоянство','7 дней подряд ежедневный бонус',S=>S.daily.streak>=7],
  ['prest','♻️','Новая жизнь','Начни заново с опытом',S=>S.rebirths>=1],
  ['honest','😇','Честный человек','Верни найденный кошелёк',S=>S.stats.honest>=1],
];
