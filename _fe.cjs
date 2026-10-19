const fs=require('fs');const P='gen_cards.js';let t=fs.readFileSync(P,'utf8');
if(t.includes("'Flat Earthers': {")){console.log('ya');process.exit(0);}
const i=t.indexOf('\n  },',t.indexOf("'Phone Company': {"));
if(i<0)throw new Error('no');
const b=['  },',"  'Flat Earthers': {","    kind: 'group_action',","    act: 'places_roll_draw',","    t: 'Flat Earthers For their action, you may roll 2 dice. If your roll is equal to or less than the number of Places you control, the Flat Earthers weird alternate geology has led them to a gold strike, and you may draw as many Plot cards as the number you rolled.'",'  }'].join('\n');
t=t.slice(0,i)+'\n'+b+t.slice(i+'\n  },'.length);
fs.writeFileSync(P,t);console.log('ok');
