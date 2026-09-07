import sys

def wilder_rsi(closes, n=14):
    gains=[];losses=[]
    for i in range(1,len(closes)):
        d=closes[i]-closes[i-1]
        gains.append(max(d,0));losses.append(max(-d,0))
    ag=sum(gains[:n])/n; al=sum(losses[:n])/n
    for i in range(n,len(gains)):
        ag=(ag*(n-1)+gains[i])/n
        al=(al*(n-1)+losses[i])/n
    if al==0: return 100.0
    return 100-100/(1+ag/al)

def wilder_atr(bars,n=14):
    trs=[]
    for i in range(1,len(bars)):
        h,l,pc=bars[i][1],bars[i][2],bars[i-1][3]
        trs.append(max(h-l,abs(h-pc),abs(l-pc)))
    atr=sum(trs[:n])/n
    for i in range(n,len(trs)):
        atr=(atr*(n-1)+trs[i])/n
    return atr

def analyze(name, raw, spy_ret20=None):
    rows=[]
    for line in raw.strip().split("\n"):
        p=line.split(",")
        rows.append((p[0],float(p[1]),float(p[2]),float(p[3]),float(p[4]),float(p[5])))
    r=list(reversed(rows))
    closes=[x[4] for x in r]
    bars=[(x[1],x[2],x[3],x[4]) for x in r]
    vols=[x[5] for x in r]
    c=closes[-1]
    sma20=sum(closes[-20:])/20
    sma50=sum(closes[-50:])/50 if len(closes)>=50 else float('nan')
    rsi=wilder_rsi(closes)
    atr=wilder_atr(bars)
    avgvol20=sum(vols[-21:-1])/20
    ret20=(closes[-1]/closes[-21]-1)*100
    hi=max(x[2] for x in r); lo=min(x[3] for x in r)
    rs = f" RS_vs_SPY={ret20-spy_ret20:+.2f}pp" if spy_ret20 is not None else ""
    print(f"{name}: n={len(r)} close={c:.2f} SMA20={sma20:.2f}({(c/sma20-1)*100:+.2f}%) SMA50={sma50:.2f}({(c/sma50-1)*100:+.2f}%) RSI14={rsi:.1f} ATR14={atr:.2f}({atr/c*100:.2f}%) vol={vols[-1]:,.0f} avg20d={avgvol20:,.0f}({vols[-1]/avgvol20:.2f}x) ret20d={ret20:+.2f}%{rs} 50bH={hi:.2f} 50bL={lo:.2f} $vol={c*avgvol20/1e6:,.0f}M")
    return ret20
